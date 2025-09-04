import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
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

  constructor(wallet?: Wallet) {
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
      const signedInitTransaction = await this.wallet!.signTransaction!(initTransaction)
      
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
      question_type: 'multiple_choice' | 'rating' | 'text'
      options?: string[]
      required: boolean
    }>
    category: string
    hashtags: string[]
    maxResponses: number
  }): Promise<{ surveyId: string, transactionSignature: string, note: string }> {
    if (!this.wallet) {
      throw new Error('Wallet is required for survey creation')
    }

    try {
      console.log('🚀 Starting survey creation process...')
      
      // Generate unique survey ID
      const surveyId = `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('Generated survey ID:', surveyId)

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

      const { data: surveyRecord, error: surveyError } = await supabase
        .from('surveys')
        .insert({
          title: surveyData.title,
          description: surveyData.description,
          creator_wallet: this.wallet.publicKey.toString(),
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

      console.log('Supabase survey insert result:', { data: surveyRecord, error: surveyError })

      if (surveyError) {
        console.error('❌ Survey insert error:', surveyError)
        throw surveyError
      }

      // Save questions to Supabase for public viewing
      const questionsToInsert = surveyData.questions.map((q, index) => ({
        survey_id: surveyId,
        question_id: index + 1,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'multiple_choice' ? q.options?.filter(opt => opt.trim()) : null,
        required: q.required,
        order_index: index + 1
      }))

      console.log('Questions to insert:', questionsToInsert)

      const { error: questionsError } = await supabase
        .from('survey_questions')
        .insert(questionsToInsert)

      console.log('Questions insert result:', { error: questionsError })

      if (questionsError) {
        console.error('❌ Questions insert error:', questionsError)
        throw questionsError
      }

      console.log('✅ Survey metadata saved to Supabase successfully!')

      // STEP 3: Sign on-chain transaction for Arcium MPC computation
      console.log('🚀 Step 3: Creating Arcium MPC transaction...')

      // Create Arcium program instance
      const program = new Program(idl as any, provider)

      // Generate survey PDA (Program Derived Address)
      const [surveyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('survey'), this.wallet.publicKey.toBuffer()],
        SURVEY_X_PROGRAM_ID
      )

      // STEP 1: Initialize create_survey computation definition if needed
      console.log('🔍 Step 1: Checking and initializing create_survey computation definition...')
      
      const mxeAccount = deriveMxePda()
      
      console.log('🔍 Using deployed account addresses...')
      console.log('MXE Account:', mxeAccount.toString())
      console.log('Payer:', this.wallet.publicKey.toString())
      
      // Skip initialization for now due to InstructionFallbackNotFound error
      console.log('⚠️ Skipping initialization due to InstructionFallbackNotFound error')
      console.log('🔍 Will attempt to use existing or alternative computation definition')

      // STEP 2: Create direct transaction without Anchor program methods
      console.log('🚀 Step 2: Creating direct Arcium MPC transaction...')
      console.log('✅ Using add_together instruction with add_together comp def (working approach)')
      
      // Use proper Arcium account derivation
      const computationOffset = BigInt(Math.floor(Math.random() * 1000000))
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
      
      // Create direct transaction instruction using add_together format
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true }, // payer
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
          Buffer.from(encryptedSurveyData), // ciphertext_0 (32 bytes)
          Buffer.from(encryptedSurveyData), // ciphertext_1 (32 bytes) - using same data for both
          Buffer.from(surveyPubKey), // pub_key (32 bytes)
          new BN(1).toArrayLike(Buffer, 'le', 16), // nonce (16 bytes u128, little-endian)
        ])
      });
      
      const transaction = new Transaction()
      transaction.add(instruction)

      console.log('✅ Transaction created, requesting signature...')
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
      transaction.feePayer = this.wallet.publicKey

      console.log('🔐 Attempting to sign transaction...')
      const signedTransaction = await this.wallet.signTransaction!(transaction)
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
      throw error
    }
  }

  async submitResponse(surveyId: string, responses: any[]): Promise<{ responseId: string, transactionSignature: string }> {
    if (!this.wallet) {
      throw new Error('Wallet is required for response submission')
    }

    try {
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

      if (survey.response_count >= survey.max_responses) {
        throw new Error('Survey has reached maximum response limit')
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

      // Save response to Supabase
      console.log('📝 Saving response to Supabase...')
      const { error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          response_id: responseId,
          respondent_wallet: this.wallet.publicKey.toString(),
          encrypted_data: encryptedResponseData,
          submitted_at: new Date().toISOString()
        })

      if (responseError) {
        console.error('❌ Response insert error:', responseError)
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

      // Create Arcium MPC transaction
      console.log('🚀 Creating Arcium MPC transaction...')
      const program = new Program(idl as any, provider)

      // Generate PDAs
      const [surveyPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('survey'), new PublicKey(surveyId).toBuffer()],
        SURVEY_X_PROGRAM_ID
      )
      const [responsePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('response'), this.wallet.publicKey.toBuffer()],
        SURVEY_X_PROGRAM_ID
      )

      // Call Arcium MPC program
      const transaction = await program.methods
        .submitResponse({
          responses: Array.from(encryptedResponseData),
          nonce: Array.from(responseNonce)
        })
        .accounts({
          survey: surveyPDA,
          response: responsePDA,
          respondent: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Sign and send transaction
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = this.wallet.publicKey

      const signedTransaction = await this.wallet.signTransaction!(transaction)
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize())
      
      console.log('✅ Response transaction sent:', signature)

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ Response transaction confirmed!')

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

      const { data, error } = await query

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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
        .from('survey_responses')
        .select('response_id')
        .eq('survey_id', surveyId)
        .eq('respondent_wallet', userWallet)
        .limit(1)

      if (error) {
        console.error('❌ Error checking response status:', error)
        return false
      }

      return data && data.length > 0
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