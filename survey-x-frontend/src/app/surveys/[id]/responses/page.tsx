'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Eye, Download, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import QuestionTypeBadge from '@/components/QuestionTypeBadge'
import ResponseAnalytics from '@/components/ResponseAnalytics'

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

interface Survey {
  id: string
  title: string
  description: string
  creator_wallet: string
  survey_id: string
  category: string
  hashtags: string[]
  is_active: boolean
  question_count: number
  response_count: number
  max_responses?: number
  created_at: string
  updated_at: string
}

interface SurveyQuestion {
  id: string
  survey_id: string
  question_id: number
  question_text: string
  question_type: 'multiple_choice' | 'rating' | 'text_input'
  options?: string[]
  required: boolean
  order_index: number
}

interface SurveyResponse {
  id: string
  survey_id: string
  responder_wallet: string
  response_id: string
  computation_status: string
  submitted_at: string
  transaction_hash?: string
  response_data?: any[] // Actual response data for creators to view
}

export default function SurveyResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const { publicKey, connected } = useWalletSafe()
  const surveyId = params.id as string

  console.log('🔍 SurveyResponsesPage component loaded')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => {
    if (surveyId) {
      loadSurveyData()
    }
  }, [surveyId, publicKey])

  // Additional effect to handle wallet connection timing
  useEffect(() => {
    if (publicKey && survey && !isCreator && !error.includes('not authorized')) {
      loadSurveyData()
    }
  }, [publicKey, survey?.survey_id, isCreator, error])

  // Retry mechanism for wallet connection
  useEffect(() => {
    if (connected && publicKey && !survey && !loading && !error) {
      console.log('🔄 Retrying survey responses load with wallet:', publicKey.toString())
      loadSurveyData()
    }
  }, [connected, publicKey, survey, loading, error])

  // Additional retry for when wallet becomes available
  useEffect(() => {
    if (publicKey && publicKey.toString() !== 'null' && !survey && !loading) {
      console.log('🔄 Wallet available, retrying load:', publicKey.toString())
      loadSurveyData()
    }
  }, [publicKey])

  const loadSurveyData = async () => {
    try {
      setLoading(true)
      setError('')

      console.log('🔍 Loading survey data for ID:', surveyId)
      console.log('🔍 Current wallet state:', { connected, publicKey: publicKey?.toString() })

      // Load survey data with enhanced error handling
      let surveyData, surveyError
      try {
        console.log('🔍 Making Supabase query for survey...')
        const result = await retrySupabaseOperation(async () => {
          return await supabase
            .from('surveys')
            .select('*')
            .eq('survey_id', surveyId)
            .single()
        })
        surveyData = result.data
        surveyError = result.error
        console.log('🔍 Supabase query result:', { data: surveyData, error: surveyError })
      } catch (networkError) {
        console.error('🚨 Network error loading survey:', networkError)
        setError('Network error: Unable to load survey. Please check your connection and try again.')
        return
      }

      if (surveyError || !surveyData) {
        console.error('🚨 Survey not found:', {
          surveyError,
          surveyData,
          surveyId,
          errorCode: surveyError?.code,
          errorMessage: surveyError?.message,
          errorDetails: surveyError?.details
        })
        setError(`Survey not found. ID: ${surveyId}. Error: ${surveyError?.message || 'Unknown error'}`)
        return
      }

      console.log('✅ Survey loaded successfully:', {
        surveyId: surveyData.survey_id,
        title: surveyData.title,
        creator: surveyData.creator_wallet,
        isActive: surveyData.is_active
      })

      setSurvey(surveyData)

      // Check if current user is the creator with stable wallet state
      console.log('🔍 Preparing creator check...', {
        currentPublicKey: publicKey?.toString(),
        connected,
        surveyCreator: surveyData.creator_wallet
      })

      // Wait a moment for wallet state to stabilize
      await new Promise(resolve => setTimeout(resolve, 500))

      // Double-check wallet state after delay
      const stablePublicKey = publicKey?.toString()
      const stableConnected = connected

      console.log('🔍 Stable wallet check:', {
        stablePublicKey,
        stableConnected,
        surveyCreator: surveyData.creator_wallet
      })

      if (!stablePublicKey || !stableConnected) {
        console.log('🔍 Responses page - No stable public key available')
        setError('Please connect your wallet to view responses')
        return
      }

      console.log('🔍 Responses page - Creator check:', {
        publicKey: stablePublicKey,
        creatorWallet: surveyData.creator_wallet,
        walletMatch: surveyData.creator_wallet === stablePublicKey,
        surveyData: {
          id: surveyData.id,
          survey_id: surveyData.survey_id,
          title: surveyData.title,
          creator_wallet: surveyData.creator_wallet
        }
      })

      if (surveyData.creator_wallet === stablePublicKey) {
        setIsCreator(true)
        console.log('✅ User is authorized to view responses')
      } else {
        console.log('❌ User is not authorized to view responses')
        console.log('🔍 Authorization failure details:', {
          expectedCreator: surveyData.creator_wallet,
          actualUser: stablePublicKey,
          surveyInfo: {
            id: surveyData.id,
            survey_id: surveyData.survey_id,
            title: surveyData.title
          }
        })
        setError(`You are not authorized to view responses for this survey. Expected creator: ${surveyData.creator_wallet}, Your wallet: ${stablePublicKey}`)
        return
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await retrySupabaseOperation(async () => {
        return await supabase
          .from('survey_questions')
          .select('*')
          .eq('survey_id', surveyId)
          .order('order_index')
      })

      if (questionsError) {
        setError('Failed to load survey questions')
        return
      }

      setQuestions(questionsData || [])

      // Load responses
      const { data: responsesData, error: responsesError } = await retrySupabaseOperation(async () => {
        return await supabase
          .from('survey_responses')
          .select('*')
          .eq('survey_id', surveyId)
          .order('submitted_at', { ascending: false })
      })

      if (responsesError) {
        setError('Failed to load survey responses')
        return
      }

      setResponses(responsesData || [])
      
      console.log('🔍 Responses loaded:', {
        surveyId: surveyId,
        questionsCount: questionsData?.length || 0,
        responsesCount: responsesData?.length || 0,
        responses: responsesData || []
      })
      
      if (responsesData && responsesData.length > 0) {
        console.log('🔍 First response data structure:', {
          firstResponse: responsesData[0],
          firstResponseData: responsesData[0].response_data,
          firstResponseDataType: typeof responsesData[0].response_data,
          firstResponseDataLength: responsesData[0].response_data?.length,
          firstResponseDataContent: JSON.stringify(responsesData[0].response_data, null, 2)
        })
      }
      
      // Responses loaded successfully

    } catch (err) {
      console.error('Error loading survey data:', err)
      setError('Failed to load survey data')
    } finally {
      setLoading(false)
    }
  }

  const exportResponses = () => {
    if (!survey || !questions || !responses) return

    const csvData = [
      // Header row
      ['Response #', 'Submitted At', ...questions.map(q => q.question_text)],
      // Data rows
      ...responses.map((response, index) => [
        `#${index + 1}`,
        new Date(response.submitted_at).toLocaleString(),
        // Display actual response data
        ...questions.map((question, qIndex) => {
          const questionResponse = response.response_data && response.response_data[qIndex] 
            ? response.response_data[qIndex] 
            : null;
          return questionResponse ? (questionResponse.answer || questionResponse.value || questionResponse.response || questionResponse.text || 'No answer') : 'No data';
        })
      ])
    ]

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${survey.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          
          {/* Show Back to Home button for authorization errors */}
          {error.includes('not authorized') && (
            <div className="mb-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </div>
          )}

          {/* Show Connect Wallet button if error is about wallet connection */}
          {error.includes('connect your wallet') && (
            <div className="mb-4">
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
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Connect Wallet
              </button>
            </div>
          )}
          
          <div className="space-y-2">
            <Link href="/" className="block text-blue-600 hover:text-blue-700">
              ← Back to Home
            </Link>
            <Link href="/my-content" className="block text-green-600 hover:text-green-700">
              📊 My Content
            </Link>
          </div>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/surveys/${surveyId}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Survey
            </Link>
            <WalletButtonWrapper />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{survey.title}</h1>
                <p className="text-gray-600 mb-4">{survey.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {survey.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {responses.length} responses
                  </span>
                  <span>{survey.question_count} questions</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportResponses}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Response Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Survey Responses</h3>
              <p className="text-sm text-green-700 mt-1">
                As the survey creator, you can view all submitted responses. Each column shows the answer to the corresponding question. 
                Responses are also encrypted using Arcium MPC for additional privacy protection.
              </p>
              <div className="mt-2 text-xs text-green-600">
                Debug: {responses.length} responses loaded. Check console for detailed response data.
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {responses.length > 0 && (
          <ResponseAnalytics 
            questions={questions.map(q => ({
              id: q.question_id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options
            }))} 
            responses={responses.map(r => ({
              id: r.id,
              response_data: r.response_data || null,
              submitted_at: r.submitted_at
            }))} 
          />
        )}

        {/* Responses Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Survey Responses</h2>
            <p className="text-gray-600 mt-1">
              {responses.length === 0 
                ? 'No responses yet' 
                : `${responses.length} response${responses.length === 1 ? '' : 's'} received`
              }
            </p>
            {responses.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Response Data Status
                    </h3>
                    <div className="mt-1 text-sm text-blue-700">
                      <p>
                        • <strong>Green responses:</strong> Full data available (submitted after recent update)
                      </p>
                      <p>
                        • <strong>Orange "Legacy Response":</strong> Data not available (submitted before update)
                      </p>
                      <p>
                        • All responses are encrypted and stored securely on the blockchain
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {responses.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Responses Yet</h3>
              <p className="text-gray-600 mb-4">
                Share your survey to start collecting responses. Responses will appear here once submitted.
              </p>
              <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
                Debug: Survey ID = {surveyId}, Responses found = {responses.length}
              </div>
            </div>
          ) : (
            (() => {
              return (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    {questions.map((question, index) => (
                      <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {question.question_text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {responses.map((response, responseIndex) => {
                    return (
                    <tr key={response.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{responseIndex + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(response.submitted_at).toLocaleString()}
                      </td>
                      {questions.map((question, index) => {
                        // Get the response for this question
                        const questionResponse = response.response_data && response.response_data[index] 
                          ? response.response_data[index] 
                          : null;
                        
                        // Debug logging - Enhanced
                        
                        return (
                          <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="max-w-xs">
                              {questionResponse ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-900">
                                    {questionResponse.answer || questionResponse.value || questionResponse.response || questionResponse.text || 'No answer'}
                                  </div>
                                  <div className="mt-2">
                                    <QuestionTypeBadge questionType={question.question_type} />
                                  </div>
                                </div>
                              ) : response.response_data && response.response_data[index] ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-gray-900">
                                    Raw Data: {JSON.stringify(response.response_data[index])}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Fallback display for index {index}
                                  </div>
                                </div>
                              ) : response.response_data === null ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    ⚠️ Legacy Response
                                  </span>
                                  <div className="text-xs text-orange-600">
                                    Data not available (submitted before update)
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    ❌ No Data
                                  </span>
                                  <div className="text-xs text-gray-500">
                                    Index {index} not found
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )
            })()
          )}
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Eye className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Privacy Notice</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Survey responses are encrypted using Arcium MPC technology for maximum privacy. 
                  As the survey creator, you can view the decrypted response data below. 
                  Responder identities are protected and not displayed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
