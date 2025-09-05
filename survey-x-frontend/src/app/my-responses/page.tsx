'use client'

import { useState, useEffect } from 'react'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { SurveyService } from '@/lib/surveyService'
import { QuizService } from '@/lib/quizService'
import { supabase } from '@/lib/supabase'
import { BarChart3, Eye, CheckCircle, XCircle, Clock, Trophy, FileText, Brain, Users, Award } from 'lucide-react'
import Link from 'next/link'

interface UserResponse {
  id: string
  survey_id: string
  quiz_id?: string
  title: string
  type: 'survey' | 'quiz'
  responded_at: string
  score?: number
  max_score?: number
  percentage?: number
  is_graded?: boolean
  is_passed?: boolean
  whitelist_status?: 'whitelisted' | 'not_whitelisted' | 'pending'
}

interface CreatorResponse {
  id: string
  survey_id: string
  quiz_id?: string
  title: string
  type: 'survey' | 'quiz'
  total_responses: number
  my_responses: UserResponse[]
  all_responses: any[]
}

export default function MyResponsesPage() {
  const { publicKey, connected } = useWalletSafe()
  const [userResponses, setUserResponses] = useState<UserResponse[]>([])
  const [creatorResponses, setCreatorResponses] = useState<CreatorResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my_responses' | 'creator_view'>('my_responses')

  useEffect(() => {
    const loadResponses = async () => {
      if (!connected || !publicKey) return

      try {
        setLoading(true)
        
        // Load user's responses to surveys and quizzes
        await loadUserResponses()
        
        // Load responses to surveys/quizzes the user created
        await loadCreatorResponses()
        
      } catch (error) {
        console.error('Failed to load responses:', error)
      } finally {
        setLoading(false)
      }
    }

    loadResponses()
  }, [connected, publicKey])

  const loadUserResponses = async () => {
    try {
      const walletAddress = publicKey!.toString()
      
      // Get survey responses
      const { data: surveyResponses, error: surveyError } = await supabase
        .from('survey_responses')
        .select(`
          *,
          surveys!inner(
            survey_id,
            title,
            category
          )
        `)
        .eq('responder_wallet', walletAddress)
        .order('submitted_at', { ascending: false })

      if (surveyError) throw surveyError

      // Get quiz responses
      const { data: quizResponses, error: quizError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes!inner(
            id,
            title,
            total_points
          )
        `)
        .eq('participant_wallet', walletAddress)
        .order('created_at', { ascending: false })

      if (quizError) throw quizError

      // Get whitelist status for quizzes
      const quizIds = quizResponses?.map(q => q.quiz_id) || []
      const { data: whitelistEntries, error: whitelistError } = await supabase
        .from('whitelist')
        .select('quiz_id, is_active')
        .eq('wallet_address', walletAddress)
        .in('quiz_id', quizIds)

      if (whitelistError) throw whitelistError

      // Transform survey responses
      const transformedSurveyResponses: UserResponse[] = (surveyResponses || []).map(response => ({
        id: response.response_id,
        survey_id: response.survey_id,
        title: response.surveys.title,
        type: 'survey' as const,
        responded_at: response.submitted_at,
        whitelist_status: 'not_whitelisted' as const
      }))

      // Transform quiz responses
      const transformedQuizResponses: UserResponse[] = (quizResponses || []).map(attempt => {
        const whitelistEntry = whitelistEntries?.find(w => w.quiz_id === attempt.quiz_id)
        return {
          id: attempt.id,
          survey_id: attempt.quiz_id,
          quiz_id: attempt.quiz_id,
          title: attempt.quizzes.title,
          type: 'quiz' as const,
          responded_at: attempt.submitted_at || attempt.created_at,
          score: attempt.total_score,
          max_score: attempt.max_possible_score,
          percentage: attempt.percentage,
          is_graded: attempt.status === 'graded',
          is_passed: attempt.is_passed,
          whitelist_status: whitelistEntry?.is_active ? 'whitelisted' : 'not_whitelisted'
        }
      })

      setUserResponses([...transformedSurveyResponses, ...transformedQuizResponses])
      
    } catch (error) {
      console.error('Failed to load user responses:', error)
    }
  }

  const loadCreatorResponses = async () => {
    try {
      const walletAddress = publicKey!.toString()
      
      // Get surveys created by user
      const { data: mySurveys, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          survey_id,
          title,
          category,
          response_count
        `)
        .eq('creator_wallet', walletAddress)
        .eq('is_active', true)

      if (surveyError) throw surveyError

      // Get quizzes created by user
      const { data: myQuizzes, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          id,
          title,
          total_points,
          surveys!inner(
            survey_id,
            creator_wallet
          )
        `)
        .eq('surveys.creator_wallet', walletAddress)
        .eq('is_active', true)

      if (quizError) throw quizError

      // Get responses for each survey/quiz
      const creatorResponses: CreatorResponse[] = []

      for (const survey of mySurveys || []) {
        const { data: responses, error: responseError } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('survey_id', survey.survey_id)
          .order('submitted_at', { ascending: false })

        if (responseError) continue

        creatorResponses.push({
          id: survey.survey_id,
          survey_id: survey.survey_id,
          title: survey.title,
          type: 'survey',
          total_responses: survey.response_count || 0,
          my_responses: [],
          all_responses: responses || []
        })
      }

      for (const quiz of myQuizzes || []) {
        const { data: attempts, error: attemptError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quiz.id)
          .order('total_score', { ascending: false }) // Highest to lowest score

        if (attemptError) continue

        creatorResponses.push({
          id: quiz.id,
          survey_id: quiz.surveys?.[0]?.survey_id || quiz.id,
          quiz_id: quiz.id,
          title: quiz.title,
          type: 'quiz',
          total_responses: attempts?.length || 0,
          my_responses: [],
          all_responses: attempts || []
        })
      }

      setCreatorResponses(creatorResponses)
      
    } catch (error) {
      console.error('Failed to load creator responses:', error)
    }
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

  const getScoreColor = (percentage?: number) => {
    if (!percentage) return 'text-gray-500'
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getWhitelistStatusColor = (status?: string) => {
    switch (status) {
      case 'whitelisted': return 'text-green-600 bg-green-100'
      case 'not_whitelisted': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Responses</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view your survey and quiz responses</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your responses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Responses</h1>
          <p className="text-gray-600">View your survey and quiz responses, scores, and whitelist status</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Responses</p>
                <p className="text-2xl font-semibold text-gray-900">{userResponses.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quiz Responses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {userResponses.filter(r => r.type === 'quiz').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Whitelisted</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {userResponses.filter(r => r.whitelist_status === 'whitelisted').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Score</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {userResponses.filter(r => r.percentage).length > 0 
                    ? Math.round(userResponses.filter(r => r.percentage).reduce((sum, r) => sum + (r.percentage || 0), 0) / userResponses.filter(r => r.percentage).length)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my_responses')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my_responses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>My Responses ({userResponses.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('creator_view')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'creator_view'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Creator View ({creatorResponses.length})</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* My Responses Tab */}
        {activeTab === 'my_responses' && (
          <div className="space-y-4">
            {userResponses.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No responses yet</h3>
                <p className="text-gray-600 mb-4">Start taking surveys and quizzes to see your responses here</p>
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Browse Surveys
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userResponses.map((response) => (
                  <div key={response.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{response.title}</h3>
                          {response.type === 'quiz' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              QUIZ
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Responded {formatDate(response.responded_at)}
                        </p>
                        
                        {/* Score Display */}
                        {response.type === 'quiz' && response.score !== undefined && (
                          <div className="flex items-center gap-4 text-sm mb-2">
                            <span className={`font-medium ${getScoreColor(response.percentage)}`}>
                              Score: {response.score}/{response.max_score} ({response.percentage}%)
                            </span>
                            {response.is_passed ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Passed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" />
                                Failed
                              </span>
                            )}
                          </div>
                        )}

                        {/* Grading Status */}
                        {response.type === 'quiz' && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            {response.is_graded ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Graded
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Clock className="w-4 h-4" />
                                Pending
                              </span>
                            )}
                          </div>
                        )}

                        {/* Whitelist Status */}
                        {response.type === 'quiz' && (
                          <div className="mb-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getWhitelistStatusColor(response.whitelist_status)}`}>
                              {response.whitelist_status === 'whitelisted' ? '✅ Whitelisted' : '❌ Not Whitelisted'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link
                        href={response.type === 'quiz' ? `/quiz/${response.quiz_id}/results` : `/surveys/${response.survey_id}`}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Creator View Tab */}
        {activeTab === 'creator_view' && (
          <div className="space-y-6">
            {creatorResponses.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No created content yet</h3>
                <p className="text-gray-600 mb-4">Create surveys and quizzes to see responses here</p>
                <div className="flex justify-center gap-4">
                  <Link
                    href="/create"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Survey
                  </Link>
                  <Link
                    href="/quiz/create"
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Create Quiz
                  </Link>
                </div>
              </div>
            ) : (
              creatorResponses.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                        {item.type === 'quiz' && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            QUIZ
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {item.total_responses} total responses
                      </p>
                    </div>
                  </div>

                  {/* Responses List */}
                  {item.all_responses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No responses yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Responses {item.type === 'quiz' ? '(Sorted by Score - Highest to Lowest)' : '(Most Recent First)'}
                      </h4>
                      {item.all_responses.map((response, index) => (
                        <div key={response.id || response.response_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.type === 'quiz' ? 'Participant' : 'Respondent'} {index + 1}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(response.submitted_at || response.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {item.type === 'quiz' && (
                              <>
                                <span className={`text-sm font-medium ${getScoreColor(response.percentage)}`}>
                                  {response.total_score}/{response.max_possible_score} ({response.percentage}%)
                                </span>
                                {response.is_passed ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                    Passed
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                    Failed
                                  </span>
                                )}
                              </>
                            )}
                            <Link
                              href={item.type === 'quiz' ? `/quiz/${item.quiz_id}/manage` : `/surveys/${item.survey_id}/responses`}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
