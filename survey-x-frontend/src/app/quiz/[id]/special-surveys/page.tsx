'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import SpecialSurveyAccess from '@/components/SpecialSurveyAccess'
import { QuizService, Quiz, SpecialSurvey } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { AlertCircle, ArrowLeft, Plus, Settings } from 'lucide-react'
import Link from 'next/link'

export default function SpecialSurveysPage() {
  const params = useParams()
  const quizId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [specialSurveys, setSpecialSurveys] = useState<SpecialSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!connected || !publicKey) return

      try {
        const quizData = await QuizService.getQuiz(quizId)
        if (!quizData) {
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)

        const surveys = await QuizService.getSpecialSurveys(quizId)
        setSpecialSurveys(surveys)
      } catch (err) {
        setError('Failed to load data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [quizId, connected, publicKey])

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Special Surveys</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to manage special surveys</p>
          <WalletButtonWrapper />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href={`/quiz/${quizId}/manage`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Management
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Special Surveys</h1>
                <p className="text-gray-600">Exclusive surveys for whitelisted users</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href={`/quiz/${quizId}/create-special-survey`}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Special Survey
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <SpecialSurveyAccess quizId={quizId} />
    </div>
  )
}
