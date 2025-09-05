'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { QuizService, Quiz, QuizAttempt } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { AlertCircle, ArrowLeft, Trophy, CheckCircle, XCircle, Clock, Star, Award } from 'lucide-react'
import Link from 'next/link'
import QuizResults from '@/components/QuizResults'

export default function QuizResultsPage() {
  const params = useParams()
  const quizId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [userAttempts, setUserAttempts] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => {
    const loadQuizData = async () => {
      if (!connected || !publicKey) return

      try {
        setLoading(true)
        
        // Load quiz data
        const quizData = await QuizService.getQuiz(quizId)
        if (!quizData) {
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)

        // Check if user is the creator
        setIsCreator(quizData.creator_wallet === publicKey.toString())

        // Load user's attempts
        const attempts = await QuizService.getUserQuizAttempts(quizId, publicKey.toString())
        setUserAttempts(attempts)
      } catch (err: any) {
        setError('Failed to load quiz data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadQuizData()
  }, [quizId, connected, publicKey])

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Results</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view your quiz results</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz results...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <p className="text-gray-600">The requested quiz could not be found.</p>
        </div>
      </div>
    )
  }

  const latestAttempt = userAttempts.length > 0 ? userAttempts[0] : null
  const canRetake = latestAttempt && !latestAttempt.is_passed && userAttempts.length < quiz.max_attempts

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-gray-600">Your Quiz Results</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {canRetake && (
                <Link
                  href={`/quiz/${quizId}`}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Retake Quiz
                </Link>
              )}
              <Link
                href={`/quiz/${quizId}`}
                className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                View Quiz
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {latestAttempt ? (
        <QuizResults 
          attempt={latestAttempt} 
          quizId={quizId}
          onRetake={canRetake ? () => window.location.href = `/quiz/${quizId}` : undefined}
          isCreator={isCreator}
        />
      ) : (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Attempts Yet</h2>
            <p className="text-gray-600 mb-6">
              You haven't taken this quiz yet. Click below to start your first attempt.
            </p>
            <Link
              href={`/quiz/${quizId}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Take Quiz
            </Link>
          </div>
        </div>
      )}

      {/* Attempt History */}
      {userAttempts.length > 1 && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attempt History</h3>
            <div className="space-y-3">
              {userAttempts.map((attempt, index) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      attempt.is_passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {attempt.is_passed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Attempt {attempt.attempt_number}
                        {index === 0 && <span className="ml-2 text-sm text-blue-600">(Latest)</span>}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(attempt.submitted_at || attempt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      attempt.is_passed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {attempt.percentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {attempt.total_score.toFixed(1)}/{attempt.max_possible_score.toFixed(1)} pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
