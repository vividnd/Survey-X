'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { useMobile } from '@/hooks/useMobile'
import { ArrowLeft, Send, CheckCircle, AlertCircle, Users, Lock, Award } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SurveyService } from '@/lib/surveyService'
import { QuizService } from '@/lib/quizService'
import type { Survey, SurveyQuestion } from '@/lib/supabase'
import { PublicKey } from '@solana/web3.js'


export default function SurveyResponsePage() {
  const params = useParams()
  const surveyId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  const isMobile = useMobile()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [responses, setResponses] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasResponded, setHasResponded] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [isQuiz, setIsQuiz] = useState(false)
  const [quizData, setQuizData] = useState<any>(null)
  const [isSpecialSurvey, setIsSpecialSurvey] = useState(false)
  const [whitelistStatus, setWhitelistStatus] = useState<any>(null)
  const [requiredQuizId, setRequiredQuizId] = useState<string | null>(null)

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

  // Re-check creator status and whitelist status when wallet connection changes
  useEffect(() => {
    if (survey && publicKey) {
      const userWallet = publicKey.toString()
      const creatorWallet = survey.creator_wallet

      // Only consider creator if wallet is full length (44 chars for Solana)
      if (creatorWallet && creatorWallet.length === 44 && creatorWallet === userWallet) {
        setIsCreator(true)
      } else {
        setIsCreator(false)
      }
      
      // Re-check whitelist status for special surveys
      if (isSpecialSurvey && requiredQuizId) {
        QuizService.getWhitelistStatus(publicKey.toString(), requiredQuizId)
          .then(setWhitelistStatus)
          .catch(console.error)
      }
    } else if (survey && !publicKey && !isQuiz) {
      setIsCreator(false)
      setWhitelistStatus(null)
      // No wallet connected
    }
  }, [survey, publicKey, isQuiz, isSpecialSurvey, requiredQuizId])

  const [isSurveyFull, setIsSurveyFull] = useState(false)

  const loadSurvey = async () => {
    try {
      // Use SurveyService instead of direct Supabase query
      const surveyService = new SurveyService({
        publicKey: publicKey,
        signTransaction: async (tx) => {
          if (!window.solana?.signTransaction) throw new Error('Phantom wallet not found')
          return await window.solana.signTransaction(tx)
        },
        signAllTransactions: async (txs) => {
          if (!window.solana?.signAllTransactions) throw new Error('Phantom wallet not found')
          return await window.solana.signAllTransactions(txs)
        }
      })

      let surveyData = await surveyService.getSurvey(surveyId)

      if (!surveyData) {
        setError('Survey not found or no longer active')
        return
      }

      // Check if this survey has a quiz associated with it
      if (surveyData.category === 'quiz') {
        console.log('🔍 Survey is actually a quiz, checking for associated quiz...')
        try {
          const { data: associatedQuiz } = await supabase
            .from('quizzes')
            .select('*')
            .eq('survey_id', surveyId)
            .eq('is_active', true)
            .single()

          if (associatedQuiz) {
            console.log('✅ Found associated quiz, redirecting to quiz page...')
            router.push(`/quiz/${associatedQuiz.id}`)
            return
          }
        } catch (quizCheckError) {
          console.log('🔍 No quiz found for this survey, proceeding with survey view')
        }
      }

      // Validate creator wallet silently
      if (!surveyData.creator_wallet || surveyData.creator_wallet.length !== 44) {
        console.warn('⚠️ Survey creator_wallet appears invalid')
      }

      setSurvey(surveyData)
      setQuestions(surveyData.survey_questions || [])
      
      // Check if this is a special survey (whitelist-only)
      const { data: specialSurveyData, error: specialSurveyError } = await supabase
        .from('special_surveys')
        .select('quiz_id')
        .eq('survey_id', surveyData.id)
        .maybeSingle()

      if (specialSurveyData && !specialSurveyError) {
        setIsSpecialSurvey(true)
        setRequiredQuizId(specialSurveyData.quiz_id)
        
        // Check whitelist status if user is connected
        if (publicKey) {
          const whitelist = await QuizService.getWhitelistStatus(publicKey.toString(), specialSurveyData.quiz_id)
          setWhitelistStatus(whitelist)
        }
      }
      
      // Check if this is a quiz - redirect to quiz page
      if (surveyData.category === 'quiz') {
        console.log('🔄 Survey is a quiz, redirecting to quiz page')
        router.push(`/quiz/${surveyId}`)
        return
      }

      setIsQuiz(false)
      
      // Questions loaded successfully
    } catch (err) {
      console.error('Error loading survey:', err)
      setError('Failed to load survey')
    } finally {
      setLoading(false)
    }
  }

  const checkIfResponded = async () => {
    if (!publicKey || !connected) return

    try {
      // Wait for wallet state to stabilize
      await new Promise(resolve => setTimeout(resolve, 300))

      const surveyService = new SurveyService()
      const hasResponded = await surveyService.hasUserResponded(surveyId, publicKey.toString())
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
      setError(`Please connect your Phantom wallet to ${survey?.category === 'quiz' ? 'take this quiz' : 'submit a response'}`)
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

      setSuccess(`✅ ${survey?.category === 'quiz' ? 'Quiz completed' : 'Response submitted'} successfully! Transaction: ${result.transactionSignature.substring(0, 8)}...`)

      // Update the hasResponded state to show the user has responded
      setHasResponded(true)

      // Clear the form
      setResponses({})

      // Re-check response status in case cleanup occurred
      setTimeout(() => {
        if (publicKey) {
          checkIfResponded()
        }
      }, 1000)

    } catch (err: any) {
      console.error('Error submitting response:', err)

      if (err.message?.includes('already responded') || err.message?.includes('duplicate')) {
        setError(`You have already ${survey?.category === 'quiz' ? 'taken this quiz' : 'responded to this survey'}. Each wallet can only ${survey?.category === 'quiz' ? 'take the quiz once' : 'submit one response per survey'}.`)
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
    <div className={`min-h-screen py-4 sm:py-8 ${
      isQuiz 
        ? 'bg-gradient-to-br from-orange-50 to-red-50' 
        : 'bg-gradient-to-br from-slate-50 to-purple-50'
    }`}>
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'max-w-full' : 'max-w-4xl'}`}>
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Surveys
          </Link>

          <div className={`rounded-lg shadow-sm border p-6 ${
            isQuiz 
              ? 'bg-gradient-to-r from-orange-100 to-red-100 border-orange-200' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
                  {isQuiz && (
                    <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-medium">
                      🧠 QUIZ
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-4">{survey.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className={`px-3 py-1 rounded-full ${
                    isQuiz 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {survey.category}
                  </span>
                  <span>{survey.question_count} questions</span>
                  {isQuiz && quizData && (
                    <>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                        {quizData.total_points} points
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        Min: {quizData.minimum_score}%
                      </span>
                      {quizData.max_attempts > 1 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {quizData.max_attempts} attempts
                        </span>
                      )}
                    </>
                  )}
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
                  {isCreator && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg mb-4">
                      <div className="font-medium">✨ This is your survey</div>
                      <div className="text-xs mt-1">
                        You can view responses and manage this survey.
                      </div>
                    </div>
                  )}
                  {isCreator && (
                    <div className="flex gap-3">
                      <Link
                        href={isSpecialSurvey ? `/surveys/${surveyId}/special-responses` : `/surveys/${surveyId}/responses`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        View Responses ({survey.response_count || 0})
                      </Link>
                      {isSpecialSurvey && (
                        <div className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm">
                          <Award className="w-4 h-4 inline mr-1" />
                          Special Survey
                        </div>
                      )}
                    </div>
                  )}
                  {!isCreator && publicKey && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                      <div className="font-medium">Access Restricted</div>
                      <div className="text-xs mt-1">
                        You don't have permission to view responses for this survey.
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
                <p className="text-yellow-700 text-sm">You have already {survey?.category === 'quiz' ? 'taken this quiz' : 'submitted a response to this survey'}.</p>
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
                <h3 className="font-medium text-red-800">{survey?.category === 'quiz' ? 'Quiz Full' : 'Survey Full'}</h3>
                <p className="text-red-700 text-sm">This {survey?.category === 'quiz' ? 'quiz' : 'survey'} has reached its maximum number of {survey?.category === 'quiz' ? 'attempts' : 'responses'} and is no longer accepting new submissions.</p>
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

        {/* Whitelist Access Check */}
        {isSpecialSurvey && !isCreator && (
          <div className="mb-8">
            {whitelistStatus ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Access Granted!</h3>
                    <p className="text-green-700">
                      You're whitelisted for this exclusive survey. Score: {whitelistStatus.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <Lock className="w-8 h-8 text-orange-600" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-orange-800">Exclusive Survey</h3>
                    <p className="text-orange-700 mb-3">
                      This survey is only available to users who have passed the required quiz.
                    </p>
                    {requiredQuizId && (
                      <Link
                        href={`/quiz/${requiredQuizId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Award className="w-4 h-4" />
                        Take Required Quiz
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Survey Form */}
        {!hasResponded && (!isSpecialSurvey || isCreator || whitelistStatus) && (
          <form onSubmit={handleSubmit} className={`space-y-4 sm:space-y-6 ${isMobile ? 'pb-20' : ''}`}>
            {questions.map((question) => (
              <div key={question.question_id} className={`bg-white rounded-lg shadow-sm border border-gray-200 ${isMobile ? 'p-4' : 'p-6'} relative`}>
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
                  <h3 className="text-lg font-medium text-gray-900">Ready to {survey?.category === 'quiz' ? 'Take Quiz' : 'Submit'}?</h3>
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
                  className={`flex items-center gap-2 ${isMobile ? 'w-full justify-center px-6 py-4 text-lg' : 'px-8 py-3'} bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium`}
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
                      {survey?.category === 'quiz' ? 'Take Quiz' : 'Take Survey'}
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
              Connect your Phantom wallet to {survey?.category === 'quiz' ? 'take this quiz' : 'submit a response to this survey'}.
            </p>
            <WalletButtonWrapper className="!bg-purple-600 hover:!bg-purple-700 !text-white !border-0 !rounded-lg !font-medium !px-6 !py-3" />
          </div>
        )}
      </div>
    </div>
  )
}
