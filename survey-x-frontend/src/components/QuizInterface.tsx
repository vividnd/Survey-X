'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, Trophy, AlertCircle, BarChart3 } from 'lucide-react'
import { QuizService, Quiz, QuizQuestion, QuizAttempt, QuizResponse } from '@/lib/quizService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { useMobile } from '@/hooks/useMobile'

interface QuizInterfaceProps {
  quiz: Quiz
  questions: QuizQuestion[]
  onComplete: (attempt: QuizAttempt) => void
}

export default function QuizInterface({ quiz, questions, onComplete }: QuizInterfaceProps) {
  const { publicKey } = useWalletSafe()
  const isMobile = useMobile()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [availabilityTimeRemaining, setAvailabilityTimeRemaining] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasExistingAttempts, setHasExistingAttempts] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const isFirstQuestion = currentQuestionIndex === 0

  // Early return if no questions or current question is undefined
  if (!questions.length || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Questions Available</h2>
          <p className="text-gray-600">This quiz has no questions to display.</p>
        </div>
      </div>
    )
  }

  // Initialize quiz attempt
  useEffect(() => {
    const initializeAttempt = async () => {
      if (!publicKey) return

      try {
        // Check if quiz is still accepting responses
        const isAcceptingResponses = await QuizService.isQuizAcceptingResponses(quiz.id)
        if (!isAcceptingResponses) {
          setError('This quiz is no longer accepting responses. The time limit has expired.')
          return
        }

        // Check if user has existing attempts
        const existingAttempts = await QuizService.getUserQuizAttempts(quiz.id, publicKey.toString())
        
        // Set flag for showing results button
        setHasExistingAttempts(existingAttempts.length > 0)
        
        // Filter out completed attempts to check if user can retake
        const completedAttempts = existingAttempts.filter(attempt => attempt.status === 'submitted')
        
        if (completedAttempts.length >= quiz.max_attempts) {
          setError(`You have reached the maximum number of attempts (${quiz.max_attempts}). You cannot retake this quiz.`)
          return
        }

        // Check if there's an in-progress attempt
        const inProgressAttempt = existingAttempts.find(attempt => attempt.status === 'in_progress')
        
        if (inProgressAttempt) {
          // Resume existing attempt
          setAttempt(inProgressAttempt)
          
          // Set time limit if specified
          if (quiz.time_limit_minutes) {
            const timeElapsed = Math.floor((Date.now() - new Date(inProgressAttempt.started_at).getTime()) / 1000)
            const remainingTime = (quiz.time_limit_minutes * 60) - timeElapsed
            setTimeRemaining(Math.max(0, remainingTime))
          }
        } else {
          // Create new attempt
          const newAttempt = await QuizService.createQuizAttempt({
            quiz_id: quiz.id,
            participant_wallet: publicKey.toString(),
            attempt_number: existingAttempts.length + 1,
            max_possible_score: questions.reduce((sum, q) => sum + (q.points || 1.0), 0)
          })

          setAttempt(newAttempt)

          // Set time limit if specified
          if (quiz.time_limit_minutes) {
            setTimeRemaining(quiz.time_limit_minutes * 60)
          }
        }

        // Set availability timer if specified
        if (quiz.availability_ends_at) {
          const endTime = new Date(quiz.availability_ends_at).getTime()
          const now = Date.now()
          const remainingTime = Math.max(0, Math.floor((endTime - now) / 1000))
          setAvailabilityTimeRemaining(remainingTime)
        }
      } catch (err) {
        setError('Failed to initialize quiz attempt')
        console.error(err)
      }
    }

    initializeAttempt()
  }, [quiz.id, quiz.max_attempts, quiz.time_limit_minutes, quiz.availability_ends_at, publicKey, questions])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleSubmitQuiz()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  // Availability timer countdown
  useEffect(() => {
    if (availabilityTimeRemaining === null || availabilityTimeRemaining <= 0) return

    const timer = setInterval(() => {
      setAvailabilityTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          setError('This quiz is no longer accepting responses. The time limit has expired.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [availabilityTimeRemaining])

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmitQuiz = async () => {
    if (!attempt || !publicKey) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Create wallet interface for transaction signing
      const walletInterface = {
        publicKey,
        signTransaction: async (transaction: any) => {
          if (!window.solana?.signTransaction) {
            throw new Error('Phantom wallet not found')
          }
          return await window.solana.signTransaction(transaction)
        },
        signAllTransactions: async (transactions: any[]) => {
          if (!window.solana?.signAllTransactions) {
            throw new Error('Phantom wallet not found')
          }
          return await window.solana.signAllTransactions(transactions)
        }
      }

      // Create SurveyService instance for transaction signing
      const { SurveyService } = await import('@/lib/surveyService')
      const surveyService = new SurveyService(walletInterface)

      // Submit quiz responses with transaction signing
      const responsesArray = Object.entries(responses).map(([questionId, responseData]) => ({
        question_id: questionId.startsWith('fallback-') 
          ? questionId.replace('fallback-', '') 
          : questionId,
        response: responseData
      }))

      // Submit to the underlying survey with transaction signing
      const result = await surveyService.submitResponse(quiz.survey_id, responsesArray)

      // Now submit quiz-specific data (grading, scoring, etc.)
      for (const [questionId, responseData] of Object.entries(responses)) {
        const question = questions.find(q => q.id === questionId)
        if (!question) continue

        let isCorrect = false
        let pointsAwarded = 0

        // Auto-grade MCQ questions (only if it's not a fallback question)
        if (question.question_type === 'multiple_choice' && !questionId.startsWith('fallback-')) {
          const grading = await QuizService.autoGradeMCQResponse(questionId, responseData)
          isCorrect = grading.isCorrect
          pointsAwarded = grading.points
        } else {
          // For fallback questions, give default points
          pointsAwarded = question.points || 1.0
        }

        // For fallback questions, use the survey question ID
        const actualQuestionId = questionId.startsWith('fallback-') 
          ? questionId.replace('fallback-', '') 
          : questionId

        await QuizService.submitQuizResponse({
          attempt_id: attempt.id,
          question_id: actualQuestionId,
          response_data: responseData,
          is_correct: question.question_type === 'multiple_choice' && !questionId.startsWith('fallback-') ? isCorrect : undefined,
          points_awarded: pointsAwarded,
          is_graded: question.question_type === 'multiple_choice' && !questionId.startsWith('fallback-')
        })
      }

      // Submit the attempt
      const completedAttempt = await QuizService.submitQuizAttempt(attempt.id)
      setAttempt(completedAttempt)
      onComplete(completedAttempt)
    } catch (err: any) {
      console.error('Quiz submission error:', err)
      if (err.message?.includes('User rejected') || err.message?.includes('cancelled')) {
        setError('Transaction was cancelled. Please try again and approve the transaction.')
      } else if (err.message?.includes('insufficient') || err.message?.includes('balance')) {
        setError('Insufficient SOL balance. You need at least 0.0005 SOL to submit a response.')
      } else if (err.message?.includes('Phantom') || err.message?.includes('wallet')) {
        setError('Phantom wallet error. Please make sure Phantom is connected and unlocked.')
      } else {
        setError(err.message || 'Failed to submit quiz. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getCurrentResponse = () => {
    return responses[currentQuestion.id] || ''
  }

  const isCurrentQuestionAnswered = () => {
    const response = getCurrentResponse()
    if (currentQuestion.question_type === 'multiple_choice') {
      return response && response.trim() !== ''
    } else if (currentQuestion.question_type === 'rating') {
      return response && response > 0
    } else {
      return response && response.trim() !== ''
    }
  }

  const renderQuestion = () => {
    const response = getCurrentResponse()

    switch (currentQuestion.question_type) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => handleResponseChange(currentQuestion.id, option)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  response === option
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    response === option
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {response === option && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-medium">{option}</span>
                </div>
              </button>
            ))}
          </div>
        )

      case 'rating':
        return (
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleResponseChange(currentQuestion.id, rating)}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all ${
                    response >= rating
                      ? 'border-yellow-500 bg-yellow-500 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-yellow-400'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>
        )

      case 'text_input':
        return (
          <div>
            <textarea
              value={response}
              onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg resize-none focus:border-blue-500 focus:ring-0 text-base"
              rows={4}
            />
            <p className="text-sm text-gray-500 mt-2">
              This question will be manually graded by the quiz creator.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            {error.includes('maximum number of attempts') && (
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing quiz...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{quiz.title}</h1>
            <p className="text-sm text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center space-x-4">
            {hasExistingAttempts && (
              <button
                onClick={() => window.location.href = `/quiz/${quiz.id}/results`}
                className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">View Results</span>
              </button>
            )}
            {availabilityTimeRemaining !== null && (
              <div className="flex items-center space-x-2 text-orange-600">
                <Clock className="w-5 h-5" />
                <span className="font-mono text-sm">Quiz closes in: {formatTime(availabilityTimeRemaining)}</span>
              </div>
            )}
            {timeRemaining !== null && (
              <div className="flex items-center space-x-2 text-red-600">
                <Clock className="w-5 h-5" />
                <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question Content */}
      <div className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex-1">
                {currentQuestion.question_text}
              </h2>
              <div className="ml-4 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium text-gray-600">
                  {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            {currentQuestion.required && (
              <p className="text-sm text-red-600 mb-4">* Required</p>
            )}

            {/* Optional explanation/hint */}
            {currentQuestion.explanation && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Hint:</strong> {currentQuestion.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {renderQuestion()}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 ${isMobile ? 'pb-6' : ''}`}>
        <div className="max-w-2xl mx-auto flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              isFirstQuestion
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={!isCurrentQuestionAnswered() || isSubmitting}
              className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${
                !isCurrentQuestionAnswered() || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Quiz
                  <CheckCircle className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered()}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                !isCurrentQuestionAnswered()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Question Navigation Dots */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-blue-600'
                  : index < currentQuestionIndex
                  ? 'bg-green-500'
                  : responses[questions[index].id]
                  ? 'bg-yellow-500'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
