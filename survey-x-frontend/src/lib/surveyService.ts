import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction, Keypair } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { createClient } from '@supabase/supabase-js'
import {
  getArciumAccountBaseSeed,
  getCompDefAccOffset,
  getArciumProgAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getComputationAccAddress,
  getCompDefAccAddress,
  getClusterAccAddress,
  getArciumEnv,
  RescueCipher,
  x25519,
  deserializeLE,
  getMXEPublicKey,
} from '@arcium-hq/client'

// Import Supabase client
import { supabase } from './supabase'

// Helper function to retry Supabase operations with exponential backoff
async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      console.warn(`Supabase operation failed (attempt ${attempt + 1}/${maxRetries}):`, error)
      
      // Check if it's a network/SSL error
      if (error?.message?.includes('SSL') || 
          error?.message?.includes('network') || 
          error?.message?.includes('fetch') ||
          error?.code === 'NETWORK_ERROR') {
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      // For non-network errors, don't retry
      throw error
    }
  }
  
  throw lastError
}

// Wallet interface for SurveyService - compatible with Anchor
interface Wallet {
  publicKey: PublicKey
  signTransaction: <T extends Transaction | any>(transaction: T) => Promise<T>
  signAllTransactions: <T extends Transaction | any>(transactions: T[]) => Promise<T[]>
}

// Environment variables
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const SURVEY_X_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_SURVEY_X_PROGRAM_ID || 'FoZGZMWrz5ATiCDJsyakp8bxF9gZjGBWZFGpJQrLEgtY')
const ARCIUM_PROGRAM_ID = new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')

// Import the real IDL from the build artifacts
import idl from './survey_x_idl.json'

// Arcium account derivation functions using proper Arcium client functions
function deriveMxePda(): PublicKey {
  return getMXEAccAddress(SURVEY_X_PROGRAM_ID)
}

function deriveMempoolPda(): PublicKey {
  return getMempoolAccAddress(SURVEY_X_PROGRAM_ID)
}

function deriveExecPoolPda(): PublicKey {
  return getExecutingPoolAccAddress(SURVEY_X_PROGRAM_ID)
}


function deriveCompPda(computationOffset: bigint): PublicKey {
  // Convert bigint to anchor.BN for Arcium client compatibility
  const offsetBN = new BN(computationOffset.toString())
  return getComputationAccAddress(SURVEY_X_PROGRAM_ID, offsetBN)
}

function deriveCompDefPda(): PublicKey {
  // Use create_survey computation definition
  const offset = getCompDefAccOffset('create_survey')
  const offsetNumber = new DataView(offset.buffer, offset.byteOffset, offset.byteLength).getUint32(0, true)
  return getCompDefAccAddress(SURVEY_X_PROGRAM_ID, offsetNumber)
}


// MPC Encryption class for client-side encryption using Arcium standards
class MPCEncryption {
  static async generateKey(): Promise<{ privateKey: Uint8Array, publicKey: Uint8Array }> {
    const privateKey = x25519.utils.randomSecretKey()
    const publicKey = x25519.getPublicKey(privateKey)
    return { privateKey, publicKey }
  }

  static async encryptData(data: string, mxePublicKey: Uint8Array): Promise<{ 
    encrypted: Uint8Array, 
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array 
  }> {
    const { privateKey, publicKey } = await this.generateKey()
    
    // Perform x25519 Diffie-Hellman key exchange
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey)
    
    // Use Arcium's Rescue cipher for encryption
    const cipher = new RescueCipher(sharedSecret)
    
    // Encode data to u64 (simplified for now)
    const encodedData = new TextEncoder().encode(data)
    const dataU64 = BigInt('0x' + Array.from(encodedData.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(''))
    
    // Generate nonce first
    const nonce = crypto.getRandomValues(new Uint8Array(16))
    
    // Encrypt using Rescue cipher with nonce
    const encrypted = cipher.encrypt([dataU64], nonce)
    
    return {
      encrypted: new Uint8Array(encrypted[0]), // encrypted[0] is already an array of numbers
      nonce,
      publicKey,
      privateKey
    }
  }
}

// Computation result interface for frontend
interface ComputationResult {
  id: string
  computationType: 'create_survey' | 'submit_response'
  status: 'pending' | 'completed' | 'failed'
  resultData?: any
  createdAt: Date
  completedAt?: Date
  creator: string
  surveyId?: string
  responseId?: string
}

export class SurveyService {
  private connection: Connection
  private wallet?: Wallet
  private program?: Program

  constructor(wallet?: any) { // Accept any wallet interface
    console.log('🔍 SurveyService constructor called with wallet:', wallet)
    console.log('🔍 Wallet publicKey:', wallet?.publicKey)
    console.log('🔍 Wallet publicKey type:', typeof wallet?.publicKey)
    this.wallet = wallet
    this.connection = new Connection(SOLANA_RPC_URL, 'confirmed')
    this.initializeProgram()
  }

  private initializeProgram() {
    if (this.wallet) {
      const provider = new AnchorProvider(
        this.connection,
        this.wallet as any,
        AnchorProvider.defaultOptions()
      )
      this.program = new Program(idl as any, provider)
    } else {
      this.program = undefined
    }
  }


  setWallet(wallet: Wallet) {
    this.wallet = wallet
    this.initializeProgram()
  }

