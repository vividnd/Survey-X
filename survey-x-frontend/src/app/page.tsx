'use client'

import { useState, useEffect } from 'react'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { Search, Plus, TrendingUp, Users, Shield, Zap, AlertCircle, Trash2 } from 'lucide-react'
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

  const categories = [
    'all', 'technology', 'health', 'education', 'entertainment',
    'business', 'sports', 'politics', 'science', 'lifestyle'
  ]

  useEffect(() => {
    // Delay survey fetching to avoid immediate errors
    const timer = setTimeout(() => {
      fetchSurveys()
    }, 1000)
    return () => clearTimeout(timer)
  }, [selectedCategory, searchTerm])

  const fetchSurveys = async () => {
    try {
      setError('')
      let query = supabase
        .from('surveys')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

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

  const filteredSurveys = surveys.filter(survey => {
    const matchesSearch = searchTerm === '' ||
      survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      survey.hashtags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || survey.category === selectedCategory

    return matchesSearch && matchesCategory
  })

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
                <Link
                  href="/create"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Survey
                </Link>
                <Link
                  href="/#surveys"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                >
                  Browse Surveys
                </Link>
              </>
            ) : (
              <div className="bg-white p-2 rounded-lg">
                <WalletButtonWrapper className="!bg-blue-600 hover:!bg-blue-700 !text-white !border-0" />
              </div>
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

          {/* Search and Filter */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
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

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 bg-white"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
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
                <Link
                  href="/create"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Survey
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSurveys.map((survey) => (
                <div key={survey.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {survey.category}
                    </span>
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
                      )}
                      <Link
                        href={`/surveys/${survey.survey_id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Take Survey
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}