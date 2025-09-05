'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import QuizInterface from '@/components/QuizInterface'
import QuizResults from '@/components/QuizResults'
import { QuizService, Quiz, QuizQuestion, QuizAttempt } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function QuizPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [userAttempts, setUserAttempts] = useState<QuizAttempt[]>([])
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreator, setIsCreator] = useState(false)

  useEffect(() => {
    const loadQuiz = async () => {
      if (!connected || !publicKey) {
        console.log('🔍 Quiz page - Wallet not ready')
        return
      }

      try {
        console.log('🔍 Loading quiz with ID:', quizId)
        console.log('🔍 Current wallet state: connected')

        // Load quiz details
        console.log('🔍 Calling QuizService.getQuiz...')
        let quizData = await QuizService.getQuiz(quizId)

        // If quiz not found, check if this is actually a survey ID that has a quiz
        if (!quizData) {
          console.log('🔍 Quiz not found, checking if this is a survey ID with a quiz...')
          try {
            // Check if there's a quiz associated with this survey
            const { data: associatedQuiz } = await supabase
              .from('quizzes')
              .select('*')
              .eq('survey_id', quizId)
              .eq('is_active', true)
              .single()

            if (associatedQuiz) {
              console.log('✅ Found associated quiz, redirecting...')
              router.push(`/quiz/${associatedQuiz.id}`)
              return
            }
          } catch (fallbackError) {
            console.log('🔍 No associated quiz found for survey ID')
          }

          console.error('🚨 Quiz not found in database')
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)
        console.log('✅ Quiz data loaded:', {
          id: quizData.id,
          title: quizData.title,
          creator_wallet: quizData.creator_wallet,
          is_active: quizData.is_active,
          survey_id: quizData.survey_id
        })

        // Load quiz questions
        console.log('🔍 Loading quiz questions...')
        const questionsData = await QuizService.getQuizQuestions(quizId)
        console.log('✅ Quiz questions loaded:', {
          count: questionsData.length,
          questions: questionsData
        })
        setQuestions(questionsData)

        // Check if user is the creator with stable wallet state
        console.log('🔍 Preparing quiz creator check...')

        // Wait for wallet state to stabilize
        await new Promise(resolve => setTimeout(resolve, 500))

        // Double-check wallet state
        const stablePublicKey = publicKey?.toString()
        const stableConnected = connected

        console.log('🔍 Stable wallet check for creator')

        if (!stablePublicKey || !stableConnected) {
          console.log('❌ No stable wallet for creator check')
          setIsCreator(false)
        } else {
          const quizCreatorWallet = quizData.creator_wallet
          const isUserCreator = quizCreatorWallet && quizCreatorWallet.length === 44 && quizCreatorWallet === stablePublicKey
          setIsCreator(Boolean(isUserCreator))

          console.log('🔍 Final quiz creator check:', {
            isCreator: isUserCreator,
            walletMatch: quizCreatorWallet === stablePublicKey,
            walletLength: quizCreatorWallet?.length
          })

          if (!isUserCreator) {
            console.log('⚠️ User is not the quiz creator')
          }
        }

        // Load user attempts
        const attempts = await QuizService.getUserQuizAttempts(quizId, publicKey.toString())
        setUserAttempts(attempts)

        // Check if user has reached max attempts (only for non-creators)
        if (!isCreator && attempts.length >= quizData.max_attempts) {
          setError(`You have reached the maximum number of attempts (${quizData.max_attempts})`)
          return
        }

        // Check if user has an in-progress attempt
        const inProgressAttempt = attempts.find(a => a.status === 'in_progress')
        if (inProgressAttempt) {
          setCurrentAttempt(inProgressAttempt)
        }
      } catch (err) {
        setError('Failed to load quiz')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [quizId, connected, publicKey])

  // Additional effect to retry loading when wallet becomes available
  useEffect(() => {
    if (connected && publicKey && !quiz && !loading && !error) {
      console.log('🔄 Retrying quiz load')
      const retryLoad = async () => {
        try {
          setLoading(true)
          setError(null)
          
          const quizData = await QuizService.getQuiz(quizId)
          if (!quizData) {
            setError('Quiz not found')
            return
          }
          setQuiz(quizData)
          console.log('Quiz data loaded (retry):', quizData)

          const questionsData = await QuizService.getQuizQuestions(quizId)
          console.log('Quiz questions loaded (retry):', questionsData)
          setQuestions(questionsData)

          const isUserCreator = quizData.creator_wallet === publicKey.toString()
          setIsCreator(isUserCreator)
          console.log('Creator check (retry):', {
            isCreator: isUserCreator,
            walletMatch: quizData.creator_wallet === publicKey.toString()
          })

          const attempts = await QuizService.getUserQuizAttempts(quizId, publicKey.toString())
          setUserAttempts(attempts)

          if (!isUserCreator && attempts.length >= quizData.max_attempts) {
            setError(`You have reached the maximum number of attempts (${quizData.max_attempts})`)
            return
          }

          const inProgressAttempt = attempts.find(a => a.status === 'in_progress')
          if (inProgressAttempt) {
            setCurrentAttempt(inProgressAttempt)
          }
        } catch (err) {
          setError('Failed to load quiz')
          console.error(err)
        } finally {
          setLoading(false)
        }
      }
      
      retryLoad()
    }
  }, [connected, publicKey, quiz, loading, error, quizId])

  const handleQuizComplete = (attempt: QuizAttempt) => {
    setCurrentAttempt(attempt)
  }

  const handleRetakeQuiz = () => {
    setCurrentAttempt(null)
    setError(null)
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Take Quiz</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to participate in quizzes</p>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            {userAttempts.length > 0 && (
              <button
                onClick={() => setCurrentAttempt(userAttempts[0])}
                className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                View Previous Results
              </button>
            )}
          </div>
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

  // Show results if quiz is completed
  if (currentAttempt && currentAttempt.status === 'submitted') {
    return (
      <QuizResults
        attempt={currentAttempt}
        quizId={quizId}
        onRetake={userAttempts.length < quiz.max_attempts ? handleRetakeQuiz : undefined}
        isCreator={isCreator}
      />
    )
  }

  // Show quiz interface
  return (
    <QuizInterface
      quiz={quiz}
      questions={questions}
      onComplete={handleQuizComplete}
    />
  )
}
