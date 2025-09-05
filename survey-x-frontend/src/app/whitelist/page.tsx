'use client'

import { useState, useEffect } from 'react'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { QuizService, WhitelistEntry, SpecialSurvey } from '@/lib/quizService'
import { supabase } from '@/lib/supabase'
import { Award, Lock, Unlock, ExternalLink, Share2, Copy, CheckCircle, Users, Trophy } from 'lucide-react'
import Link from 'next/link'

interface WhitelistedQuiz {
  quiz_id: string
  quiz_title: string
  score: number
  percentage: number
  whitelisted_at: string
  special_surveys: SpecialSurvey[]
}

export default function WhitelistPage() {
  const { publicKey, connected } = useWalletSafe()
  const [whitelistedQuizzes, setWhitelistedQuizzes] = useState<WhitelistedQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  useEffect(() => {
    const loadWhitelistData = async () => {
      if (!connected || !publicKey) return

      try {
        setLoading(true)
        
        // Get all whitelist entries for this user
        const { data: whitelistEntries, error } = await supabase
          .from('whitelist')
          .select(`
            *,
            quizzes!inner(
              id,
              title,
              surveys!inner(
                survey_id,
                title
              )
            )
          `)
          .eq('wallet_address', publicKey.toString())
          .eq('is_active', true)
          .order('whitelisted_at', { ascending: false })

        if (error) throw error

        // Get special surveys for each whitelisted quiz
        const whitelistedQuizzesData: WhitelistedQuiz[] = []
        
        for (const entry of whitelistEntries || []) {
          const specialSurveys = await QuizService.getSpecialSurveys(entry.quiz_id)
          
          whitelistedQuizzesData.push({
            quiz_id: entry.quiz_id,
            quiz_title: entry.quizzes.title,
            score: entry.score,
            percentage: entry.percentage,
            whitelisted_at: entry.whitelisted_at,
            special_surveys: specialSurveys
          })
        }

        setWhitelistedQuizzes(whitelistedQuizzesData)
      } catch (error) {
        console.error('Failed to load whitelist data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWhitelistData()
  }, [connected, publicKey])

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedLink(type)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareWhitelistLink = (quizId: string) => {
    const link = `${window.location.origin}/whitelist/quiz/${quizId}`
    copyToClipboard(link, `quiz-${quizId}`)
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Whitelist Access</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to view your whitelisted surveys</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your whitelist access...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Whitelist Access</h1>
          <p className="text-lg text-gray-600">
            Exclusive surveys and content you've unlocked by passing quizzes
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quizzes Passed</p>
                <p className="text-2xl font-semibold text-gray-900">{whitelistedQuizzes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Unlock className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Special Surveys</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {whitelistedQuizzes.reduce((sum, quiz) => sum + quiz.special_surveys.length, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Score</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {whitelistedQuizzes.length > 0 
                    ? Math.round(whitelistedQuizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) / whitelistedQuizzes.length)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Whitelisted Quizzes */}
        {whitelistedQuizzes.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Whitelist Access Yet</h3>
            <p className="text-gray-600 mb-4">Take and pass quizzes to unlock exclusive surveys</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Browse Quizzes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {whitelistedQuizzes.map((quiz) => (
              <div key={quiz.quiz_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{quiz.quiz_title}</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ✅ Whitelisted
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        Score: {quiz.percentage.toFixed(1)}%
                      </span>
                      <span>
                        Whitelisted: {new Date(quiz.whitelisted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => shareWhitelistLink(quiz.quiz_id)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    {copiedLink === `quiz-${quiz.quiz_id}` ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        Share Access
                      </>
                    )}
                  </button>
                </div>

                {/* Special Surveys */}
                {quiz.special_surveys.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No special surveys available for this quiz yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 mb-3">Exclusive Surveys:</h4>
                    {quiz.special_surveys.map((survey) => (
                      <div key={survey.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h5 className="font-medium text-gray-900">{survey.title}</h5>
                          {survey.description && (
                            <p className="text-sm text-gray-600">{survey.description}</p>
                          )}
                        </div>
                        <Link
                          href={`/surveys/${survey.survey_id}`}
                          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Take Survey
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Share Section */}
        {whitelistedQuizzes.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Share2 className="w-6 h-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Share Your Access</h3>
                <p className="text-blue-700 mb-4">
                  You can share links to whitelist pages so others can see what surveys are available 
                  (though they'll need to pass the quiz themselves to access them).
                </p>
                <div className="flex flex-wrap gap-2">
                  {whitelistedQuizzes.map((quiz) => (
                    <button
                      key={quiz.quiz_id}
                      onClick={() => shareWhitelistLink(quiz.quiz_id)}
                      className="flex items-center gap-2 px-3 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      {copiedLink === `quiz-${quiz.quiz_id}` ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {quiz.quiz_title}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
