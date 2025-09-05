'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import QuizGradingInterface from '@/components/QuizGradingInterface'
import TextQuizGradingInterface from '@/components/TextQuizGradingInterface'
import { QuizService, Quiz } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { AlertCircle, ArrowLeft, Settings, Users, BarChart3, FileText, CheckSquare } from 'lucide-react'
import Link from 'next/link'

export default function QuizManagePage() {
  const params = useParams()
  const quizId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'text-grading'>('overview')

  useEffect(() => {
    const loadQuiz = async () => {
      if (!connected || !publicKey) return

      try {
        const quizData = await QuizService.getQuiz(quizId)
        if (!quizData) {
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)
      } catch (err) {
        setError('Failed to load quiz')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [quizId, connected, publicKey])

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Manage Quiz</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to manage your quizzes</p>
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
          <p className="text-gray-600">Loading quiz...</p>
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
                href="/"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-gray-600">Quiz Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href={`/quiz/${quizId}/special-surveys`}
                className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Users className="w-4 h-4 mr-2" />
                Special Surveys
              </Link>
              <Link
                href={`/quiz/${quizId}`}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Quiz
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <CheckSquare className="w-4 h-4 mr-2" />
                Quiz Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('text-grading')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'text-grading'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Grade Text Responses
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' ? (
        <QuizGradingInterface quizId={quizId} />
      ) : (
        <TextQuizGradingInterface 
          quizId={quizId} 
          onBack={() => setActiveTab('overview')} 
        />
      )}
    </div>
  )
}
