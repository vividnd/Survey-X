'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { QuizService, SpecialSurvey } from '@/lib/quizService'
import { supabase } from '@/lib/supabase'
import { Award, Lock, Unlock, ExternalLink, Users, Trophy, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function WhitelistQuizPage() {
  const params = useParams()
  const quizId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  const [quiz, setQuiz] = useState<any>(null)
  const [specialSurveys, setSpecialSurveys] = useState<SpecialSurvey[]>([])
  const [whitelistStatus, setWhitelistStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadQuizData = async () => {
      try {
        setLoading(true)
        
        // Load quiz data
        const quizData = await QuizService.getQuiz(quizId)
        if (!quizData) {
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)

        // Load special surveys
        const surveys = await QuizService.getSpecialSurveys(quizId)
        setSpecialSurveys(surveys)

        // Check whitelist status if user is connected
        if (connected && publicKey) {
          const whitelist = await QuizService.getWhitelistStatus(publicKey.toString(), quizId)
          setWhitelistStatus(whitelist)
        }
      } catch (err) {
        console.error('Failed to load quiz data:', err)
        setError('Failed to load quiz data')
      } finally {
        setLoading(false)
      }
    }

    if (quizId) {
      loadQuizData()
    }
  }, [quizId, connected, publicKey])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz information...</p>
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'This quiz does not exist or is no longer active.'}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const isWhitelisted = whitelistStatus !== null
  const canAccessSurveys = isWhitelisted

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {canAccessSurveys ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Unlock className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-orange-600" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          <p className="text-lg text-gray-600">
            {canAccessSurveys 
              ? 'You have access to exclusive surveys for this quiz'
              : 'Complete this quiz with a passing score to unlock exclusive surveys'
            }
          </p>
        </div>

        {/* Quiz Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Minimum Score</h3>
              <p className="text-2xl font-bold text-blue-600">{quiz.minimum_score}%</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Total Points</h3>
              <p className="text-2xl font-bold text-purple-600">{quiz.total_points}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Max Attempts</h3>
              <p className="text-2xl font-bold text-green-600">{quiz.max_attempts}</p>
            </div>
          </div>
        </div>

        {/* Whitelist Status */}
        {connected && (
          <div className={`rounded-lg p-6 mb-8 ${
            isWhitelisted 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-orange-50 border border-orange-200'
          }`}>
            <div className="flex items-center">
              {isWhitelisted ? (
                <>
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">You're Whitelisted!</h3>
                    <p className="text-sm text-green-700">
                      Score: {whitelistStatus.percentage.toFixed(1)}% • 
                      Whitelisted on {new Date(whitelistStatus.whitelisted_at).toLocaleDateString()}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Lock className="w-8 h-8 text-orange-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-orange-800">Not Whitelisted Yet</h3>
                    <p className="text-sm text-orange-700">
                      Take the quiz and score {quiz.minimum_score}% or higher to unlock exclusive surveys
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Special Surveys */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Exclusive Surveys</h2>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {specialSurveys.length} available
            </span>
          </div>

          {specialSurveys.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Special Surveys Yet</h3>
              <p className="text-gray-600">
                The quiz creator hasn't added any exclusive surveys for this quiz yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {specialSurveys.map((survey) => (
                <div key={survey.id} className={`p-4 rounded-lg border ${
                  canAccessSurveys 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{survey.title}</h3>
                        {canAccessSurveys ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            ✅ Accessible
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            🔒 Locked
                          </span>
                        )}
                      </div>
                      {survey.description && (
                        <p className="text-gray-600 mb-3">{survey.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          Whitelist Only
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Created {new Date(survey.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {canAccessSurveys ? (
                        <Link
                          href={`/surveys/${survey.survey_id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Take Survey
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
                          <Lock className="w-4 h-4" />
                          Locked
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {!canAccessSurveys ? (
            <Link
              href={`/quiz/${quizId}`}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Trophy className="w-5 h-5" />
              Take Quiz to Unlock
            </Link>
          ) : (
            <Link
              href="/whitelist"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Award className="w-5 h-5" />
              View All Whitelist Access
            </Link>
          )}
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
