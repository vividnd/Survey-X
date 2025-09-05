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
  Unlock,
  FileText,
  Brain,
  Target,
  Search,
  Filter,
  ArrowUpDown
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

export default function DashboardPage() {
  const { publicKey, connected } = useWalletSafe()
  const [activeTab, setActiveTab] = useState<'browse' | 'content' | 'create'>('browse')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Browse tab state
  const [surveys, setSurveys] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'responses'>('recent')

  // Content tab state
  const [userSurveys, setUserSurveys] = useState<Survey[]>([])
  const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([])
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([])
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([])
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([])

  useEffect(() => {
    if (connected && publicKey) {
      loadAllData()
    } else if (!connected) {
      loadBrowseData()
    }
  }, [connected, publicKey])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadBrowseData(),
        loadUserContent()
      ])
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadBrowseData = async () => {
    try {
      const surveyService = new SurveyService()
      const surveysData = await surveyService.getSurveys({
        limit: 50
      })
      setSurveys(surveysData)
    } catch (err) {
      console.error('Failed to load browse data:', err)
    }
  }

  const loadUserContent = async () => {
    if (!publicKey) return

    try {
      // Load created surveys
      const { data: userSurveysData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('creator_wallet', publicKey.toString())
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (surveyError) {
        console.error('Error loading surveys:', surveyError)
      } else {
        setUserSurveys(userSurveysData || [])
      }

      // Load created quizzes
      const userQuizzesData = await QuizService.getQuizzesByCreator(publicKey.toString())
      setUserQuizzes(userQuizzesData)

      // Load survey responses
      const { data: surveyResponsesData, error: surveyResponsesError } = await supabase
        .from('survey_responses')
        .select(`
          *,
          surveys!inner(title, category)
        `)
        .eq('responder_wallet', publicKey.toString())
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
          quizzes!inner(title)
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
          quizzes!inner(title)
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
      console.error('Failed to load user content:', err)
    }
  }

  const handleDeleteSurvey = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      return
    }
    try {
      const { error } = await supabase
        .from('surveys')
        .update({ is_active: false })
        .eq('survey_id', surveyId)

      if (error) {
        throw error
      }
      setUserSurveys(userSurveys.filter(s => s.survey_id !== surveyId))
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
      setUserQuizzes(userQuizzes.filter(q => q.id !== quizId))
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

  // Filter and sort surveys for browse tab
  const filteredSurveys = surveys
    .filter(survey => {
      const matchesSearch = !searchTerm ||
        survey.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = !categoryFilter || survey.category === categoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popular':
          return (b.response_count || 0) - (a.response_count || 0)
        case 'responses':
          return (b.response_count || 0) - (a.response_count || 0)
        default:
          return 0
      }
    })

  const tabs = [
    { id: 'browse', label: 'Browse Surveys', icon: Search },
    { id: 'content', label: 'My Content', icon: FileText, count: connected ? (userSurveys.length + userQuizzes.length + surveyResponses.length + quizResponses.length) : 0 },
    { id: 'whitelist', label: 'Whitelist Hub', icon: Unlock, count: connected ? whitelistEntries.length : 0 },
    { id: 'create', label: 'Create', icon: Plus }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Browse surveys, manage your content, and create new items</p>
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
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search surveys..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    <option value="survey">Surveys</option>
                    <option value="quiz">Quizzes</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="popular">Most Popular</option>
                    <option value="responses">Most Responses</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Survey Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSurveys.map((survey) => (
                <div key={survey.survey_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{survey.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{survey.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          survey.category === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {survey.category === 'quiz' ? '🎯 Quiz' : '📊 Survey'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {survey.response_count || 0}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400">
                        Created {new Date(survey.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/surveys/${survey.survey_id}`}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {survey.category === 'quiz' ? 'Take Quiz' : 'Take Survey'}
                  </Link>
                </div>
              ))}
            </div>

            {filteredSurveys.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No surveys found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
            {!connected ? (
              <div className="text-center py-12">
                <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect your wallet</h3>
                <p className="text-gray-600">Connect your wallet to view your content</p>
              </div>
            ) : (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <BarChart3 className="w-8 h-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Total Surveys</p>
                        <p className="text-2xl font-bold text-blue-900">{userSurveys.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <Trophy className="w-8 h-8 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-600">Total Quizzes</p>
                        <p className="text-2xl font-bold text-purple-900">{userQuizzes.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <Eye className="w-8 h-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600">My Responses</p>
                        <p className="text-2xl font-bold text-green-900">{surveyResponses.length + quizResponses.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <Award className="w-8 h-8 text-orange-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-orange-600">Whitelisted</p>
                        <p className="text-2xl font-bold text-orange-900">{whitelistEntries.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Created Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Created Surveys */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Created Surveys</h2>
                      <Link
                        href="/create"
                        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Create
                      </Link>
                    </div>

                    {userSurveys.length === 0 ? (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No surveys created yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userSurveys.map((survey) => (
                          <div key={survey.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{survey.title}</h3>
                              <p className="text-sm text-gray-600">
                                {survey.response_count} responses • {new Date(survey.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Created Quizzes */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">Created Quizzes</h2>
                      <Link
                        href="/quiz/create"
                        className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Create
                      </Link>
                    </div>

                    {userQuizzes.length === 0 ? (
                      <div className="text-center py-8">
                        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No quizzes created yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {userQuizzes.map((quiz) => (
                          <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                              <p className="text-sm text-gray-600">
                                {quiz.minimum_score}% min • {quiz.total_points} pts • {new Date(quiz.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* My Responses */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Survey Responses */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">My Survey Responses</h2>

                    {surveyResponses.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No survey responses yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {surveyResponses.map((response) => (
                          <div key={response.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
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
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quiz Responses */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">My Quiz Responses</h2>

                    {quizResponses.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No quiz responses yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {quizResponses.map((response) => (
                          <div key={response.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{response.quiz_title}</h3>
                              <p className="text-sm text-gray-600">
                                {new Date(response.submitted_at).toLocaleDateString()}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {getScoreIcon(response.percentage)}
                                <span className={`text-sm font-bold ${getScoreColor(response.percentage)}`}>
                                  {response.percentage.toFixed(1)}%
                                </span>
                                {response.is_passed ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
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
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Whitelist Status */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {whitelistEntries.map((entry) => (
                        <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Unlock className="w-6 h-6 text-green-600" />
                            <div>
                              <h3 className="font-medium text-gray-900">{entry.quiz_title}</h3>
                              <p className="text-sm text-gray-600">
                                Whitelisted on {new Date(entry.whitelisted_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getScoreIcon(entry.percentage)}
                            <span className={`font-bold ${getScoreColor(entry.percentage)}`}>
                              {entry.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Link
                            href={`/whitelist/quiz/${entry.quiz_id}`}
                            className="mt-3 inline-block text-blue-600 hover:text-blue-700 text-sm"
                          >
                            View Whitelisted Surveys →
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'whitelist' && (
          <div className="space-y-6">
            {/* Whitelist Hub Header */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Unlock className="w-8 h-8 text-orange-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Whitelist Hub</h2>
                  <p className="text-gray-600">Access exclusive surveys by passing quizzes</p>
                </div>
              </div>
            </div>

            {/* Whitelist Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Whitelist Status</h3>

              {!connected ? (
                <div className="text-center py-8">
                  <Unlock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Connect your wallet to view whitelist status</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : whitelistEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Unlock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No whitelist entries yet</p>
                  <p className="text-sm text-gray-500">Complete quizzes to get whitelisted for exclusive surveys</p>
                  <Link
                    href="/#surveys"
                    className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Quizzes
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {whitelistEntries.map((entry) => (
                    <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Unlock className="w-6 h-6 text-green-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">{entry.quiz_title}</h4>
                          <p className="text-sm text-gray-600">
                            Whitelisted on {new Date(entry.whitelisted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-yellow-600" />
                        <span className={`font-bold ${entry.percentage >= 80 ? 'text-green-600' : entry.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {entry.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Link
                        href={`/whitelist/quiz/${entry.quiz_id}`}
                        className="inline-block w-full text-center bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
                      >
                        View Exclusive Surveys
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Whitelist Surveys */}
            {connected && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Whitelist Surveys</h3>
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Browse all available whitelist surveys</p>
                  <Link
                    href="/whitelist"
                    className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Browse All Whitelist Surveys
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Survey Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Survey</h3>
                  <p className="text-gray-600 mb-6">
                    Create a new survey with multiple choice, rating, and text input questions
                  </p>
                  <Link
                    href="/create"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Survey
                  </Link>
                </div>
              </div>

              {/* Create Quiz Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Quiz</h3>
                  <p className="text-gray-600 mb-6">
                    Create an interactive quiz with automatic grading and whitelist functionality
                  </p>
                  <Link
                    href="/quiz/create"
                    className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Quiz
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">For Surveys:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Use clear, concise questions</li>
                    <li>• Mix question types for variety</li>
                    <li>• Set appropriate response limits</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">For Quizzes:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Set reasonable time limits</li>
                    <li>• Include hints for difficult questions</li>
                    <li>• Use whitelisting for exclusive content</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
