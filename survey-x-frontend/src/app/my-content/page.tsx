'use client'

import { useState, useEffect } from 'react'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { supabase } from '@/lib/supabase'
import { QuizService } from '@/lib/quizService'
import { SurveyService } from '@/lib/surveyService'
import { 
  Users, 
  Trophy, 
  Award, 
  BarChart3, 
  Eye, 
  Trash2, 
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Lock,
  Unlock
} from 'lucide-react'
import Link from 'next/link'

interface Survey {
  id: string
  survey_id: string
  title: string
  category: string
  response_count: number
  created_at: string
  is_active: boolean
}

interface Quiz {
  id: string
  title: string
  minimum_score: number
  total_points: number
  created_at: string
  is_active: boolean
}

interface WhitelistEntry {
  id: string
  quiz_id: string
  score: number
  percentage: number
  whitelisted_at: string
  quiz_title?: string
}

interface SurveyResponse {
  id: string
  survey_id: string
  submitted_at: string
  survey_title?: string
  survey_category?: string
}

interface QuizResponse {
  id: string
  quiz_id: string
  total_score: number
  percentage: number
  is_passed: boolean
  submitted_at: string
  quiz_title?: string
}

export default function MyContentPage() {
  const { publicKey, connected } = useWalletSafe()
  const [activeTab, setActiveTab] = useState<'created' | 'responses' | 'whitelist'>('created')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Created content
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])

  // User responses
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([])
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([])

  // Whitelist
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([])

  useEffect(() => {
    const loadData = async () => {
      if (!connected || !publicKey) return

      try {
        setLoading(true)

        // Load created surveys
        const { data: userSurveys, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('creator_wallet', publicKey.toString())
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (surveyError) {
          console.error('Error loading surveys:', surveyError)
        } else {
          setSurveys(userSurveys || [])
        }

        // Load created quizzes
        const userQuizzes = await QuizService.getQuizzesByCreator(publicKey.toString())
        setQuizzes(userQuizzes)

        // Load survey responses
        const { data: surveyResponsesData, error: surveyResponsesError } = await supabase
          .from('survey_responses')
          .select(`
            *,
            surveys (title, category)
          `)
          .eq('participant_wallet', publicKey.toString())
          .order('submitted_at', { ascending: false })

        if (surveyResponsesError) {
          console.error('Error loading survey responses:', surveyResponsesError)
        } else {
          setSurveyResponses(surveyResponsesData?.map(r => ({
            ...r,
            survey_title: r.surveys?.title,
            survey_category: r.surveys?.category
          })) || [])
        }

        // Load quiz responses
        const { data: quizAttemptsData, error: quizError } = await supabase
          .from('quiz_attempts')
          .select(`
            *,
            quizzes (title)
          `)
          .eq('participant_wallet', publicKey.toString())
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false })

        if (quizError) {
          console.error('Error loading quiz responses:', quizError)
        } else {
          setQuizResponses(quizAttemptsData?.map(a => ({
            id: a.id,
            quiz_id: a.quiz_id,
            total_score: a.total_score,
            percentage: a.percentage,
            is_passed: a.is_passed,
            submitted_at: a.submitted_at,
            quiz_title: a.quizzes?.title
          })) || [])
        }

        // Load whitelist entries
        const { data: whitelistData, error: whitelistError } = await supabase
          .from('whitelist')
          .select(`
            *,
            quizzes (title)
          `)
          .eq('wallet_address', publicKey.toString())
          .eq('is_active', true)
          .order('whitelisted_at', { ascending: false })

        if (whitelistError) {
          console.error('Error loading whitelist:', whitelistError)
        } else {
          setWhitelistEntries(whitelistData?.map(w => ({
            ...w,
            quiz_title: w.quizzes?.title
          })) || [])
        }

      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to load your content')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [connected, publicKey])

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      return
    }

    try {
      // Delete survey from Supabase
      const { error } = await supabase
        .from('surveys')
        .update({ is_active: false })
        .eq('survey_id', surveyId)

      if (error) {
        throw error
      }

      setSurveys(surveys.filter(s => s.survey_id !== surveyId))
    } catch (error) {
      console.error('Failed to delete survey:', error)
      alert('Failed to delete survey')
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return
    }

    try {
      await QuizService.deleteQuiz(quizId)
      setQuizzes(quizzes.filter(q => q.id !== quizId))
    } catch (error) {
      console.error('Failed to delete quiz:', error)
      alert('Failed to delete quiz')
    }
  }

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

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Content</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view your content</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'created', label: 'Created Content', icon: Plus, count: surveys.length + quizzes.length },
    { id: 'responses', label: 'My Responses', icon: Eye, count: surveyResponses.length + quizResponses.length },
    { id: 'whitelist', label: 'Whitelist Status', icon: Award, count: whitelistEntries.length }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Content</h1>
          <p className="text-gray-600">Manage your surveys, quizzes, and view your responses</p>
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
                  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'created' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Total Surveys</p>
                    <p className="text-2xl font-bold text-blue-900">{surveys.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Trophy className="w-8 h-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Total Quizzes</p>
                    <p className="text-2xl font-bold text-purple-900">{quizzes.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Total Responses</p>
                    <p className="text-2xl font-bold text-green-900">
                      {surveys.reduce((sum, s) => sum + s.response_count, 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Award className="w-8 h-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">Whitelisted Users</p>
                    <p className="text-2xl font-bold text-orange-900">{whitelistEntries.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Created Surveys */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Created Surveys</h2>
                <Link
                  href="/create"
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Survey
                </Link>
              </div>
              
              {surveys.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No surveys created yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Responses
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {surveys.map((survey) => (
                        <tr key={survey.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{survey.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              survey.category === 'quiz' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {survey.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {survey.response_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(survey.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Link
                                href={`/surveys/${survey.survey_id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDeleteSurvey(survey.survey_id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Created Quizzes */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Created Quizzes</h2>
                <Link
                  href="/create"
                  className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Quiz
                </Link>
              </div>
              
              {quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No quizzes created yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Min Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Points
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quizzes.map((quiz) => (
                        <tr key={quiz.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{quiz.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quiz.minimum_score}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quiz.total_points}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Link
                                href={`/quiz/${quiz.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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

        {activeTab === 'responses' && (
          <div className="space-y-6">
            {/* Survey Responses */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Survey Responses</h2>
              
              {surveyResponses.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No survey responses yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {surveyResponses.map((response) => (
                    <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{response.survey_title}</h3>
                          <p className="text-sm text-gray-600">
                            {response.survey_category} • {new Date(response.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Link
                          href={`/surveys/${response.survey_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quiz Responses */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Responses</h2>
              
              {quizResponses.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No quiz responses yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizResponses.map((response) => (
                    <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{response.quiz_title}</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(response.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getScoreIcon(response.percentage)}
                            <span className={`font-bold ${getScoreColor(response.percentage)}`}>
                              {response.percentage.toFixed(1)}%
                            </span>
                            {response.is_passed ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/quiz/${response.quiz_id}/results`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'whitelist' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Whitelist Status</h2>
              
              {whitelistEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">You're not whitelisted for any quizzes yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Take quizzes and score above the minimum to get whitelisted
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {whitelistEntries.map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Unlock className="w-6 h-6 text-green-600" />
                          <div>
                            <h3 className="font-medium text-gray-900">{entry.quiz_title}</h3>
                            <p className="text-sm text-gray-600">
                              Whitelisted on {new Date(entry.whitelisted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getScoreIcon(entry.percentage)}
                            <span className={`font-bold ${getScoreColor(entry.percentage)}`}>
                              {entry.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/whitelist/quiz/${entry.quiz_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}