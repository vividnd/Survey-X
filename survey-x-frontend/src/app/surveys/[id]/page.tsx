'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { ArrowLeft, Send, CheckCircle, AlertCircle, Users } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SurveyService } from '@/lib/surveyService'
import type { Survey, SurveyQuestion } from '@/lib/supabase'
import { PublicKey } from '@solana/web3.js'


export default function SurveyResponsePage() {
  const params = useParams()
  const surveyId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [responses, setResponses] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasResponded, setHasResponded] = useState(false)
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => {
    if (surveyId) {
      loadSurvey()
    }
  }, [surveyId])

  useEffect(() => {
    if (surveyId && publicKey) {
      checkIfResponded()
      checkSurveyCapacity()
    }
  }, [surveyId, publicKey])

  // Re-check creator status when wallet connection changes
  useEffect(() => {
    if (survey && publicKey) {
      console.log('🔍 Re-checking creator status:', {
        publicKey: publicKey.toString(),
        creatorWallet: survey.creator_wallet,
        isCreator: survey.creator_wallet === publicKey.toString()
      })
      
      if (survey.creator_wallet === publicKey.toString()) {
        setIsCreator(true)
        console.log('✅ User is the survey creator (re-check)')
      } else {
        setIsCreator(false)
        console.log('❌ User is not the survey creator (re-check)')
      }
    } else if (survey && !publicKey) {
      setIsCreator(false)
      console.log('❌ No wallet connected, not creator')
    }
  }, [survey, publicKey])

  const [isSurveyFull, setIsSurveyFull] = useState(false)

  const loadSurvey = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('survey_id', surveyId)
        .eq('is_active', true)
        .single()

      if (surveyError || !surveyData) {
        setError('Survey not found or no longer active')
        return
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index')

      if (questionsError) {
        setError('Failed to load survey questions')
        return
      }

      setSurvey(surveyData)
      setQuestions(questionsData || [])
      
      // Check if current user is the creator
      console.log('🔍 Creator check:', {
        publicKey: publicKey ? publicKey.toString() : 'null',
        creatorWallet: surveyData.creator_wallet,
        isCreator: publicKey && surveyData.creator_wallet === publicKey.toString()
      })
      if (publicKey && surveyData.creator_wallet === publicKey.toString()) {
        setIsCreator(true)
        console.log('✅ User is the survey creator')
      } else {
        console.log('❌ User is not the survey creator')
      }
      
      // Debug: Log questions to see their types
      console.log('🔍 Loaded questions:', questionsData)
      questionsData?.forEach((q, index) => {
        console.log(`Question ${index + 1}:`, {
          id: q.question_id,
          text: q.question_text,
          type: q.question_type,
          options: q.options
        })
      })
    } catch (err) {
      console.error('Error loading survey:', err)
      setError('Failed to load survey')
    } finally {
      setLoading(false)
    }
  }

  const checkIfResponded = async () => {
    if (!publicKey) return

    try {
      const surveyService = new SurveyService()
      const hasResponded = await surveyService.hasUserResponded(surveyId, publicKey.toString())
      console.log('🔍 Response check result:', hasResponded)
      setHasResponded(hasResponded)
    } catch (err) {
      console.error('Error checking response status:', err)
      setHasResponded(false) // Default to false on error
    }
  }

  const checkSurveyCapacity = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('max_responses, response_count')
        .eq('survey_id', surveyId)
        .single()

      if (error) {
        console.error('Error checking survey capacity:', error)
        return
      }

      if (data.max_responses && data.response_count >= data.max_responses) {
        setIsSurveyFull(true)
      }
    } catch (err) {
      console.error('Error checking survey capacity:', err)
    }
  }

  const handleResponseChange = (questionId: number, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected || !publicKey) {
      setError('Please connect your Phantom wallet to submit responses')
      return
    }

    // Validate required questions
    const unansweredRequired = questions.filter(q =>
      q.required && !responses[q.question_id]
    )

    if (unansweredRequired.length > 0) {
      setError('Please answer all required questions')
      return
    }

    // Check if survey is full
    if (isSurveyFull) {
      setError('This survey has reached its maximum number of responses')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Get wallet signer for transaction
      const { Connection } = await import('@solana/web3.js')
      const connection = new Connection("https://devnet.helius-rpc.com/?api-key=9ad422af-4f8a-4886-b124-77ad76ad683d")

      // Create wallet interface for SurveyService
      const walletInterface = {
        publicKey,
        signTransaction: async (transaction: any) => {
          try {
            if (!window.solana) {
              throw new Error('Phantom wallet not found')
            }
            if (!window.solana.signTransaction) {
              throw new Error('Phantom wallet signTransaction method not available')
            }

            const signed = await window.solana.signTransaction(transaction)
            return signed
          } catch (error) {
            console.error('Error signing transaction:', error)
            throw new Error('Failed to sign transaction. Please try again.')
          }
        },
        signAllTransactions: async (transactions: any[]) => {
          try {
            if (!window.solana) {
              throw new Error('Phantom wallet not found')
            }
            if (!window.solana.signTransaction) {
              throw new Error('Phantom wallet signTransaction method not available')
            }
            
            const signedTransactions = []
            for (const transaction of transactions) {
              const signed = await window.solana.signTransaction(transaction)
              signedTransactions.push(signed)
            }
            return signedTransactions
          } catch (error) {
            console.error('Error signing transactions:', error)
            throw new Error('Failed to sign transactions. Please try again.')
          }
        }
      }

      // Create SurveyService instance and submit response with transaction
      const surveyService = new SurveyService(walletInterface)

      setSuccess('Please approve the transaction in your Phantom wallet...')

      // Convert responses object to array format expected by SurveyService
      const responsesArray = Object.entries(responses).map(([questionId, response]) => ({
        question_id: parseInt(questionId),
        response
      }))

      const result = await surveyService.submitResponse(surveyId, responsesArray)

      setSuccess(`✅ Response submitted successfully! Transaction: ${result.transactionSignature.substring(0, 8)}...`)
      
      // Update the hasResponded state to show the user has responded
      setHasResponded(true)
      
      // Clear the form
      setResponses({})
      
      // Don't redirect - let the user stay on the page to see the success message
      // and potentially view responses if they're the creator

    } catch (err: any) {
      console.error('Error submitting response:', err)

      if (err.message?.includes('already responded') || err.message?.includes('duplicate')) {
        setError('You have already responded to this survey. Each wallet can only submit one response per survey.')
        setHasResponded(true) // Update the state to show the user has responded
      } else if (err.message?.includes('User rejected') || err.message?.includes('cancelled')) {
        setError('Transaction was cancelled. Please try again and approve the transaction.')
      } else if (err.message?.includes('insufficient') || err.message?.includes('balance')) {
        setError('Insufficient SOL balance. You need at least 0.0005 SOL to submit a response.')
      } else if (err.message?.includes('Phantom') || err.message?.includes('wallet')) {
        setError('Phantom wallet error. Please make sure Phantom is connected and unlocked.')
      } else {
        setError(err.message || 'Failed to submit response. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Survey Not Found</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Surveys
          </Link>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{survey.title}</h1>
                <p className="text-gray-600 mb-4">{survey.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {survey.category}
                  </span>
                  <span>{survey.question_count} questions</span>
                  <span>
                    {survey.response_count || 0}
                    {survey.max_responses ? ` / ${survey.max_responses}` : ''} responses
                    {survey.max_responses && survey.response_count >= survey.max_responses && ' (Full)'}
                  </span>
                </div>

                {survey.hashtags && survey.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {survey.hashtags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Creator Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 mb-2">
                    Debug: isCreator = {isCreator ? 'true' : 'false'}, publicKey = {publicKey ? publicKey.toString() : 'null'}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    Creator Wallet: {survey.creator_wallet}
                  </div>
                  {isCreator && (
                    <Link
                      href={`/surveys/${surveyId}/responses`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View Responses ({survey.response_count || 0})
                    </Link>
                  )}
                  {!isCreator && publicKey && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                      <div className="font-medium">Wallet Connected but Not Creator</div>
                      <div className="text-xs mt-1">
                        Your wallet: {publicKey.toString()}<br/>
                        Creator wallet: {survey.creator_wallet}
                      </div>
                    </div>
                  )}
                  {!isCreator && !publicKey && (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-500">
                        Connect your wallet to see if you're the survey creator
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            if (window.solana && window.solana.connect) {
                              await window.solana.connect()
                            } else {
                              alert('Please install Phantom wallet or another Solana wallet extension')
                            }
                          } catch (error) {
                            console.error('Wallet connection error:', error)
                            alert('Failed to connect wallet. Please try refreshing the page.')
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Already responded message */}
        {hasResponded && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Already Responded</h3>
                <p className="text-yellow-700 text-sm">You have already submitted a response to this survey.</p>
              </div>
            </div>
          </div>
        )}

        {/* Survey full message */}
        {isSurveyFull && !hasResponded && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Survey Full</h3>
                <p className="text-red-700 text-sm">This survey has reached its maximum number of responses and is no longer accepting new submissions.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Survey Form */}
        {!hasResponded && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question) => (
              <div key={question.question_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
                {/* Purple check mark for answered questions */}
                {responses[question.question_id] && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {question.question_text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                </div>

                {question.question_type === 'multiple_choice' && question.options && (
                  <div className="space-y-3">
                    {question.options.map((option, index) => (
                      <label key={index} className="flex items-center">
                        <input
                          type="radio"
                          name={`question-${question.question_id}`}
                          value={option}
                          checked={responses[question.question_id] === option}
                          onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
                          className="mr-3 text-purple-600 focus:ring-purple-500"
                          required={question.required}
                        />
                        <span className="text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.question_type === 'rating' && (
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => handleResponseChange(question.question_id, rating)}
                        className={`w-12 h-12 rounded-lg border-2 transition-colors ${
                          responses[question.question_id] === rating
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-300 hover:border-purple-300'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                )}

                {question.question_type === 'text_input' && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Debug: Text input question detected</p>
                    <textarea
                      value={responses[question.question_id] || ''}
                      onChange={(e) => handleResponseChange(question.question_id, e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                      placeholder="Enter your response..."
                      required={question.required}
                    />
                  </div>
                )}

                {/* Debug: Show question type for all questions */}
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                  Debug: Question type = "{question.question_type}"
                </div>
              </div>
            ))}

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Ready to Submit?</h3>
                  <p className="text-gray-600 mt-1">
                    Your response will be encrypted and processed using Arcium MPC technology.
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Privacy Protected</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-600">
                      <Send className="w-4 h-4" />
                      <span>~0.0005 SOL fee</span>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !connected || isSurveyFull}
                  className="flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : isSurveyFull ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Survey Full
                    </>
                  ) : !connected ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Connect Wallet First
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Response
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Connect Wallet Prompt */}
        {!connected && !hasResponded && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">
              Connect your Phantom wallet to submit responses to this survey.
            </p>
            <WalletButtonWrapper className="!bg-purple-600 hover:!bg-purple-700 !text-white !border-0 !rounded-lg !font-medium !px-6 !py-3" />
          </div>
        )}
      </div>
    </div>
  )
}
