'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X, Save, AlertCircle, CheckCircle, Wallet } from 'lucide-react'
import { SurveyService } from '@/lib/surveyService'
import { PublicKey } from '@solana/web3.js'

// Phantom wallet interface
interface PhantomProvider {
  connect(): Promise<{ publicKey: { toBytes(): Uint8Array } }>
  signTransaction(transaction: any): Promise<any>
  signAllTransactions(transactions: any[]): Promise<any[]>
  publicKey?: { toBytes(): Uint8Array }
}

declare global {
  interface Window {
    solana?: PhantomProvider
  }
}

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'rating' | 'text_input'
  options: string[]
  required: boolean
}

const categories = [
  'technology', 'health', 'education', 'entertainment',
  'business', 'sports', 'politics', 'science', 'lifestyle', 'other'
]

export default function CreateSurveyPage() {
  const { publicKey, connected } = useWallet()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [createdSurveyId, setCreatedSurveyId] = useState<string>('')

  // Survey form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [hashtags, setHashtags] = useState('')
  const [maxResponses, setMaxResponses] = useState<number | undefined>(undefined)
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      required: true
    }
  ])

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      required: true
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id))
    }
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, ...updates } : q
    ))
  }

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? { ...q, options: [...q.options, ''] }
        : q
    ))
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? {
            ...q,
            options: q.options.map((opt, idx) =>
              idx === optionIndex ? value : opt
            )
          }
        : q
    ))
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? {
            ...q,
            options: q.options.filter((_, idx) => idx !== optionIndex)
          }
        : q
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 Form submitted!')
    console.log('Connected:', connected)
    console.log('Public key:', publicKey?.toString())

    if (!connected || !publicKey) {
      console.log('❌ Wallet not connected')
      setError('Please connect your Phantom wallet to create surveys')
      return
    }

    if (!title.trim()) {
      console.log('❌ No title')
      setError('Survey title is required')
      return
    }

    if (questions.length === 0) {
      console.log('❌ No questions')
      setError('At least one question is required')
      return
    }

    // Validate questions
    for (const question of questions) {
      if (!question.question_text.trim()) {
        console.log('❌ Empty question text')
        setError('All questions must have text')
        return
      }
      if (question.question_type === 'multiple_choice' && question.options.some(opt => !opt.trim())) {
        console.log('❌ Empty multiple choice options')
        setError('All multiple choice options must have text')
        return
      }
    }

    console.log('✅ Validation passed, starting submission...')

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('📝 Preparing survey data...')

      // Parse hashtags
      const hashtagArray = hashtags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)

      console.log('Hashtags:', hashtagArray)

      // Prepare survey data for SurveyService
      const surveyData = {
        title: title.trim(),
        description: description.trim(),
        category,
        hashtags: hashtagArray,
        maxResponses: maxResponses || 1000, // Default to 1000 if not specified
        questions: questions.map(q => ({
          question_text: q.question_text.trim(),
          question_type: (q.question_type === 'text_input' ? 'text' : q.question_type) as 'text' | 'rating' | 'multiple_choice',
          options: q.question_type === 'multiple_choice' ? q.options.filter(opt => opt.trim()) : undefined,
          required: q.required
        }))
      }

      console.log('Survey data prepared:', surveyData)

      // Get wallet signer for transaction
      console.log('🔗 Setting up Solana connection...')
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection("https://devnet.helius-rpc.com/?api-key=9ad422af-4f8a-4886-b124-77ad76ad683d")

      // Create wallet interface for SurveyService
      const walletInterface = {
        publicKey: publicKey, // This will be updated to the connected wallet
        signTransaction: async (transaction: any) => {
          console.log('🔐 Requesting transaction signature from Phantom...')
          if (!window.solana) {
            console.error('❌ Phantom wallet not found')
            throw new Error('Phantom wallet not found')
          }

          // Check if we have permission and request if needed
          console.log('🔍 Checking Phantom permissions...')
          try {
            // Try to ensure connection first
            const response = await window.solana.connect()
            console.log('✅ Phantom connected:', response.publicKey.toString())
            
            // Set the fee payer to the actually connected wallet
            const connectedWallet = response.publicKey
            transaction.feePayer = connectedWallet
            
            // Update the wallet interface to use the connected wallet
            // Convert Phantom public key to Solana PublicKey
            const solanaPublicKey = new PublicKey(connectedWallet.toBytes())
            walletInterface.publicKey = solanaPublicKey
            
            console.log('🔍 Wallet verification:')
            console.log('- Expected wallet:', publicKey.toString())
            console.log('- Connected wallet:', solanaPublicKey.toString())
            console.log('- Wallet match:', publicKey.equals(solanaPublicKey))
            
            console.log('📝 Signing transaction...')
            console.log('🔍 Transaction details before signing:')
            console.log('- Fee payer:', transaction.feePayer?.toString())
            console.log('- Recent blockhash:', transaction.recentBlockhash)
            console.log('- Instructions:', transaction.instructions.length)
            
            const signed = await window.solana.signTransaction(transaction)
            console.log('✅ Transaction signed!')
            return signed
          } catch (error) {
            console.error('❌ Error during transaction signing:', error)
            if (error instanceof Error) {
              console.error('❌ Error details:', error.message)
            }
            throw error
          }
        },
        signAllTransactions: async (transactions: any[]) => {
          console.log('🔐 Requesting multiple transaction signatures from Phantom...')
          if (!window.solana) {
            console.error('❌ Phantom wallet not found')
            throw new Error('Phantom wallet not found')
          }
          
          try {
            const signedTransactions = []
            for (const transaction of transactions) {
              const signed = await window.solana.signTransaction(transaction)
              signedTransactions.push(signed)
            }
            return signedTransactions
          } catch (error) {
            console.error('❌ Error during multiple transaction signing:', error)
            throw error
          }
        }
      }

      console.log('🚀 Creating SurveyService instance...')
      // Create SurveyService instance and submit survey with transaction
      const surveyService = new SurveyService(walletInterface)

      console.log('💰 Preparing transaction...')
      setSuccess('Please approve the transaction in your Phantom wallet...')

      const result = await surveyService.createSurvey(surveyData)

      console.log('🎉 Survey created successfully:', result)
      setCreatedSurveyId(result.surveyId) // Store the survey ID
      setSuccess(`✅ Survey created successfully! Transaction: ${result.transactionSignature.substring(0, 8)}... 🎉

Would you like to test your survey by answering it yourself?`)

      // Don't auto-redirect, let user choose what to do next

    } catch (err: any) {
      console.error('Error creating survey:', err)

      if (err.message?.includes('User rejected') || err.message?.includes('cancelled')) {
        setError('Transaction was cancelled. Please try again and approve the transaction.')
      } else if (err.message?.includes('insufficient') || err.message?.includes('balance')) {
        setError('Insufficient SOL balance. You need at least 0.001 SOL to create a survey.')
      } else if (err.message?.includes('Phantom') || err.message?.includes('wallet')) {
        setError('Phantom wallet error. Please make sure Phantom is connected and unlocked.')
      } else {
        setError(err.message || 'Failed to create survey. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Survey</h1>
          <p className="text-gray-600 mb-8">Connect your wallet to create encrypted surveys</p>
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-0" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Survey</h1>
          <p className="text-gray-600 mt-2">Create a privacy-preserving survey with encrypted responses</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>

            {/* Action buttons for survey testing */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Link
                href={createdSurveyId ? `/surveys/${createdSurveyId}` : '/'}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                🧪 Test My Survey
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                📊 Browse All Surveys
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Survey Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Survey Details</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Enter survey title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Describe your survey..."
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hashtags (comma-separated)
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                placeholder="privacy, blockchain, survey"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Responses (optional)
              </label>
              <input
                type="number"
                value={maxResponses || ''}
                onChange={(e) => setMaxResponses(e.target.value ? parseInt(e.target.value) : undefined)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Leave empty for unlimited responses"
              />
              <p className="text-sm text-gray-600 mt-1">
                Set a limit on how many responses this survey can receive before closing automatically.
              </p>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Question {index + 1}</h3>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text *
                      </label>
                      <input
                        type="text"
                        value={question.question_text}
                        onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                        placeholder="Enter your question"
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Type
                        </label>
                        <select
                          value={question.question_type}
                          onChange={(e) => updateQuestion(question.id, {
                            question_type: e.target.value as any,
                            options: e.target.value === 'multiple_choice' ? ['', ''] :
                                    e.target.value === 'rating' ? [] : []
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="rating">Rating (1-5)</option>
                          <option value="text_input">Text Input</option>
                        </select>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>

                    {question.question_type === 'multiple_choice' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Options
                        </label>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              {question.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(question.id, optionIndex)}
                                  className="text-red-500 hover:text-red-700 p-2"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOption(question.id)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            + Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    {question.question_type === 'rating' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          Rating questions will allow respondents to select a rating from 1 to 5 stars.
                        </p>
                      </div>
                    )}

                    {question.question_type === 'text_input' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                          Text input questions will allow respondents to enter free-form text responses.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Ready to Create Survey?</h3>
                <p className="text-gray-600 mt-1">
                  This will create an encrypted survey on Solana using Arcium MPC technology.
                </p>
                <div className="mt-3 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <Wallet className="w-4 h-4" />
                    <span>Requires Phantom Wallet</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Save className="w-4 h-4" />
                    <span>~0.001 SOL fee</span>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !connected}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : !connected ? (
                  <>
                    <Wallet className="w-5 h-5" />
                    Connect Wallet First
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Create Survey
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
