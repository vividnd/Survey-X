'use client'

import { useState, useEffect } from 'react'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { Search, Plus, TrendingUp, Users, Shield, Zap, AlertCircle, Trash2, Trophy, Award, Filter, ArrowUpDown, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Survey } from '@/lib/supabase'

export default function HomePage() {
  const { publicKey, connected } = useWalletSafe()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [deletingSurvey, setDeletingSurvey] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [responseFilter, setResponseFilter] = useState('all')
  const [creatorFilter, setCreatorFilter] = useState('all')

  const categories = [
    'all', 'technology', 'health', 'education', 'entertainment',
    'business', 'sports', 'politics', 'science', 'lifestyle', 'quiz'
  ]

  const surveysPerPage = 12
  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'responses', label: 'Most Responses' },
    { value: 'questions', label: 'Most Questions' }
  ]

  const responseFilterOptions = [
    { value: 'all', label: 'All Surveys' },
    { value: 'active', label: 'Active (Last 7 days)' },
    { value: '0-10', label: '0-10 responses' },
    { value: '10-50', label: '10-50 responses' },
    { value: '50+', label: '50+ responses' }
  ]

  useEffect(() => {
    // Delay survey fetching to avoid immediate errors
    const timer = setTimeout(() => {
      fetchSurveys()
    }, 1000)
    return () => clearTimeout(timer)
  }, [selectedCategory, searchTerm, sortBy, responseFilter, creatorFilter])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, searchTerm, sortBy, responseFilter, creatorFilter])

  const fetchSurveys = async () => {
    try {
      setError('')
      let query = supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)

      // Apply filters
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Apply response count filter
      if (responseFilter !== 'all') {
        switch (responseFilter) {
          case 'active':
            // Show surveys with activity in last 7 days (simplified - just recent surveys)
            query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            break
          case '0-10':
            query = query.lte('response_count', 10)
            break
          case '10-50':
            query = query.gte('response_count', 10).lte('response_count', 50)
            break
          case '50+':
            query = query.gte('response_count', 50)
            break
        }
      }

      // Apply creator filter
      if (creatorFilter === 'mine' && publicKey) {
        query = query.eq('creator_wallet', publicKey.toString())
      } else if (creatorFilter === 'others' && publicKey) {
        query = query.neq('creator_wallet', publicKey.toString())
      }

      // Apply sorting
      switch (sortBy) {
        case 'recent':
          query = query.order('created_at', { ascending: false })
          break
        case 'popular':
          query = query.order('response_count', { ascending: false })
          break
        case 'responses':
          query = query.order('response_count', { ascending: false })
          break
        case 'questions':
          query = query.order('question_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Get more surveys for client-side pagination
      query = query.limit(100)

      const { data, error } = await query

      if (error) {
        console.error('Supabase error:', error)
        setError(`Failed to load surveys: ${error.message}`)
        return
      }

      setSurveys(data || [])
    } catch (error: any) {
      console.error('Error fetching surveys:', error)
      setError(`Failed to load surveys: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering and pagination
  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = searchTerm === '' ||
      survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.hashtags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || survey.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredSurveys.length / surveysPerPage)
  const startIndex = (currentPage - 1) * surveysPerPage
  const endIndex = startIndex + surveysPerPage
  const paginatedSurveys = filteredSurveys.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteSurvey = async (surveyId: string) => {
    if (!publicKey) {
      setError('Please connect your wallet to delete surveys')
      return
    }

    if (!confirm('Are you sure you want to delete this survey? This action cannot be undone.')) {
      return
    }

    setDeletingSurvey(surveyId)
    try {
      // First, get the survey to verify ownership
      const { data: survey, error: fetchError } = await supabase
        .from('surveys')
        .select('creator_wallet')
        .eq('survey_id', surveyId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch survey: ${fetchError.message}`)
      }

      if (survey.creator_wallet !== publicKey.toString()) {
        throw new Error('You can only delete surveys you created')
      }

      // Delete the survey
      const { error: deleteError } = await supabase
        .from('surveys')
        .delete()
        .eq('survey_id', surveyId)

      if (deleteError) {
        throw new Error(`Failed to delete survey: ${deleteError.message}`)
      }

      // Remove from local state
      setSurveys(prev => prev.filter(s => s.survey_id !== surveyId))
      setError('')
    } catch (error: any) {
      console.error('Error deleting survey:', error)
      setError(error.message)
    } finally {
      setDeletingSurvey(null)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6">
            Private Surveys on Solana
          </h1>
          <p className="text-xl sm:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            Create and respond to encrypted surveys with privacy-preserving MPC technology powered by Arcium
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {connected ? (
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/create"
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Survey
                  </Link>
                  <Link
                    href="/quiz/create"
                    className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center gap-2"
                  >
                    <Trophy className="w-5 h-5" />
                    Create Quiz
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/dashboard"
                    className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors flex items-center gap-2 cursor-pointer z-10 relative"
                    onClick={(e) => {
                      console.log('Dashboard button clicked!');
                      // Let the default navigation happen
                    }}
                  >
                    <Award className="w-5 h-5" />
                    Dashboard
                  </Link>
                  <Link
                    href="/#surveys"
                    className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    Browse Surveys
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/dashboard"
                    className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors flex items-center gap-2 cursor-pointer z-10 relative"
                    onClick={(e) => {
                      console.log('Dashboard button clicked!');
                      // Let the default navigation happen
                    }}
                  >
                    <Award className="w-5 h-5" />
                    Dashboard
                  </Link>
                  <Link
                    href="/#surveys"
                    className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    Browse Surveys
                  </Link>
                </div>
                <div className="bg-white p-2 rounded-lg">
                  <WalletButtonWrapper className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-0" />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Survey-X?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the future of survey taking with privacy-preserving technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
              <p className="text-gray-600">
                Your responses are encrypted and processed using MPC technology. No one can see your answers.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <Zap className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Fast & Secure</h3>
              <p className="text-gray-600">
                Powered by Arcium's confidential computing on Solana for lightning-fast, secure processing.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Rich Analytics</h3>
              <p className="text-gray-600">
                Get detailed insights from survey responses while maintaining complete privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <section className="py-8 bg-red-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </section>
      )}

      {/* Recent Surveys Section */}
      <section id="surveys" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Recent Surveys</h2>
            <p className="text-lg text-gray-600">Discover what people are asking</p>
          </div>

          {/* Enhanced Search and Filter */}
          <div className="mb-8 space-y-4">
            {/* Main Search and Sort Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search surveys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white flex items-center gap-2 ${
                    showFilters ? 'bg-purple-50 border-purple-300' : ''
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Response Count</label>
                    <select
                      value={responseFilter}
                      onChange={(e) => setResponseFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                    >
                      {responseFilterOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {connected && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Creator</label>
                      <select
                        value={creatorFilter}
                        onChange={(e) => setCreatorFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
                      >
                        <option value="all">All Creators</option>
                        <option value="mine">My Surveys</option>
                        <option value="others">Others' Surveys</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredSurveys.length)} of {filteredSurveys.length} surveys
              </span>
              {filteredSurveys.length > 0 && (
                <span>
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
          </div>

          {/* Survey Cards */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading surveys...</p>
            </div>
          ) : filteredSurveys.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No surveys found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Be the first to create a survey!'}
              </p>
              {connected && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/create"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Survey
                  </Link>
                  <Link
                    href="/quiz/create"
                    className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    Create Quiz
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedSurveys.map((survey) => (
                <div key={survey.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        survey.category === 'quiz' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {survey.category === 'quiz' ? '🧠 QUIZ' : survey.category}
                      </span>
                      {survey.category === 'quiz' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          Interactive
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {survey.response_count} responses
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {survey.title}
                  </h3>

                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {survey.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {survey.hashtags?.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {survey.question_count} questions
                    </span>
                    <div className="flex items-center gap-2">
                      {connected && publicKey && survey.creator_wallet === publicKey.toString() && (
                        <>
                          <Link
                            href={`/surveys/${survey.survey_id}/responses`}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                            title="View responses"
                          >
                            <Users className="w-4 h-4 inline mr-1" />
                            Responses ({survey.response_count || 0})
                          </Link>
                          <button
                            onClick={() => deleteSurvey(survey.survey_id)}
                            disabled={deletingSurvey === survey.survey_id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete survey"
                          >
                            {deletingSurvey === survey.survey_id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                      <Link
                        href={survey.category === 'quiz' ? `/surveys/${survey.survey_id}` : `/surveys/${survey.survey_id}`}
                        className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium ${
                          survey.category === 'quiz'
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {survey.category === 'quiz' ? 'Take Quiz' : 'Take Survey'}
                      </Link>
                    </div>
                  </div>
                </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center">
                  <nav className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}