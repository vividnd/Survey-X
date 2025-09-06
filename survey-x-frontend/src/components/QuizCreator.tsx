'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Save, AlertCircle, CheckCircle, Clock, Trophy, Settings } from 'lucide-react'
import { QuizService, Quiz, QuizQuestion } from '@/lib/quizService'
import { SurveyService } from '@/lib/surveyService'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { useRouter } from 'next/navigation'

interface QuizCreatorProps {
  onQuizCreated?: (quiz: Quiz) => void
}

export default function QuizCreator({ onQuizCreated }: QuizCreatorProps) {
  const { publicKey, connected } = useWalletSafe()
  const router = useRouter()
  
  const [quiz, setQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    minimum_score: 70,
    total_points: 0,
    time_limit_minutes: undefined,
    max_attempts: 1,
    availability_duration_minutes: undefined,
    is_active: true
  })
  
  const [questions, setQuestions] = useState<Partial<QuizQuestion>[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Calculate total points whenever questions change
  useEffect(() => {
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
    setQuiz(prev => ({ ...prev, total_points: totalPoints }))
  }, [questions])

  const addQuestion = () => {
    const newQuestion: Partial<QuizQuestion> = {
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      required: true,
      points: 1,
      correct_answer: '',
      explanation: ''
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }
    setQuestions(updatedQuestions)
  }

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index)
    setQuestions(updatedQuestions)
  }

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions]
    const question = updatedQuestions[questionIndex]
    if (question.options) {
      question.options = [...question.options, '']
      setQuestions(updatedQuestions)
    }
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions]
    const question = updatedQuestions[questionIndex]
    if (question.options) {
      question.options[optionIndex] = value
      setQuestions(updatedQuestions)
    }
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions]
    const question = updatedQuestions[questionIndex]
    if (question.options && question.options.length > 2) {
      question.options = question.options.filter((_, i) => i !== optionIndex)
      setQuestions(updatedQuestions)
    }
  }

  const handleCreateQuiz = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet first')
      return
    }

    if (!quiz.title?.trim()) {
      setError('Quiz title is required')
      return
    }

    if (!quiz.minimum_score || quiz.minimum_score < 0 || quiz.minimum_score > 100) {
      setError('Minimum score must be between 0 and 100')
      return
    }

    if (!quiz.max_attempts || quiz.max_attempts < 1) {
      setError('Max attempts must be at least 1')
      return
    }

    if (questions.length === 0) {
      setError('At least one question is required')
      return
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.question_text?.trim()) {
        setError(`Question ${i + 1} text is required`)
        return
      }
      if (question.question_type === 'multiple_choice') {
        if (!question.options || question.options.some(opt => !opt.trim())) {
          setError(`Question ${i + 1} must have all options filled`)
          return
        }
        if (!question.correct_answer?.trim()) {
          setError(`Question ${i + 1} must have a correct answer`)
          return
        }
      }
      if (!question.points || question.points <= 0) {
        setError(`Question ${i + 1} must have points greater than 0`)
        return
      }
    }

    setIsCreating(true)
    setError(null)

    try {
      // Create wallet interface for SurveyService
      const walletInterface = {
        publicKey: publicKey,
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

      // Create SurveyService instance
      const surveyService = new SurveyService(walletInterface)

      // Create survey first
      const surveyResult = await surveyService.createSurvey({
        title: quiz.title!,
        description: quiz.description || '',
        questions: questions.map(q => ({
          question_text: q.question_text!,
          question_type: q.question_type!,
          options: q.question_type === 'multiple_choice' ? q.options : undefined,
          required: q.required!
        })),
        category: 'quiz', // Set category as 'quiz' for all quiz surveys
        hashtags: ['quiz', 'assessment'], // Default hashtags for quizzes
        maxResponses: 1000 // Default max responses for quizzes
      })

      // Get the created survey with questions from Supabase
      const survey = await surveyService.getSurvey(surveyResult.surveyId)

      // Calculate availability end time if duration is set
      let availabilityEndsAt: string | undefined
      if (quiz.availability_duration_minutes) {
        const endTime = new Date()
        endTime.setMinutes(endTime.getMinutes() + quiz.availability_duration_minutes)
        availabilityEndsAt = endTime.toISOString()
      }

      // Generate a unique ID for the quiz (simple format to avoid UUID issues)
      const timestamp = Date.now()
      const random = Math.random().toString(36).substr(2, 9)
      const quizId = `quiz_${timestamp}_${random}`

      // Create quiz
      const createdQuiz = await QuizService.createQuiz({
        id: quizId, // Use generated UUID for quiz ID
        // Remove survey_id to avoid UUID constraint - relationship maintained via quiz questions
        title: quiz.title!,
        description: quiz.description,
        minimum_score: quiz.minimum_score!,
        total_points: quiz.total_points!,
        time_limit_minutes: quiz.time_limit_minutes,
        max_attempts: quiz.max_attempts!,
        availability_duration_minutes: quiz.availability_duration_minutes,
        availability_ends_at: availabilityEndsAt,
        creator_wallet: publicKey.toString(),
        is_active: true
      })

      console.log('🎯 Quiz creation result:', {
        generatedQuizId: quizId,
        createdQuizId: createdQuiz?.id,
        surveyId: surveyResult.surveyId
      })

      // Create quiz questions (survey questions are already created)
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        const surveyQuestion = survey.survey_questions[i]

        // Create quiz question linking to existing survey question
        await QuizService.addQuizQuestion({
          quiz_id: quizId, // Use the generated UUID
          survey_question_id: surveyQuestion.question_id, // Use the correct field name from the join
          points: question.points!,
          correct_answer: question.correct_answer,
          explanation: question.explanation
        })
      }

      setSuccess('Quiz created successfully!')

      // Wait a moment for the quiz to be fully indexed
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (onQuizCreated) {
        onQuizCreated(createdQuiz)
      } else {
        router.push(`/quiz/${quizId}`)
      }
    } catch (err: any) {
      console.error('Quiz creation error:', err)
      if (err.message) {
        setError(`Failed to create quiz: ${err.message}`)
      } else {
        setError('Failed to create quiz. Please try again.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Quiz</h1>
        <p className="text-gray-600">Create an interactive quiz with automatic grading and whitelist functionality</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Quiz Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Quiz Settings</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Title *
            </label>
            <input
              type="text"
              value={quiz.title || ''}
              onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter quiz title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Score (%) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={quiz.minimum_score || ''}
              onChange={(e) => {
                const value = e.target.value ? Number(e.target.value) : undefined
                setQuiz(prev => ({ ...prev, minimum_score: value }))
              }}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="70"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Limit (minutes)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quiz.time_limit_minutes || ''}
              onChange={(e) => setQuiz(prev => ({ 
                ...prev, 
                time_limit_minutes: e.target.value ? Number(e.target.value) : undefined 
              }))}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="No time limit"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Attempts
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quiz.max_attempts || ''}
              onChange={(e) => setQuiz(prev => ({ ...prev, max_attempts: e.target.value ? Number(e.target.value) : undefined }))}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quiz Availability (minutes)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={quiz.availability_duration_minutes || ''}
              onChange={(e) => setQuiz(prev => ({ 
                ...prev, 
                availability_duration_minutes: e.target.value ? Number(e.target.value) : undefined 
              }))}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="No limit (always open)"
            />
            <p className="text-xs text-gray-500 mt-1">
              How long the quiz stays open for responses (e.g., 5 minutes)
            </p>
          </div>
        </div>
        
      </div>

      {/* Questions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Trophy className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
            <span className="ml-2 text-sm text-gray-500">({questions.length})</span>
          </div>
          <button
            onClick={addQuestion}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Question {index + 1}</h3>
                <button
                  onClick={() => removeQuestion(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Text *
                  </label>
                  <input
                    type="text"
                    value={question.question_text || ''}
                    onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter question text"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points *
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={question.points || ''}
                    onChange={(e) => updateQuestion(index, 'points', e.target.value ? Number(e.target.value) : undefined)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <select
                  value={question.question_type || 'multiple_choice'}
                  onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="text_input">Text Input</option>
                </select>
              </div>

              {question.question_type === 'multiple_choice' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2">
                    {question.options?.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        {question.options && question.options.length > 2 && (
                          <button
                            onClick={() => removeOption(index, optionIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(index)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Option
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Answer *
                    </label>
                    <input
                      type="text"
                      value={question.correct_answer || ''}
                      onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter the correct answer"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hint/Explanation (Optional)
                </label>
                <textarea
                  value={question.explanation || ''}
                  onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Provide a hint or explanation to help students understand the question..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be shown to students as a hint while they're answering the question.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">Quiz Summary</h3>
            <p className="text-sm text-blue-700">
              {questions.length} questions • {quiz.total_points || 0} total points • {quiz.minimum_score || 0}% minimum score
            </p>
            {questions.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Points breakdown: {questions.map((q, i) => `${q.points || 0}`).join(' + ')} = {quiz.total_points || 0}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">
              {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min time limit` : 'No time limit'}
            </p>
            <p className="text-sm text-blue-700">
              {quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? 's' : ''} allowed
            </p>
            <p className="text-sm text-blue-700">
              {quiz.availability_duration_minutes ? `Open for ${quiz.availability_duration_minutes} minutes` : 'Always open'}
            </p>
          </div>
        </div>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCreateQuiz}
          disabled={!connected || isCreating || questions.length === 0}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Quiz...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Create Quiz
            </>
          )}
        </button>
      </div>
    </div>
  )
}
