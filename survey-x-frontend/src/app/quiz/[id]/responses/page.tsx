'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QuizService, QuizAttempt, Quiz, QuizResponse } from '@/lib/quizService'
import { SurveyService } from '@/lib/surveyService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { AlertCircle, ArrowLeft, Trophy, Clock, User, Award, CheckCircle, XCircle, Star } from 'lucide-react'
import Link from 'next/link'

export default function QuizResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string
  const { publicKey, connected } = useWalletSafe()

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [responses, setResponses] = useState<{[attemptId: string]: QuizResponse[]}>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => {
    const loadQuizData = async () => {
      if (!connected || !publicKey) return

      try {
        console.log('🔍 Loading quiz responses for ID:', quizId)
        setLoading(true)
        setError('')

        // Load quiz data
        const quizData = await QuizService.getQuiz(quizId)
        if (!quizData) {
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)

        // Check if user is the creator with stable wallet state
        console.log('🔍 Creator check:', {
          quizCreator: quizData.creator_wallet,
          userWallet: publicKey?.toString(),
          connected
        })

        // Wait for wallet state to stabilize
        await new Promise(resolve => setTimeout(resolve, 300))

        const stablePublicKey = publicKey?.toString()
        const isUserCreator = quizData.creator_wallet === stablePublicKey
        setIsCreator(isUserCreator)

        console.log('🔍 Creator verification:', {
          expectedCreator: quizData.creator_wallet,
          actualUser: stablePublicKey,
          isCreator: isUserCreator
        })

        if (!isUserCreator) {
          setError('You are not authorized to view quiz responses')
          return
        }

        // Use the new efficient method to get all responses with rankings
        const allResponses = await SurveyService.getAllSurveyResponses(quizId, 'quiz')
        setAttempts(allResponses as any) // Type compatibility for now

        console.log('✅ Loaded quiz responses with rankings:', {
          count: allResponses.length,
          responses: allResponses
        })

        // Load responses for each attempt
        const responsesData: {[attemptId: string]: QuizResponse[]} = {}
        for (const attempt of allResponses) {
          try {
            const attemptResponses = await QuizService.getQuizResponses(attempt.id)
            responsesData[attempt.id] = attemptResponses
          } catch (err) {
            console.error(`Failed to load responses for attempt ${attempt.id}:`, err)
            responsesData[attempt.id] = []
          }
        }
        setResponses(responsesData)

      } catch (err: any) {
        console.error('Error loading quiz responses:', err)
        setError(err.message || 'Failed to load quiz responses')
      } finally {
        setLoading(false)
      }
    }

    loadQuizData()
  }, [quizId, publicKey, connected])

  const maskWallet = (wallet: string) => {
    if (!wallet) return 'Unknown'
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="w-5 h-5 text-green-600" />
    if (percentage >= 60) return <Star className="w-5 h-5 text-yellow-600" />
    return <XCircle className="w-5 h-5 text-red-600" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz responses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz || !isCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You are not authorized to view this quiz's responses</p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-gray-600 mt-2">Quiz Responses Overview</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{attempts.length}</div>
                <div className="text-sm text-gray-600">Total Attempts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Responses List */}
        <div className="space-y-6">
          {attempts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Responses Yet</h3>
              <p className="text-gray-600">No one has taken this quiz yet.</p>
            </div>
          ) : (
            attempts.map((attempt, index) => (
              <div key={attempt.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Attempt Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getScoreIcon(attempt.percentage)}
                        <span className="font-medium text-gray-900">
                          Rank #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-mono">
                          {attempt.participant_wallet.slice(0, 8)}...{attempt.participant_wallet.slice(-8)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getScoreColor(attempt.percentage)}`}>
                          {attempt.percentage.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {attempt.total_score}/{quiz.total_points || 0} points
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            {formatDate(attempt.created_at)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {attempt.is_passed ? 'Passed' : 'Failed'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responses */}
                <div className="px-6 py-4">
                  {responses[attempt.id] && responses[attempt.id].length > 0 ? (
                    <div className="space-y-4">
                      {responses[attempt.id].map((response, responseIndex) => (
                        <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Question {responseIndex + 1}
                                </span>
                                {response.is_correct !== undefined && (
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    response.is_correct
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {response.is_correct ? 'Correct' : 'Incorrect'}
                                  </span>
                                )}
                              </div>

                              <div className="text-sm text-gray-900 mb-2">
                                <strong>Answer:</strong> {response.response_data?.answer || response.response_data?.value || 'No answer'}
                              </div>

                              {response.points_awarded !== undefined && (
                                <div className="text-sm text-gray-600">
                                  <strong>Points:</strong> {response.points_awarded}/{response.points_awarded}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No responses found for this attempt
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
