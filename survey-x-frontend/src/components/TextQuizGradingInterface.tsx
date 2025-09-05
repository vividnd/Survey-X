'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Star, Save, ArrowLeft, Clock, User } from 'lucide-react'
import { QuizService, QuizResponse, QuizAttempt } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'

interface TextQuizGradingInterfaceProps {
  quizId: string
  onBack: () => void
}

interface UngradedResponse {
  id: string
  attempt_id: string
  question_id: string
  response_data: any
  points_awarded: number
  participant_wallet: string
  question_text: string
  max_points: number
  submitted_at: string
}

export default function TextQuizGradingInterface({ quizId, onBack }: TextQuizGradingInterfaceProps) {
  const { publicKey } = useWalletSafe()
  const [ungradedResponses, setUngradedResponses] = useState<UngradedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadUngradedResponses()
  }, [quizId])

  const loadUngradedResponses = async () => {
    try {
      setLoading(true)
      // Get all quiz responses that need manual grading
      const { data, error } = await QuizService.supabase
        .from('quiz_responses')
        .select(`
          *,
          quiz_questions!inner(
            points,
            survey_questions!inner(question_text)
          ),
          quiz_attempts!inner(
            participant_wallet,
            submitted_at
          )
        `)
        .eq('quiz_questions.quiz_id', quizId)
        .eq('is_graded', false)
        .eq('quiz_questions.survey_questions.question_type', 'text_input')
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedResponses = data.map((response: any) => ({
        id: response.id,
        attempt_id: response.attempt_id,
        question_id: response.question_id,
        response_data: response.response_data,
        points_awarded: response.points_awarded,
        participant_wallet: response.quiz_attempts.participant_wallet,
        question_text: response.quiz_questions.survey_questions.question_text,
        max_points: response.quiz_questions.points,
        submitted_at: response.quiz_attempts.submitted_at
      }))

      setUngradedResponses(formattedResponses)
    } catch (err: any) {
      setError('Failed to load ungraded responses')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const gradeResponse = async (responseId: string, points: number, feedback?: string) => {
    if (!publicKey) {
      setError('Wallet not connected')
      return
    }

    try {
      setGrading(true)
      setError(null)

      await QuizService.gradeTextResponse(
        responseId,
        points,
        feedback,
        publicKey.toString()
      )

      // Remove the graded response from the list
      setUngradedResponses(prev => prev.filter(r => r.id !== responseId))
      setSuccess('Response graded successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError('Failed to grade response')
      console.error(err)
    } finally {
      setGrading(false)
    }
  }

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ungraded responses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Quiz Management
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grade Text Responses</h1>
              <p className="text-gray-600 mt-2">
                Review and assign scores to text input responses
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {ungradedResponses.length}
              </div>
              <div className="text-sm text-gray-600">
                Pending Reviews
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Ungraded Responses */}
        {ungradedResponses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h2>
            <p className="text-gray-600">
              There are no text responses waiting for grading.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {ungradedResponses.map((response) => (
              <TextResponseGradingCard
                key={response.id}
                response={response}
                onGrade={gradeResponse}
                isGrading={grading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TextResponseGradingCardProps {
  response: UngradedResponse
  onGrade: (responseId: string, points: number, feedback?: string) => void
  isGrading: boolean
}

function TextResponseGradingCard({ response, onGrade, isGrading }: TextResponseGradingCardProps) {
  const [points, setPoints] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const handleGrade = () => {
    onGrade(response.id, points, feedback.trim() || undefined)
  }

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {response.question_text}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{response.participant_wallet.slice(0, 4)}...{response.participant_wallet.slice(-4)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{new Date(response.submitted_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              <span>Max: {response.max_points} points</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Response Text */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-gray-900 whitespace-pre-wrap">
          {response.response_data?.answer || response.response_data?.value || 'No response provided'}
        </p>
      </div>

      {/* Grading Interface */}
      {isExpanded && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points Awarded (0 - {response.max_points})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={response.max_points}
                  step="0.1"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
                <span className="text-sm text-gray-600">/ {response.max_points}</span>
              </div>
              <div className="mt-2">
                <span className={`text-sm font-medium ${getScoreColor(points, response.max_points)}`}>
                  {points > 0 ? `${((points / response.max_points) * 100).toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide feedback to the student..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              <p>Response ID: {response.id.slice(0, 8)}...</p>
            </div>
            <button
              onClick={handleGrade}
              disabled={isGrading || points < 0 || points > response.max_points}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                isGrading || points < 0 || points > response.max_points
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGrading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Grading...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Grade Response
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
