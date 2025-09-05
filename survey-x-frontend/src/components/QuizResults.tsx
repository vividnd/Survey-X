'use client'

import { useState, useEffect } from 'react'
import { Trophy, CheckCircle, XCircle, Clock, Star, Award, Lock, Unlock, Eye, EyeOff, Plus } from 'lucide-react'
import { QuizService, QuizAttempt, QuizResponse, WhitelistEntry, QuizQuestion } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import Link from 'next/link'

interface QuizResultsProps {
  attempt: QuizAttempt
  quizId: string
  onRetake?: () => void
  isCreator?: boolean
}

export default function QuizResults({ attempt, quizId, onRetake, isCreator = false }: QuizResultsProps) {
  const { publicKey } = useWalletSafe()
  const [responses, setResponses] = useState<QuizResponse[]>([])
  const [whitelistStatus, setWhitelistStatus] = useState<WhitelistEntry | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [showAnswers, setShowAnswers] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadResults = async () => {
      if (!publicKey) return

      try {
        // Load quiz responses
        const quizResponses = await QuizService.getQuizResponses(attempt.id)
        setResponses(quizResponses)

        // Load quiz questions with correct answers and explanations
        const questions = await QuizService.getQuizQuestions(quizId)
        setQuizQuestions(questions)

        // Check whitelist status
        const whitelist = await QuizService.getWhitelistStatus(publicKey.toString(), quizId)
        setWhitelistStatus(whitelist)
      } catch (error) {
        console.error('Failed to load quiz results:', error)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [attempt.id, quizId, publicKey])

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 80) return <Trophy className="w-6 h-6 text-green-600" />
    if (percentage >= 60) return <Star className="w-6 h-6 text-yellow-600" />
    return <XCircle className="w-6 h-6 text-red-600" />
  }

  const formatTime = (minutes?: number) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${remainingMinutes}m`
  }

  const getQuestionDetails = (questionId: string) => {
    return quizQuestions.find(q => q.id === questionId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {getScoreIcon(attempt.percentage)}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
          <p className="text-lg text-gray-600">Here are your results</p>
        </div>

        {/* Score Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(attempt.percentage)}`}>
                {attempt.percentage.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600 mt-1">Final Score</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {attempt.total_score.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Points Earned</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {attempt.max_possible_score.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Total Points</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {formatTime(attempt.time_taken_minutes)}
              </div>
              <p className="text-sm text-gray-600 mt-1">Time Taken</p>
            </div>
          </div>
        </div>

        {/* Pass/Fail Status */}
        <div className={`rounded-lg p-6 mb-6 ${
          attempt.is_passed 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {attempt.is_passed ? (
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600 mr-3" />
            )}
            <div>
              <h3 className={`text-lg font-semibold ${
                attempt.is_passed ? 'text-green-800' : 'text-red-800'
              }`}>
                {attempt.is_passed ? 'Congratulations! You Passed!' : 'Not Quite There Yet'}
              </h3>
              <p className={`text-sm ${
                attempt.is_passed ? 'text-green-700' : 'text-red-700'
              }`}>
                {attempt.is_passed 
                  ? 'You have successfully completed the quiz and met the minimum requirements.'
                  : 'You need to score higher to pass this quiz. Review your answers and try again.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Whitelist Status */}
        {whitelistStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <Award className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800">You're Whitelisted!</h3>
                <p className="text-sm text-blue-700">
                  Your score qualifies you for special surveys and exclusive content.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Whitelisted on {new Date(whitelistStatus.whitelisted_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Question-by-Question Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Question Review</h3>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              {showAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAnswers ? 'Hide Answers' : 'Show Answers'}
            </button>
          </div>
          <div className="space-y-4">
            {responses.map((response, index) => {
              const questionDetails = getQuestionDetails(response.question_id)
              return (
                <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                    <div className="flex items-center space-x-2">
                      {response.is_correct !== null ? (
                        response.is_correct ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium text-gray-600">
                        {response.points_awarded.toFixed(1)} pts
                      </span>
                    </div>
                  </div>
                  
                  {/* Question Text */}
                  {questionDetails && (
                    <div className="text-sm text-gray-700 mb-3 font-medium">
                      {questionDetails.question_text}
                    </div>
                  )}
                  
                  {/* Your Answer */}
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Your answer:</strong> {response.response_data?.answer || response.response_data?.value || 'No answer'}
                  </div>
                  
                  {/* Correct Answer (if showing answers) */}
                  {showAnswers && questionDetails && questionDetails.correct_answer && (
                    <div className="text-sm text-green-700 bg-green-50 p-2 rounded mb-2">
                      <strong>Correct answer:</strong> {questionDetails.correct_answer}
                    </div>
                  )}
                  
                  {/* Hint/Explanation (if showing answers) */}
                  {showAnswers && questionDetails && questionDetails.explanation && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded mb-2">
                      <strong>Hint provided:</strong> {questionDetails.explanation}
                    </div>
                  )}
                  
                  {/* Feedback from grader */}
                  {response.feedback && (
                    <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded">
                      <strong>Instructor feedback:</strong> {response.feedback}
                    </div>
                  )}
                  
                  {/* Manual grading notice */}
                  {!response.is_graded && response.is_correct === null && (
                    <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                      This question is being manually graded by the quiz creator.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onRetake && !attempt.is_passed && (
            <button
              onClick={onRetake}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retake Quiz
            </button>
          )}
          
          {isCreator && (
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href={`/quiz/${quizId}/responses`}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Award className="w-4 h-4" />
                View All Responses
              </Link>
              <Link
                href={`/quiz/${quizId}/create-special-survey`}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Special Survey
              </Link>
            </div>
          )}
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
