'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { supabase } from '@/lib/supabase'
import { QuizService } from '@/lib/quizService'
import { ArrowLeft, Users, Trophy, Award, CheckCircle, XCircle, Clock, Star } from 'lucide-react'
import Link from 'next/link'

interface SpecialSurveyResponse {
  id: string
  participant_wallet: string
  response_data: any
  submitted_at: string
  created_at: string
}

interface WhitelistEntry {
  id: string
  wallet_address: string
  score: number
  percentage: number
  whitelisted_at: string
}

export default function SpecialSurveyResponsesPage() {
  const params = useParams()
  const surveyId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  
  const [survey, setSurvey] = useState<any>(null)
  const [responses, setResponses] = useState<SpecialSurveyResponse[]>([])
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([])
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!connected || !publicKey) return

      try {
        setLoading(true)
        
        // Load survey data
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('survey_id', surveyId)
          .eq('is_active', true)
          .single()

        if (surveyError || !surveyData) {
          setError('Survey not found')
          return
        }

        setSurvey(surveyData)
        setIsCreator(surveyData.creator_wallet === publicKey.toString())

        // Check if this is a special survey
        const { data: specialSurveyData, error: specialSurveyError } = await supabase
          .from('special_surveys')
          .select('id, quiz_id')
          .eq('survey_id', surveyData.id)
          .maybeSingle()

        if (!specialSurveyData || specialSurveyError) {
          setError('This is not a special survey')
          return
        }

        // Load quiz data
        const quizData = await QuizService.getQuiz(specialSurveyData.quiz_id)
        if (!quizData) {
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)

        // Load special survey responses
        const { data: responsesData, error: responsesError } = await supabase
          .from('special_survey_responses')
          .select('*')
          .eq('special_survey_id', specialSurveyData.id)
          .order('submitted_at', { ascending: false })

        if (responsesError) {
          console.error('Error loading responses:', responsesError)
        } else {
          setResponses(responsesData || [])
        }

        // Load whitelist entries for this quiz
        const { data: whitelistData, error: whitelistError } = await supabase
          .from('whitelist')
          .select('*')
          .eq('quiz_id', specialSurveyData.quiz_id)
          .eq('is_active', true)
          .order('percentage', { ascending: false })

        if (whitelistError) {
          console.error('Error loading whitelist:', whitelistError)
        } else {
          setWhitelistEntries(whitelistData || [])
        }

      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load survey data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [surveyId, connected, publicKey])

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 80) return <Trophy className="w-5 h-5 text-green-600" />
    if (percentage >= 60) return <Star className="w-5 h-5 text-yellow-600" />
    return <XCircle className="w-5 h-5 text-red-600" />
  }

  const getWhitelistEntry = (walletAddress: string) => {
    return whitelistEntries.find(entry => entry.wallet_address === walletAddress)
  }

  const maskWalletAddress = (address: string) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading special survey responses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only the survey creator can view special survey responses.</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/surveys/${surveyId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Survey
          </Link>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Special Survey Responses</h1>
                <p className="text-gray-600">{survey?.title}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Responses: {responses.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-600" />
                <span>Whitelisted: {whitelistEntries.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Min Score: {quiz?.minimum_score}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Information */}
        {quiz && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Quiz Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{quiz.title}</div>
                <p className="text-sm text-gray-600">Quiz Title</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{quiz.minimum_score}%</div>
                <p className="text-sm text-gray-600">Minimum Score</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{quiz.total_points}</div>
                <p className="text-sm text-gray-600">Total Points</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{quiz.max_attempts}</div>
                <p className="text-sm text-gray-600">Max Attempts</p>
              </div>
            </div>
          </div>
        )}

        {/* Responses */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Survey Responses</h2>
          
          {responses.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Responses Yet</h3>
              <p className="text-gray-600">
                No one has responded to this special survey yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {responses.map((response, index) => {
                const whitelistEntry = getWhitelistEntry(response.participant_wallet)
                return (
                  <div key={response.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Response #{index + 1}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(response.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      
                      {/* Quiz Score Display */}
                      {whitelistEntry ? (
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            {getScoreIcon(whitelistEntry.percentage)}
                            <span className={`text-lg font-bold ${getScoreColor(whitelistEntry.percentage)}`}>
                              {whitelistEntry.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Quiz Score • Whitelisted {new Date(whitelistEntry.whitelisted_at).toLocaleDateString()}
                          </p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="w-5 h-5 text-red-500" />
                            <span className="text-lg font-bold text-red-600">Not Found</span>
                          </div>
                          <p className="text-xs text-gray-500">Quiz Score</p>
                        </div>
                      )}
                    </div>

                    {/* Wallet Address (Masked) */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Participant:</span>
                        <span className="text-sm text-gray-600 font-mono">
                          {maskWalletAddress(response.participant_wallet)}
                        </span>
                      </div>
                    </div>

                    {/* Response Data */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Response Data:</h4>
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(response.response_data, null, 2)}
                      </pre>
                    </div>

                    {/* Whitelist Status */}
                    {whitelistEntry && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            Whitelisted User
                          </span>
                        </div>
                        <p className="text-xs text-green-700 mt-1">
                          This user passed the quiz with {whitelistEntry.percentage.toFixed(1)}% score
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Whitelist Summary */}
        {whitelistEntries.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Whitelist Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {whitelistEntries.slice(0, 6).map((entry, index) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      #{index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(entry.percentage)}
                      <span className={`text-sm font-bold ${getScoreColor(entry.percentage)}`}>
                        {entry.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    {maskWalletAddress(entry.wallet_address)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(entry.whitelisted_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
            {whitelistEntries.length > 6 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                And {whitelistEntries.length - 6} more whitelisted users...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
