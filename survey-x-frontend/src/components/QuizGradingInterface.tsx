'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Star, Award, Users, TrendingUp, Edit3 } from 'lucide-react'
import { QuizService, Quiz, QuizAttempt, QuizResponse, WhitelistEntry } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'

interface QuizGradingInterfaceProps {
  quizId: string
}

export default function QuizGradingInterface({ quizId }: QuizGradingInterfaceProps) {
  const { publicKey } = useWalletSafe()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [ungradedResponses, setUngradedResponses] = useState<QuizResponse[]>([])
  const [whitelistedUsers, setWhitelistedUsers] = useState<WhitelistEntry[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'grading' | 'whitelist' | 'analytics'>('overview')

  useEffect(() => {
    const loadQuizData = async () => {
      try {
        // Load quiz details
        const quizData = await QuizService.getQuiz(quizId)
        setQuiz(quizData)

        // Load all attempts
        const allAttempts = await QuizService.getUserQuizAttempts(quizId, '') // Empty string to get all
        setAttempts(allAttempts)

        // Load ungraded responses - we'll need to get all attempts first, then their responses
        const allResponses: QuizResponse[] = []
        for (const attempt of allAttempts) {
          try {
            const responses = await QuizService.getQuizResponses(attempt.id)
            allResponses.push(...responses)
          } catch (error) {
            console.error('Failed to load responses for attempt:', attempt.id, error)
          }
        }
        setUngradedResponses(allResponses.filter(r => !r.is_graded))

        // Load whitelisted users
        const whitelist = await QuizService.getWhitelistedUsers(quizId)
        setWhitelistedUsers(whitelist)

        // Load analytics
        const analyticsData = await QuizService.getQuizAnalytics(quizId)
        setAnalytics(analyticsData)
      } catch (error) {
        console.error('Failed to load quiz data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuizData()
  }, [quizId])

  const handleGradeResponse = async (responseId: string, points: number, feedback?: string) => {
    try {
      await QuizService.gradeTextResponse(responseId, points, feedback, publicKey?.toString())
      
      // Reload ungraded responses
      const allAttempts = await QuizService.getUserQuizAttempts(quizId, '')
      const allResponses: QuizResponse[] = []
      for (const attempt of allAttempts) {
        try {
          const responses = await QuizService.getQuizResponses(attempt.id)
          allResponses.push(...responses)
        } catch (error) {
          console.error('Failed to load responses for attempt:', attempt.id, error)
        }
      }
      setUngradedResponses(allResponses.filter(r => !r.is_graded))
    } catch (error) {
      console.error('Failed to grade response:', error)
    }
  }

  const handleRemoveFromWhitelist = async (walletAddress: string) => {
    try {
      await QuizService.removeFromWhitelist(walletAddress, quizId)
      
      // Reload whitelisted users
      const whitelist = await QuizService.getWhitelistedUsers(quizId)
      setWhitelistedUsers(whitelist)
    } catch (error) {
      console.error('Failed to remove from whitelist:', error)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'grading', label: 'Grading', icon: Edit3 },
    { id: 'whitelist', label: 'Whitelist', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: Star }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz data...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <p className="text-gray-600">The requested quiz could not be found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          <p className="text-gray-600">{quiz.description}</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Total Attempts</p>
                    <p className="text-2xl font-bold text-blue-900">{analytics?.totalAttempts || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Passed</p>
                    <p className="text-2xl font-bold text-green-900">{analytics?.passedAttempts || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Star className="w-8 h-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-600">Avg Score</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {analytics?.averageScore?.toFixed(1) || '0.0'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Award className="w-8 h-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Whitelisted</p>
                    <p className="text-2xl font-bold text-purple-900">{whitelistedUsers.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Attempts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attempts</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attempts.slice(0, 10).map((attempt) => (
                      <tr key={attempt.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {attempt.participant_wallet.slice(0, 8)}...{attempt.participant_wallet.slice(-8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {attempt.percentage.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            attempt.is_passed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attempt.is_passed ? 'Passed' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(attempt.submitted_at || attempt.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grading' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ungraded Responses ({ungradedResponses.length})
              </h3>
              
              {ungradedResponses.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">All responses have been graded!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ungradedResponses.map((response) => (
                    <UngradedResponseCard
                      key={response.id}
                      response={response}
                      onGrade={handleGradeResponse}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'whitelist' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Whitelisted Users ({whitelistedUsers.length})
              </h3>
              
              {whitelistedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No users have been whitelisted yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Wallet Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Whitelisted
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {whitelistedUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.percentage.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.whitelisted_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleRemoveFromWhitelist(user.wallet_address)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion Rate</span>
                    <span className="font-medium">{analytics?.completionRate?.toFixed(1) || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Time</span>
                    <span className="font-medium">{analytics?.averageTime?.toFixed(1) || 0} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pass Rate</span>
                    <span className="font-medium">
                      {analytics?.totalAttempts > 0 
                        ? ((analytics.passedAttempts / analytics.totalAttempts) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Settings</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Score</span>
                    <span className="font-medium">{quiz.minimum_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Points</span>
                    <span className="font-medium">{quiz.total_points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Attempts</span>
                    <span className="font-medium">{quiz.max_attempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time Limit</span>
                    <span className="font-medium">
                      {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'No limit'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Component for individual ungraded response
function UngradedResponseCard({ 
  response, 
  onGrade 
}: { 
  response: QuizResponse
  onGrade: (responseId: string, points: number, feedback?: string) => void
}) {
  const [points, setPoints] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [isGrading, setIsGrading] = useState(false)

  const handleSubmitGrade = async () => {
    setIsGrading(true)
    try {
      await onGrade(response.id, points, feedback)
      setPoints(0)
      setFeedback('')
    } catch (error) {
      console.error('Failed to grade response:', error)
    } finally {
      setIsGrading(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Response</h4>
        <p className="text-gray-700 bg-gray-50 p-3 rounded">
          {response.response_data?.answer || response.response_data?.value || 'No answer provided'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Points (0-10)
          </label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Feedback (Optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide feedback to the student..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmitGrade}
          disabled={isGrading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isGrading ? 'Grading...' : 'Submit Grade'}
        </button>
      </div>
    </div>
  )
}