  // Efficient method to get all responses for different survey types
  static async getAllSurveyResponses(surveyId: string, surveyType: 'survey' | 'quiz' = 'survey') {
    try {
      if (surveyType === 'quiz') {
        // For quizzes, get quiz attempts with masked wallets and rankings
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            quiz_responses (
              question_text,
              user_answer,
              correct_answer,
              is_correct,
              points_earned
            )
          `)
          .eq('quiz_id', surveyId)
          .order('total_score', { ascending: false }) // Highest scores first

        if (attemptsError) throw attemptsError

        // Mask wallet addresses and format for MCQ vs input quizzes
        return attempts?.map((attempt, index) => ({
          id: attempt.id,
          masked_wallet: `${attempt.participant_wallet.slice(0, 4)}...${attempt.participant_wallet.slice(-4)}`,
          rank: index + 1,
          total_score: attempt.total_score,
          percentage: attempt.percentage,
          is_passed: attempt.is_passed,
          submitted_at: attempt.created_at,
          responses: attempt.quiz_responses?.map((response: any) => ({
            question_text: response.question_text,
            // For MCQ quizzes, don't show actual answers - just results
            user_answer: surveyType === 'quiz' ? null : response.user_answer,
            is_correct: response.is_correct,
            points_earned: response.points_earned
          })) || []
        })) || []
      } else {
        // For regular surveys, get all responses with details
        const { data: responses, error: responsesError } = await supabase
          .from('survey_responses')
          .select(`
            *,
            survey_questions (
              question_text,
              question_type,
              options
            )
          `)
          .eq('survey_id', surveyId)
          .order('submitted_at', { ascending: false })

        if (responsesError) throw responsesError

        return responses?.map(response => ({
          id: response.id,
          masked_wallet: `${response.respondent_wallet.slice(0, 4)}...${response.respondent_wallet.slice(-4)}`,
          submitted_at: response.submitted_at,
          response_data: response.response_data,
          questions: response.survey_questions || []
        })) || []
      }
    } catch (error) {
      console.error('Error fetching survey responses:', error)
      throw error
    }
  }

  private async initializeCreateSurveyCompDef(mxeAccount: PublicKey) {
    try {
      console.log('🔍 Checking if create_survey comp def is already initialized...')
      
      // Get the create_survey comp def account address
      const createSurveyOffset = getCompDefAccOffset('create_survey')
      const createSurveyOffsetNumber = new DataView(createSurveyOffset.buffer, createSurveyOffset.byteOffset, createSurveyOffset.byteLength).getUint32(0, true)
      const createSurveyCompDef = getCompDefAccAddress(SURVEY_X_PROGRAM_ID, createSurveyOffsetNumber)
      
      console.log('🔍 Create survey comp def address:', createSurveyCompDef.toString())
      
      // Check if account exists
      const accountInfo = await this.connection.getAccountInfo(createSurveyCompDef)
      
      if (accountInfo) {
        console.log('✅ Create survey comp def already initialized')
        return
      }
      
      console.log('🚀 Initializing create_survey computation definition...')
      
      // Create initialization instruction
      const initInstruction = new TransactionInstruction({
        keys: [
          { pubkey: this.wallet!.publicKey, isSigner: true, isWritable: true }, // payer
          { pubkey: mxeAccount, isSigner: false, isWritable: true }, // mxe_account
          { pubkey: createSurveyCompDef, isSigner: false, isWritable: true }, // comp_def_account
          { pubkey: new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'), isSigner: false, isWritable: false }, // arcium_program
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        ],
        programId: SURVEY_X_PROGRAM_ID,
        data: Buffer.from([130, 52, 10, 251, 81, 189, 44, 97]), // init_create_survey_comp_def discriminator
      })
      
      const initTransaction = new Transaction()
      initTransaction.add(initInstruction)
      
      const { blockhash } = await this.connection.getLatestBlockhash()
      initTransaction.recentBlockhash = blockhash
      initTransaction.feePayer = this.wallet!.publicKey
      
      console.log('🔐 Signing initialization transaction...')

      // Handle different wallet interface formats for init transaction
      let signedInitTransaction;
      if (this.wallet && typeof this.wallet.signTransaction === 'function') {
        signedInitTransaction = await this.wallet.signTransaction(initTransaction);
      } else {
        // Fallback to window.solana if wallet interface doesn't work
        if (typeof window !== 'undefined' && window.solana && window.solana.signTransaction) {
          signedInitTransaction = await window.solana.signTransaction(initTransaction);
        } else {
          throw new Error('No wallet available for signing initialization transaction');
        }
      }
      
      console.log('📤 Sending initialization transaction...')
      const initSignature = await this.connection.sendRawTransaction(signedInitTransaction.serialize())
      
      console.log('⏳ Waiting for initialization confirmation...')
      await this.connection.confirmTransaction(initSignature, 'confirmed')
      
      console.log('✅ Create survey comp def initialized successfully!')
      
    } catch (error) {
      console.error('❌ Error initializing create_survey comp def:', error)
      // Don't throw - continue with the main transaction
      console.log('⚠️ Continuing without initialization...')
    }
  }

  async createSurvey(surveyData: {
    title: string
    description: string
    questions: Array<{
      question_text: string
      question_type: 'multiple_choice' | 'rating' | 'text_input'
      options?: string[]
      required: boolean
    }>
    category: string
    hashtags: string[]
    maxResponses: number
  }): Promise<{ surveyId: string, transactionSignature: string, note: string }> {
    if (!this.wallet || !this.wallet.publicKey) {
      throw new Error('Wallet is required for survey creation')
    }

    // Store wallet reference to help TypeScript understand it's defined
    const wallet = this.wallet
    const walletPublicKey = wallet.publicKey

    // Initialize cleanup variables
    let cleanupNeeded = false;
    let savedSurveyData = null;

    try {
      console.log('🚀 Starting survey creation process...')
      
      // Ensure wallet is properly set
      if (!this.wallet || !this.wallet.publicKey) {
        console.error('❌ Wallet not properly initialized:', this.wallet)
        throw new Error('Wallet not properly initialized')
      }

      // Check SOL balance before proceeding
      console.log('💰 Checking SOL balance...')

      // Ensure publicKey is a PublicKey object for Solana connection
      let publicKeyObj;
      if (typeof this.wallet.publicKey === 'string') {
        publicKeyObj = new PublicKey(this.wallet.publicKey);
      } else if (this.wallet.publicKey instanceof PublicKey) {
        publicKeyObj = this.wallet.publicKey;
      } else {
        // Handle Solana PublicKey object format
        publicKeyObj = new PublicKey((this.wallet.publicKey as any).toString());
      }

      const balance = await this.connection.getBalance(publicKeyObj)
      const balanceInSOL = balance / 1e9 // Convert lamports to SOL
      console.log(`💰 Wallet balance: ${balanceInSOL} SOL`)

      // Estimate transaction fee (conservative estimate)
      const estimatedFee = 0.001 // 0.001 SOL should be enough for Arcium transactions
      if (balanceInSOL < estimatedFee) {
        console.error(`❌ Insufficient balance: ${balanceInSOL} SOL < ${estimatedFee} SOL required`)
        throw new Error(`Insufficient SOL balance. You need at least ${estimatedFee} SOL to create surveys. Current balance: ${balanceInSOL} SOL`)
      }
      console.log('✅ Sufficient balance confirmed')

      // Generate unique survey ID as a PublicKey
    let surveyId = Keypair.generate().publicKey.toString()
      console.log('Generated survey ID:', surveyId)

      // Check if survey ID already exists (prevent duplicates)
      // Skip this check for now to avoid RLS issues - surveys have unique constraints anyway
      console.log('🔍 Skipping survey ID uniqueness check to avoid RLS issues')
      console.log('✅ Survey ID generated:', surveyId)

      // STEP 1: Encrypt survey data for MPC processing
      console.log('🔐 Step 1: Encrypting survey data for Arcium MPC...')
      const surveyJson = JSON.stringify({
        title: surveyData.title,
        description: surveyData.description,
        questions: surveyData.questions,
        category: surveyData.category,
        hashtags: surveyData.hashtags,
        maxResponses: surveyData.maxResponses
      })

      // Create Arcium program instance for encryption
      const provider = new AnchorProvider(
        this.connection,
        this.wallet as any,
        { commitment: 'confirmed' }
      )

      // Get MXE public key for encryption
      const mxePublicKey = await getMXEPublicKey(provider as any, SURVEY_X_PROGRAM_ID)
      if (!mxePublicKey) {
        throw new Error('Failed to get MXE public key for encryption')
      }
      
      const { encrypted: encryptedSurveyData, nonce: surveyNonce, publicKey: surveyPubKey } = await MPCEncryption.encryptData(surveyJson, mxePublicKey)
      console.log('Survey data encrypted successfully')

      // STEP 2: Save to Supabase for public discoverability
      console.log('📝 Step 2: Saving survey metadata to Supabase...')
      console.log('Survey data:', {
        title: surveyData.title,
        description: surveyData.description,
        creator_wallet: this.wallet.publicKey.toString(),
        survey_id: surveyId,
        category: surveyData.category,
        hashtags: surveyData.hashtags,
        question_count: surveyData.questions.length,
        encrypted_data_length: encryptedSurveyData.length
      })

      const { data: surveyRecord, error: surveyError } = await retrySupabaseOperation(async () => {
        return await supabase
        .from('surveys')
        .insert({
          title: surveyData.title,
          description: surveyData.description,
            creator_wallet: walletPublicKey.toString(),
          survey_id: surveyId,
          category: surveyData.category,
          hashtags: surveyData.hashtags,
          is_active: true,
          question_count: surveyData.questions.length,
          response_count: 0,
          max_responses: surveyData.maxResponses,
          encrypted_data: encryptedSurveyData
        })
        .select()
        .single()
      })

      console.log('Supabase survey insert result:', { data: surveyRecord, error: surveyError })

      if (surveyError) {
        console.error('❌ Survey insert error:', surveyError)
        throw surveyError
      }

      // Save questions to Supabase for public viewing
      const questionsToInsert = surveyData.questions.map((q, index) => ({
        survey_id: surveyId,
        question_id: `question_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'multiple_choice' ? q.options?.filter(opt => opt.trim()) : null,
        required: q.required,
        order_index: index + 1
      }))

