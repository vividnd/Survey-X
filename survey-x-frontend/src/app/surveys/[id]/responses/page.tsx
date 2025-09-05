'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Eye, Download, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'

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
}

export default function SurveyResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const { publicKey, connected } = useWalletSafe()
  const surveyId = params.id as string

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

  const loadSurveyData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load survey data
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('survey_id', surveyId)
        .single()

      if (surveyError || !surveyData) {
        setError('Survey not found')
        return
      }

      setSurvey(surveyData)

      // Check if current user is the creator
      console.log('🔍 Responses page - Creator check:', {
        publicKey: publicKey ? publicKey.toString() : 'null',
        creatorWallet: surveyData.creator_wallet,
        isCreator: publicKey && surveyData.creator_wallet === publicKey.toString()
      })
      
      if (publicKey && surveyData.creator_wallet === publicKey.toString()) {
        setIsCreator(true)
        console.log('✅ User is authorized to view responses')
      } else {
        console.log('❌ User is not authorized to view responses')
        setError('You are not authorized to view responses for this survey')
        return
      }

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index')

      if (questionsError) {
        setError('Failed to load survey questions')
        return
      }

      setQuestions(questionsData || [])

      // Load responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false })

      if (responsesError) {
        setError('Failed to load survey responses')
        return
      }

      setResponses(responsesData || [])
      
      console.log('🔍 Responses loaded:', {
        surveyId,
        questionsCount: questionsData?.length || 0,
        responsesCount: responsesData?.length || 0,
        responses: responsesData
      })

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
      ['Responder Wallet', 'Submitted At', 'Status', 'Transaction Hash', ...questions.map(q => q.question_text)],
      // Data rows
      ...responses.map(response => [
        response.responder_wallet,
        new Date(response.submitted_at).toLocaleString(),
        response.computation_status,
        response.transaction_hash || 'N/A',
        // Note: Actual response data is encrypted and stored on-chain
        // This would need to be decrypted using Arcium MPC
        ...questions.map(() => '[Encrypted - Requires MPC Decryption]')
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responder
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {responses.map((response) => (
                    <tr key={response.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {response.responder_wallet.substring(0, 8)}...{response.responder_wallet.substring(-8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(response.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          response.computation_status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : response.computation_status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : response.computation_status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {response.computation_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {response.transaction_hash ? (
                          <a
                            href={`https://explorer.solana.com/tx/${response.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {response.transaction_hash.substring(0, 8)}...
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            // TODO: Implement response decryption and viewing
                            alert('Response decryption feature coming soon!')
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  Individual response data requires MPC decryption to view. Only aggregated statistics 
                  and metadata are visible here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
