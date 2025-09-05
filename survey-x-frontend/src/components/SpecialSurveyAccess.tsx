'use client'

import { useState, useEffect } from 'react'
import { Lock, Unlock, Award, Star, ArrowRight, CheckCircle } from 'lucide-react'
import { QuizService, SpecialSurvey, WhitelistEntry } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { useRouter } from 'next/navigation'

interface SpecialSurveyAccessProps {
  quizId: string
}

export default function SpecialSurveyAccess({ quizId }: SpecialSurveyAccessProps) {
  const { publicKey } = useWalletSafe()
  const router = useRouter()
  const [specialSurveys, setSpecialSurveys] = useState<SpecialSurvey[]>([])
  const [whitelistStatus, setWhitelistStatus] = useState<WhitelistEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSpecialSurveys = async () => {
      if (!publicKey) return

      try {
        // Load special surveys for this quiz
        const surveys = await QuizService.getSpecialSurveys(quizId)
        setSpecialSurveys(surveys)

        // Check whitelist status
        const whitelist = await QuizService.getWhitelistStatus(publicKey.toString(), quizId)
        setWhitelistStatus(whitelist)
      } catch (error) {
        console.error('Failed to load special surveys:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSpecialSurveys()
  }, [quizId, publicKey])

  const handleAccessSurvey = (surveyId: string) => {
    router.push(`/surveys/${surveyId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading special surveys...</p>
        </div>
      </div>
    )
  }

  const isWhitelisted = whitelistStatus !== null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {isWhitelisted ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Unlock className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isWhitelisted ? 'Special Surveys' : 'Access Restricted'}
          </h1>
          <p className="text-lg text-gray-600">
            {isWhitelisted 
              ? 'You have access to exclusive surveys and content'
              : 'Complete the quiz with a passing score to unlock special surveys'
            }
          </p>
        </div>

        {/* Whitelist Status */}
        {isWhitelisted && whitelistStatus && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <Award className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">You're Whitelisted!</h3>
                <p className="text-sm text-green-700">
                  Score: {whitelistStatus.percentage.toFixed(1)}% • 
                  Whitelisted on {new Date(whitelistStatus.whitelisted_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Special Surveys */}
        <div className="space-y-6">
          {specialSurveys.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Special Surveys Yet</h3>
              <p className="text-gray-600">
                The quiz creator hasn't created any special surveys yet. Check back later!
              </p>
            </div>
          ) : (
            specialSurveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {isWhitelisted ? (
                        <Unlock className="w-5 h-5 text-green-600 mr-2" />
                      ) : (
                        <Lock className="w-5 h-5 text-red-600 mr-2" />
                      )}
                      <h3 className="text-xl font-semibold text-gray-900">{survey.title}</h3>
                    </div>
                    
                    {survey.description && (
                      <p className="text-gray-600 mb-4">{survey.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Star className="w-4 h-4 mr-1" />
                        Exclusive Content
                      </span>
                      <span className="flex items-center">
                        <Award className="w-4 h-4 mr-1" />
                        Whitelist Required
                      </span>
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    {isWhitelisted ? (
                      <button
                        onClick={() => handleAccessSurvey(survey.survey_id)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Access Survey
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    ) : (
                      <div className="flex items-center px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
                        <Lock className="w-4 h-4 mr-2" />
                        Locked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Call to Action for Non-Whitelisted Users */}
        {!isWhitelisted && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Want Access to Special Surveys?
              </h3>
              <p className="text-blue-700 mb-4">
                Complete the quiz with a passing score to unlock exclusive content and surveys.
              </p>
              <button
                onClick={() => router.push(`/quiz/${quizId}`)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Take Quiz
              </button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