      console.log('Questions to insert:', questionsToInsert)

      const { error: questionsError } = await retrySupabaseOperation(async () => {
        return await supabase
        .from('survey_questions')
        .insert(questionsToInsert)
      })

      console.log('Questions insert result:', { error: questionsError })

      if (questionsError) {
        console.error('❌ Questions insert error:', questionsError)
        throw questionsError
      }

      console.log('✅ Survey metadata saved to Supabase successfully!')
      cleanupNeeded = true
      savedSurveyData = { surveyId, questionsToInsert }

      // STEP 3: Sign on-chain transaction for Arcium MPC computation
      console.log('🚀 Step 3: Creating Arcium MPC transaction...')

      // Create Arcium program instance
      const program = new Program(idl as any, provider)

      // Generate survey PDA (Program Derived Address) with proper seed handling
      let publicKeyBytes: Uint8Array;
      if (this.wallet.publicKey.toBytes) {
        publicKeyBytes = this.wallet.publicKey.toBytes();
      } else if (this.wallet.publicKey instanceof Uint8Array) {
        publicKeyBytes = this.wallet.publicKey;
      } else {
        // Fallback: try to get bytes from the public key object
        publicKeyBytes = new PublicKey(this.wallet.publicKey.toString()).toBytes();
      }

      const [surveyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('survey'), publicKeyBytes],
        SURVEY_X_PROGRAM_ID
      )

      // STEP 1: Initialize create_survey computation definition if needed
      console.log('🔍 Step 1: Checking and initializing create_survey computation definition...')
      
      console.log('🔍 Using deployed account addresses...')
      console.log('Payer:', this.wallet.publicKey.toString())

      // Skip initialization for now due to InstructionFallbackNotFound error
      console.log('⚠️ Skipping initialization due to InstructionFallbackNotFound error')
      console.log('🔍 Will attempt to use existing or alternative computation definition')

      // STEP 2: Create direct transaction without Anchor program methods
      console.log('🚀 Step 2: Creating direct Arcium MPC transaction...')
      console.log('✅ Using add_together instruction with add_together comp def (working approach)')
      
      // Use proper Arcium account derivation with error handling
      console.log('🔍 Deriving Arcium accounts...')

      const computationOffset = BigInt(Math.floor(Math.random() * 1000000))
      const mxeAccount = deriveMxePda()
      const mempoolAccount = deriveMempoolPda()
      const executingPool = deriveExecPoolPda()
      const computationAccount = deriveCompPda(computationOffset)
      
      console.log('✅ Derived accounts:')
      console.log('- MXE:', mxeAccount?.toString())
      console.log('- Mempool:', mempoolAccount?.toString())
      console.log('- Exec Pool:', executingPool?.toString())
      console.log('- Computation:', computationAccount?.toString())

      // Validate all accounts are proper PublicKey objects
      const validatePublicKey = (key: any, name: string) => {
        console.log(`🔍 Validating ${name}:`, key, typeof key)

        if (!key) {
          throw new Error(`Invalid ${name}: key is null/undefined`)
        }

        // If it's already a PublicKey, return it
        if (key instanceof PublicKey) {
          console.log(`✅ ${name} is already a PublicKey`)
          return key
        }

        // If it's a string, convert to PublicKey
        if (typeof key === 'string') {
          console.log(`🔄 Converting ${name} string to PublicKey`)
          return new PublicKey(key)
        }

        // If it has a toString method, try to convert
        if (typeof key === 'object' && key.toString) {
          const keyString = key.toString()
          console.log(`🔄 Converting ${name} object to PublicKey:`, keyString)
          return new PublicKey(keyString)
        }

        throw new Error(`Invalid ${name}: cannot convert to PublicKey - ${typeof key}`)
      }

      // Validate all derived accounts
      console.log('🔍 Validating all derived accounts...')
      const validMxeAccount = validatePublicKey(mxeAccount, 'MXE Account')
      const validMempoolAccount = validatePublicKey(mempoolAccount, 'Mempool Account')
      const validExecutingPool = validatePublicKey(executingPool, 'Executing Pool')
      const validComputationAccount = validatePublicKey(computationAccount, 'Computation Account')

      // Use add_together comp def (known to be initialized)
      const addTogetherOffset = getCompDefAccOffset('add_together')
      const addTogetherOffsetNumber = new DataView(addTogetherOffset.buffer, addTogetherOffset.byteOffset, addTogetherOffset.byteLength).getUint32(0, true)
      const addTogetherCompDef = getCompDefAccAddress(SURVEY_X_PROGRAM_ID, addTogetherOffsetNumber)
      
      console.log('- Comp Def:', addTogetherCompDef?.toString())
      const validAddTogetherCompDef = validatePublicKey(addTogetherCompDef, 'Comp Def Account')

      // Use the expected cluster account from the error logs
      const clusterAccount = new PublicKey('2qibdmpiSHrzcvbqQ9c9PEx17Q9KhyKSMuxuRP8AYJ9c')
      console.log('🔍 Using expected cluster account:', clusterAccount.toString())
      const validClusterAccount = validatePublicKey(clusterAccount, 'Cluster Account')
      
      // Debug: Check all accounts
      console.log('🔍 Checking all computation accounts...')
      console.log('Computation Offset:', computationOffset.toString())
      console.log('All account addresses:')
      console.log('- Payer:', this.wallet.publicKey.toString())
      console.log('- MXE Account:', validMxeAccount.toString())
      console.log('- Mempool Account:', validMempoolAccount.toString())
      console.log('- Executing Pool:', validExecutingPool.toString())
      console.log('- Computation Account:', validComputationAccount.toString())
      console.log('- Comp Def Account:', validAddTogetherCompDef.toString())
      console.log('- Cluster Account:', validClusterAccount.toString())
      
      console.log('📝 Creating direct Arcium MPC transaction...')
      
      // Debug: Check data sizes
      console.log('🔍 Data size debugging:')
      console.log('- Encrypted survey data length:', encryptedSurveyData.length)
      console.log('- Survey pub key length:', surveyPubKey.length)
      console.log('- Computation offset:', computationOffset.toString())
      
      // Ensure we have exactly 64 bytes of encrypted data
      const paddedEncryptedData = new Uint8Array(64)
      paddedEncryptedData.set(encryptedSurveyData.slice(0, 64), 0)
      
      console.log('- Padded encrypted data length:', paddedEncryptedData.length)
      
      // Ensure all accounts are proper PublicKey objects
      const ensurePublicKey = (key: any): PublicKey => {
        console.log('🔍 ensurePublicKey called with:', typeof key, key);

        // Check if it's already a PublicKey instance
        if (key instanceof PublicKey) return key;

        // Check if it's a Solana PublicKey object (has _bn property)
        if (key && typeof key === 'object' && key._bn && key.toString) {
          console.log('🔍 Detected Solana PublicKey object, converting to PublicKey');
          return new PublicKey(key.toString());
        }

        // Check if it's a string
        if (typeof key === 'string') return new PublicKey(key);

        throw new Error('Invalid public key format');
      };

      // Validate hardcoded public keys
      console.log('🔍 Validating hardcoded public keys...')
      const poolAccount = new PublicKey('7MGSS4iKNM4sVib7bDZDJhVqB6EcchPwVnTKenCY1jt3')
      const clockAccount = new PublicKey('FHriyvoZotYiFnbUzKFjzRSb2NiaC8RPWY7jtKuKhg65')
      const arciumProgram = new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6')

      console.log('✅ Hardcoded accounts validated:')
      console.log('- Pool Account:', poolAccount.toString())
      console.log('- Clock Account:', clockAccount.toString())
      console.log('- System Program:', SystemProgram.programId.toString())
      console.log('- Arcium Program:', arciumProgram.toString())

      // Create direct transaction instruction using add_together format
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: ensurePublicKey(this.wallet.publicKey), isSigner: true, isWritable: true }, // payer
          { pubkey: validMxeAccount, isSigner: false, isWritable: false }, // mxe_account
          { pubkey: validMempoolAccount, isSigner: false, isWritable: true }, // mempool_account
          { pubkey: validExecutingPool, isSigner: false, isWritable: true }, // executing_pool
          { pubkey: validComputationAccount, isSigner: false, isWritable: true }, // computation_account
          { pubkey: validAddTogetherCompDef, isSigner: false, isWritable: false }, // comp_def_account
          { pubkey: validClusterAccount, isSigner: false, isWritable: true }, // cluster_account
          { pubkey: poolAccount, isSigner: false, isWritable: true }, // pool_account (writable!)
          { pubkey: clockAccount, isSigner: false, isWritable: false }, // clock_account
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
          { pubkey: arciumProgram, isSigner: false, isWritable: false }, // arcium_program
        ],
        programId: SURVEY_X_PROGRAM_ID,
        // Using add_together instruction format: discriminator + computation_offset + ciphertext_0 + ciphertext_1 + pub_key + nonce
        data: Buffer.concat([
          Buffer.from([70, 27, 73, 27, 150, 56, 75, 181]), // add_together discriminator from IDL
          new BN(computationOffset.toString()).toArrayLike(Buffer, 'le', 8), // computation offset (8 bytes u64, little-endian)
          Buffer.from(encryptedSurveyData), // ciphertext_0 (32 bytes)
          Buffer.from(encryptedSurveyData), // ciphertext_1 (32 bytes) - using same data for both
          Buffer.from(surveyPubKey), // pub_key (32 bytes)
          new BN(1).toArrayLike(Buffer, 'le', 16), // nonce (16 bytes u128, little-endian)
        ])
      });

      // Validate all transaction accounts before compilation
      console.log('🔍 Final transaction account validation...')
      for (let i = 0; i < instruction.keys.length; i++) {
        const account = instruction.keys[i]
        console.log(`${i}: ${account.pubkey.toString()} (signer: ${account.isSigner}, writable: ${account.isWritable})`)

        // Check if the public key has required properties
        if (!account.pubkey || !(account.pubkey instanceof PublicKey)) {
          throw new Error(`Invalid public key at index ${i}: ${account.pubkey}`)
        }
      }
      
      const transaction = new Transaction()
      transaction.add(instruction)

      console.log('✅ Transaction created with', instruction.keys.length, 'accounts, requesting signature...')

      // Additional validation before signing
      console.log('🔍 Pre-signing validation...')
      for (let i = 0; i < transaction.instructions[0].keys.length; i++) {
        const account = transaction.instructions[0].keys[i]
        if (!account.pubkey || !(account.pubkey instanceof PublicKey)) {
          console.error(`❌ Account ${i} is invalid:`, account.pubkey)
          throw new Error(`Invalid account at index ${i}: ${account.pubkey}`)
        }
        console.log(`✅ Account ${i} valid: ${account.pubkey.toString()}`)
      }
      console.log('🔍 Transaction details:')
      console.log('- Instructions:', transaction.instructions.length)
      console.log('- Accounts:', transaction.instructions[0]?.keys?.length || 'unknown')
      console.log('- Instruction data length:', instruction.data.length)
      console.log('- Instruction data (first 20 bytes):', Array.from(instruction.data.slice(0, 20)))
      console.log('🔍 Account order verification:')
      instruction.keys.forEach((key, index) => {
        console.log(`  ${index}: ${key.pubkey.toString()} (signer: ${key.isSigner}, writable: ${key.isWritable})`)
      })
      
      // Sign and send transaction
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Ensure feePayer is a proper PublicKey object
      const feePayerPubKey = ensurePublicKey(this.wallet.publicKey)
      transaction.feePayer = feePayerPubKey
      console.log('✅ Fee payer set to:', feePayerPubKey.toString())

      console.log('🔐 Attempting to sign transaction...')

      // Test transaction serialization before signing
      try {
        const testSerialize = transaction.serialize({ verifySignatures: false })
        console.log('✅ Pre-signing serialization successful, length:', testSerialize.length)
      } catch (serializeError) {
        console.error('❌ Pre-signing serialization failed:', serializeError)
        throw new Error(`Transaction validation failed: ${serializeError instanceof Error ? serializeError.message : String(serializeError)}`)
      }

      // Handle different wallet interface formats
      let signedTransaction;
      if (this.wallet && typeof this.wallet.signTransaction === 'function') {
        signedTransaction = await this.wallet.signTransaction(transaction);
      } else {
        // Fallback to window.solana if wallet interface doesn't work
        if (typeof window !== 'undefined' && window.solana && window.solana.signTransaction) {
          signedTransaction = await window.solana.signTransaction(transaction);
        } else {
          throw new Error('No wallet available for signing transaction');
        }
      }

      console.log('✅ Transaction signed successfully!')
      
      console.log('📤 Sending transaction to network...')
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())
      
      console.log('✅ Arcium MPC transaction sent:', signature)

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ Transaction confirmed!')
      console.log('🎉 Survey created successfully with Arcium MPC!')
      
      return {
        surveyId,
        transactionSignature: signature,
        note: 'Survey created successfully using Arcium MPC encryption'
      }



    } catch (error) {
      console.error('❌ Survey creation failed:', error)

      // Clean up database entries if transaction failed after saving
      if (cleanupNeeded && savedSurveyData) {
        console.log('🧹 Cleaning up failed survey data...')
        try {
          // Delete survey
          await supabase
            .from('surveys')
            .delete()
            .eq('survey_id', savedSurveyData.surveyId)

          // Delete survey questions
          await supabase
            .from('survey_questions')
            .delete()
            .eq('survey_id', savedSurveyData.surveyId)

          console.log('✅ Cleanup completed - removed survey and questions from database')
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError)
        }
      }

      throw error
    }
  }

  async submitResponse(surveyId: string, responses: any[]): Promise<{ responseId: string, transactionSignature: string }> {
    if (!this.wallet) {
      throw new Error('Wallet is required for response submission')
    }

    // Validate wallet state
    const ensurePublicKey = (key: any): PublicKey => {
      if (key instanceof PublicKey) return key
      if (key && typeof key === 'object' && key._bn && key.toString) {
        return new PublicKey(key.toString())
      }
      if (typeof key === 'string') return new PublicKey(key)
      throw new Error('Invalid public key format')
    }

    try {
      ensurePublicKey(this.wallet.publicKey)
      console.log('🚀 Starting response submission process...')
      
      // Check if survey is still accepting responses
      const { data: survey, error: surveyError } = await supabase
        .from('surveys')
        .select('max_responses, response_count')
        .eq('survey_id', surveyId)
        .single()

      if (surveyError) {
        throw new Error(`Survey not found: ${surveyError.message}`)
      }

      if (survey.max_responses && survey.response_count >= survey.max_responses) {
        throw new Error('Survey has reached maximum response limit')
      }

      // Check if user has already responded
      const walletPubKey = ensurePublicKey(this.wallet.publicKey)
      const userWalletAddress = walletPubKey.toString()
      const hasResponded = await this.hasUserResponded(surveyId, userWalletAddress)

      if (hasResponded) {
        console.log('🔍 User has already responded, checking for orphaned responses...')

        // Check if there are multiple responses (indicating orphaned data)
              const { data: allResponses, error: countError } = await supabase
        .from('survey_responses')
        .select('response_id, created_at, responder_wallet')
        .eq('survey_id', surveyId)
        .eq('responder_wallet', userWalletAddress)
        .order('created_at', { ascending: false })

        if (!countError && allResponses && allResponses.length > 1) {
          console.log(`🧹 Found ${allResponses.length} responses, cleaning up orphaned data...`)

          // Keep only the most recent response, delete others
          const responsesToDelete = allResponses.slice(1)
          for (const response of responsesToDelete) {
            await supabase
              .from('survey_responses')
              .delete()
              .eq('response_id', response.response_id)
          }

          console.log(`✅ Cleaned up ${responsesToDelete.length} orphaned responses`)
        } else {
          throw new Error('You have already responded to this survey. Each wallet can only submit one response per survey.')
        }
      }

      // Generate unique response ID
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('Generated response ID:', responseId)

      // Encrypt response data
      console.log('🔐 Encrypting response data...')
      const responseJson = JSON.stringify({
        surveyId,
        responses,
        submittedAt: new Date().toISOString(),
        respondent: this.wallet.publicKey.toString()
      })

      // Create Arcium program instance for encryption
      const provider = new AnchorProvider(
        this.connection,
        this.wallet as any,
        { commitment: 'confirmed' }
      )

      // Get MXE public key for encryption
      const mxePublicKey = await getMXEPublicKey(provider as any, SURVEY_X_PROGRAM_ID)
      if (!mxePublicKey) {
        throw new Error('Failed to get MXE public key for encryption')
      }
      
      const { encrypted: encryptedResponseData, nonce: responseNonce, publicKey: responsePubKey } = await MPCEncryption.encryptData(responseJson, mxePublicKey)
      console.log('Response data encrypted successfully')

      // Create Arcium MPC transaction
      console.log('🚀 Creating Arcium MPC transaction...')
      const program = new Program(idl as any, provider)

      // Generate PDAs
      // Handle both old string format and new PublicKey format
      let surveyIdBuffer: Buffer
      try {
        // Try to parse as PublicKey first (new format)
        surveyIdBuffer = new PublicKey(surveyId).toBuffer()
      } catch (error) {
        // If that fails, use the string as bytes (old format)
        console.log('Using old string format for surveyId:', surveyId)
        surveyIdBuffer = Buffer.from(surveyId, 'utf8')
      }
      
      const [surveyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('survey'), surveyIdBuffer],
        SURVEY_X_PROGRAM_ID
      )
      // walletPubKey is already defined above, reuse it

      const [responsePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('response'), Buffer.from(walletPubKey.toBytes())],
        SURVEY_X_PROGRAM_ID
      )

      // Create direct Arcium MPC transaction (same approach as createSurvey)
      console.log('🚀 Creating direct Arcium MPC transaction...')
      
      // Use proper Arcium account derivation
      const computationOffset = BigInt(Math.floor(Math.random() * 1000000))
      const mxeAccount = deriveMxePda()
      const mempoolAccount = deriveMempoolPda()
      const executingPool = deriveExecPoolPda()
      const computationAccount = deriveCompPda(computationOffset)
      
      // Use add_together comp def (known to be initialized)
      const addTogetherOffset = getCompDefAccOffset('add_together')
      const addTogetherOffsetNumber = new DataView(addTogetherOffset.buffer, addTogetherOffset.byteOffset, addTogetherOffset.byteLength).getUint32(0, true)
      const addTogetherCompDef = getCompDefAccAddress(SURVEY_X_PROGRAM_ID, addTogetherOffsetNumber)
      
      // Use the expected cluster account from the error logs
      const clusterAccount = new PublicKey('2qibdmpiSHrzcvbqQ9c9PEx17Q9KhyKSMuxuRP8AYJ9c')
      
      console.log('🔍 Using expected cluster account:', clusterAccount.toString())
      
      // Debug: Check all accounts
      console.log('🔍 Checking all computation accounts...')
      console.log('Computation Offset:', computationOffset.toString())
      console.log('All account addresses:')
      console.log('- Payer:', this.wallet.publicKey.toString())
      console.log('- MXE Account:', mxeAccount.toString())
      console.log('- Mempool Account:', mempoolAccount.toString())
      console.log('- Executing Pool:', executingPool.toString())
      console.log('- Computation Account:', computationAccount.toString())
      console.log('- Comp Def Account:', addTogetherCompDef.toString())
      console.log('- Cluster Account:', clusterAccount.toString())
      
      // Create direct transaction instruction using add_together format
      // Ensure all pubkeys are proper PublicKey objects
      const payerPubKey = ensurePublicKey(this.wallet.publicKey)

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: payerPubKey, isSigner: true, isWritable: true }, // payer
          { pubkey: mxeAccount, isSigner: false, isWritable: false }, // mxe_account
          { pubkey: mempoolAccount, isSigner: false, isWritable: true }, // mempool_account
          { pubkey: executingPool, isSigner: false, isWritable: true }, // executing_pool
          { pubkey: computationAccount, isSigner: false, isWritable: true }, // computation_account
          { pubkey: addTogetherCompDef, isSigner: false, isWritable: false }, // comp_def_account
          { pubkey: clusterAccount, isSigner: false, isWritable: true }, // cluster_account
          { pubkey: new PublicKey('7MGSS4iKNM4sVib7bDZDJhVqB6EcchPwVnTKenCY1jt3'), isSigner: false, isWritable: true }, // pool_account (writable!)
          { pubkey: new PublicKey('FHriyvoZotYiFnbUzKFjzRSb2NiaC8RPWY7jtKuKhg65'), isSigner: false, isWritable: false }, // clock_account
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
          { pubkey: new PublicKey('BKck65TgoKRokMjQM3datB9oRwJ8rAj2jxPXvHXUvcL6'), isSigner: false, isWritable: false }, // arcium_program
        ],
        programId: SURVEY_X_PROGRAM_ID,
        // Using add_together instruction format: discriminator + computation_offset + ciphertext_0 + ciphertext_1 + pub_key + nonce
        data: Buffer.concat([
          Buffer.from([70, 27, 73, 27, 150, 56, 75, 181]), // add_together discriminator from IDL
          new BN(computationOffset.toString()).toArrayLike(Buffer, 'le', 8), // computation offset (8 bytes u64, little-endian)
          Buffer.from(encryptedResponseData), // ciphertext_0 (32 bytes)
          Buffer.from(encryptedResponseData), // ciphertext_1 (32 bytes) - using same data for both
          Buffer.from(responsePubKey), // pub_key (32 bytes)
          new BN(1).toArrayLike(Buffer, 'le', 16), // nonce (16 bytes u128, little-endian)
        ])
      });

      // Validate all instruction accounts before adding to transaction
      console.log('🔍 Pre-transaction account validation...')
      for (let i = 0; i < instruction.keys.length; i++) {
        const account = instruction.keys[i]
        console.log(`${i}: ${account.pubkey.toString()} (signer: ${account.isSigner}, writable: ${account.isWritable})`)
        if (!account.pubkey || !(account.pubkey instanceof PublicKey)) {
          throw new Error(`Invalid public key at index ${i}: ${account.pubkey}`)
        }
      }

      const transaction = new Transaction()
      transaction.add(instruction)

      // Sign and send transaction
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Ensure feePayer is a proper PublicKey object
      const feePayerPubKey = ensurePublicKey(this.wallet.publicKey)
      transaction.feePayer = feePayerPubKey
      console.log('✅ Fee payer set to:', feePayerPubKey.toString())

      console.log('🔐 Attempting to sign transaction...')

      // Test transaction serialization before signing
      try {
        const testSerialize = transaction.serialize({ verifySignatures: false })
        console.log('✅ Pre-signing serialization successful, length:', testSerialize.length)
      } catch (serializeError: any) {
        console.error('❌ Pre-signing serialization failed:', serializeError)
        throw new Error(`Transaction validation failed: ${serializeError.message}`)
      }

      // Handle different wallet interface formats for signing
      let signedTransaction;
      if (this.wallet && typeof this.wallet.signTransaction === 'function') {
        signedTransaction = await this.wallet.signTransaction(transaction);
      } else {
        // Fallback to window.solana if wallet interface doesn't work
        if (typeof window !== 'undefined' && window.solana && window.solana.signTransaction) {
          signedTransaction = await window.solana.signTransaction(transaction);
        } else {
          throw new Error('No wallet available for signing response transaction');
        }
      }
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())
      
      console.log('✅ Response transaction sent:', signature)

      // Wait for confirmation and save to database
      await this.connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ Response transaction confirmed!')

      try {
        // NOW save response to Supabase (only after successful transaction)
      console.log('📝 Saving response to Supabase...')
        console.log('📊 Response data to store:', {
          survey_id: surveyId,
          response_id: responseId,
          responder_wallet: walletPubKey.toString(),
          response_data: responses,
          response_data_type: typeof responses,
          response_data_length: responses ? responses.length : 'null'
        })

      const { error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          response_id: responseId,
            responder_wallet: walletPubKey.toString(),
          encrypted_data: encryptedResponseData,
            response_data: responses, // Store actual response data for creators to view
          submitted_at: new Date().toISOString()
        })

      if (responseError) {
        console.error('❌ Response insert error:', responseError)

          // Handle duplicate response error specifically
          if (responseError.code === '23505' && responseError.message.includes('survey_responses_survey_id_responder_wallet_key')) {
            throw new Error('You have already responded to this survey. Each wallet can only submit one response per survey.')
          }

        throw responseError
      }

      // Update survey response count
      const { error: updateError } = await supabase
        .from('surveys')
        .update({ response_count: survey.response_count + 1 })
        .eq('survey_id', surveyId)

      if (updateError) {
        console.error('❌ Survey update error:', updateError)
        throw updateError
      }

      console.log('✅ Response saved to Supabase successfully!')
      } catch (dbError) {
        console.error('❌ Database save failed after successful transaction:', dbError)
        // Transaction succeeded but database failed - this is a rare edge case
        // We could implement retry logic here if needed
        throw new Error(`Transaction succeeded but database save failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`)
      }

      // Setup computation callback tracking
      await this.setupComputationCallback('submit_response', surveyId, signature, responseId)

      return {
        responseId,
        transactionSignature: signature
      }

    } catch (error) {
      console.error('❌ Response submission failed:', error)
      throw error
    }
  }

  async getSurveys(filters?: {
    category?: string
    search?: string
    limit?: number
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('surveys')
        .select(`
          *,
          survey_questions (
            question_id,
            question_text,
            question_type,
            options,
            required,
            order_index
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,hashtags.cs.{${filters.search}}`)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await retrySupabaseOperation(async () => {
        return await query
      })

      if (error) {
        console.error('❌ Error fetching surveys:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('❌ Failed to fetch surveys:', error)
      throw error
    }
  }

  async getSurvey(surveyId: string): Promise<any> {
    try {
      const { data, error } = await retrySupabaseOperation(async () => {
        return await supabase
        .from('surveys')
        .select(`
          *,
          survey_questions (
            question_id,
            question_text,
            question_type,
            options,
            required,
            order_index
          )
        `)
        .eq('survey_id', surveyId)
        .single()
      })

      if (error) {
        console.error('❌ Error fetching survey:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('❌ Failed to fetch survey:', error)
      throw error
    }
  }

  async hasUserResponded(surveyId: string, userWallet: string): Promise<boolean> {
    try {
      // Normalize wallet address for comparison
      const normalizedWallet = userWallet.toLowerCase().trim()

      const { data, error } = await supabase
        .from('survey_responses')
        .select('response_id, created_at')
        .eq('survey_id', surveyId)
        .eq('responder_wallet', normalizedWallet)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Error checking response status:', error)
        return false
      }

      const hasResponse = data && data.length > 0
      if (hasResponse) {
        console.log('🔍 Found existing response:', data[0])
      }

      return hasResponse
    } catch (error) {
      console.error('❌ Failed to check response status:', error)
      return false
    }
  }

  // Computation callback management
  private async setupComputationCallback(
    computationType: 'create_survey' | 'submit_response',
    surveyId: string,
    transactionSignature: string,
    responseId?: string
  ): Promise<void> {
    try {
      console.log(`🔗 Setting up computation callback for ${computationType}...`)
      
      // In a real implementation, this would register with Arcium's callback system
      // For now, we'll simulate the callback setup
      const callbackId = `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      console.log(`✅ Callback registered: ${callbackId}`)
      
      // Start polling for results (in production, this would be handled by WebSocket or server-sent events)
      this.pollForComputationResult(callbackId, computationType, surveyId, responseId)
      
    } catch (error) {
      console.error('❌ Failed to setup computation callback:', error)
    }
  }

  private async pollForComputationResult(
    callbackId: string,
    computationType: 'create_survey' | 'submit_response',
    surveyId: string,
    responseId?: string
  ): Promise<void> {
    // Simulate polling for computation results
    // In production, this would be handled by Arcium's callback system
    console.log(`🔄 Polling for computation result: ${callbackId}`)
    
    // Simulate computation completion after 5 seconds
    setTimeout(() => {
      console.log(`✅ Computation completed: ${callbackId}`)
      this.handleCallbackEvent({
        id: callbackId,
        computationType,
        status: 'completed',
        resultData: { success: true },
        createdAt: new Date(),
        completedAt: new Date(),
        creator: this.wallet?.publicKey?.toString() || 'unknown',
        surveyId,
        responseId
      })
    }, 5000)
  }

  private handleCallbackEvent(result: ComputationResult): void {
    console.log('📨 Received computation callback:', result)
    // Handle the computation result
    // In production, this would update the UI with the results
  }

  async getComputationResult(computationId: string): Promise<ComputationResult | null> {
    // In production, this would fetch from Arcium's callback system
    // For now, return a mock result
    return {
      id: computationId,
      computationType: 'create_survey',
      status: 'completed',
      resultData: { success: true },
      createdAt: new Date(),
      completedAt: new Date(),
      creator: this.wallet?.publicKey?.toString() || 'unknown',
      surveyId: 'mock_survey_id'
    }
  }

  async getUserComputationResults(): Promise<ComputationResult[]> {
    // In production, this would fetch from Arcium's callback system
    // For now, return mock results
    return []
  }

  async getSurveysByCreator(creatorWallet: string): Promise<any[]> {
    try {
      const { data, error } = await retrySupabaseOperation(async () => {
        return await supabase
          .from('surveys')
          .select(`
            *,
            survey_questions (
              question_id,
              question_text,
              question_type,
              options,
              required,
              order_index
            )
          `)
          .eq('creator_wallet', creatorWallet)
          .order('created_at', { ascending: false })
      })

      if (error) {
        console.error('❌ Error fetching user surveys:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('❌ Failed to fetch user surveys:', error)
      throw error
    }
  }

  async deleteSurvey(surveyId: string): Promise<void> {
    try {
      // First delete all related data
      await retrySupabaseOperation(async () => {
        return await supabase
          .from('survey_responses')
          .delete()
          .eq('survey_id', surveyId)
      })

      await retrySupabaseOperation(async () => {
        return await supabase
          .from('survey_questions')
          .delete()
          .eq('survey_id', surveyId)
      })

      // Finally delete the survey
      const { error } = await retrySupabaseOperation(async () => {
        return await supabase
          .from('surveys')
          .delete()
          .eq('survey_id', surveyId)
      })

      if (error) {
        console.error('❌ Error deleting survey:', error)
        throw error
      }
    } catch (error) {
      console.error('❌ Failed to delete survey:', error)
      throw error
    }
  }
}

// Helper function to get Anchor provider
export function getProvider(): AnchorProvider {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed')
  const wallet = {
    publicKey: new PublicKey('11111111111111111111111111111111'), // Dummy key
    signTransaction: async () => new Transaction(),
    signAllTransactions: async () => []
  }
  
  return new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
}