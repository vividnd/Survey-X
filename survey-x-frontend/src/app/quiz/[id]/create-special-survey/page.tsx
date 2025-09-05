'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { QuizService } from '@/lib/quizService'
import { SurveyService } from '@/lib/surveyService'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Trash2, Save, Award, Lock, Users, FileText } from 'lucide-react'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  minimum_score: number
  total_points: number
  max_attempts: number
  survey_id: string
}

interface SpecialSurvey {
  id: string
  title: string
  description?: string
  survey_id: string
  quiz_id: string
  is_active: boolean
  created_at: string
}

export default function CreateSpecialSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string
  const { publicKey, connected } = useWalletSafe()
  
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [specialSurveys, setSpecialSurveys] = useState<SpecialSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Array<{
    id: string
    question_text: string
    question_type: 'multiple_choice' | 'text_input' | 'rating'
    options?: string[]
    required: boolean
    order_index: number
  }>>([])

  useEffect(() => {
    const loadQuizData = async () => {
      if (!quizId) return

      try {
        setLoading(true)
        
        // Load quiz data
        const quizData = await QuizService.getQuiz(quizId)
        if (!quizData) {
          setError('Quiz not found')
          return
        }
        setQuiz(quizData)

        // Check if user is the creator
        if (!publicKey || quizData.creator_wallet !== publicKey.toString()) {
          setError('You are not the creator of this quiz')
          return
        }

        // Load existing special surveys
        const existingSurveys = await QuizService.getSpecialSurveys(quizId)
        setSpecialSurveys(existingSurveys)
      } catch (err) {
        console.error('Failed to load quiz data:', err)
        setError('Failed to load quiz data')
      } finally {
        setLoading(false)
      }
    }

    loadQuizData()
  }, [quizId, publicKey])

  const addQuestion = () => {
    const newQuestion = {
      id: `temp-${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice' as const,
      options: ['Option 1', 'Option 2'],
      required: true,
      order_index: questions.length
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }
    setQuestions(updatedQuestions)
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions]
    const question = updatedQuestions[questionIndex]
    if (question.options) {
      question.options.push(`Option ${question.options.length + 1}`)
      updateQuestion(questionIndex, 'options', question.options)
    }
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions]
    const question = updatedQuestions[questionIndex]
    if (question.options) {
      question.options[optionIndex] = value
      updateQuestion(questionIndex, 'options', question.options)
    }
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions]
    const question = updatedQuestions[questionIndex]
    if (question.options && question.options.length > 1) {
      question.options.splice(optionIndex, 1)
      updateQuestion(questionIndex, 'options', question.options)
    }
  }

  const handleCreateSpecialSurvey = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!connected || !publicKey || !quiz) {
      setError('Please connect your wallet')
      return
    }

    if (!title.trim()) {
      setError('Please enter a survey title')
      return
    }

    if (questions.length === 0) {
      setError('Please add at least one question')
      return
    }

    // Validate questions
    for (const question of questions) {
      if (!question.question_text.trim()) {
        setError('Please fill in all question texts')
        return
      }
      if (question.question_type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
        setError('Multiple choice questions must have at least 2 options')
        return
      }
    }

    setCreating(true)
    setError('')
    setSuccess('')

    try {
      // Create wallet interface for SurveyService
      const walletInterface = {
        publicKey,
        signTransaction: async (transaction: any) => {
          if (!window.solana?.signTransaction) {
            throw new Error('Phantom wallet not found')
          }
          return await window.solana.signTransaction(transaction)
        },
        signAllTransactions: async (transactions: any[]) => {
          if (!window.solana?.signTransaction) {
            throw new Error('Phantom wallet not found')
          }
          const signedTransactions = []
          for (const transaction of transactions) {
            const signed = await window.solana.signTransaction(transaction)
            signedTransactions.push(signed)
          }
          return signedTransactions
        }
      }

      // Create the survey
      const surveyService = new SurveyService(walletInterface)
      const surveyResult = await surveyService.createSurvey({
        title: title.trim(),
        description: description.trim(),
        category: 'special',
        hashtags: ['special', 'whitelist', 'exclusive'],
        maxResponses: 1000,
        questions: questions.map(q => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: q.options,
          required: q.required,
          order_index: q.order_index
        }))
      })

      // Create special survey entry
      const { error: specialSurveyError } = await supabase
        .from('special_surveys')
        .insert({
          survey_id: surveyResult.surveyId,
          quiz_id: quizId,
          title: title.trim(),
          description: description.trim(),
          is_active: true
        })

      if (specialSurveyError) throw specialSurveyError

      setSuccess('Special survey created successfully!')
      
      // Reset form
      setTitle('')
      setDescription('')
      setQuestions([])
      
      // Reload special surveys
      const updatedSurveys = await QuizService.getSpecialSurveys(quizId)
      setSpecialSurveys(updatedSurveys)

    } catch (err: any) {
      console.error('Failed to create special survey:', err)
      setError(err.message || 'Failed to create special survey')
    } finally {
      setCreating(false)
    }
  }

  const deleteSpecialSurvey = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this special survey?')) return

    try {
      // Delete from special_surveys table
      const { error: specialSurveyError } = await supabase
        .from('special_surveys')
        .delete()
        .eq('survey_id', surveyId)

      if (specialSurveyError) throw specialSurveyError

      // Delete the survey and all related data
      const surveyService = new SurveyService()
      await surveyService.deleteSurvey(surveyId)

      setSuccess('Special survey deleted successfully!')
      
      // Reload special surveys
      const updatedSurveys = await QuizService.getSpecialSurveys(quizId)
      setSpecialSurveys(updatedSurveys)

    } catch (err: any) {
      console.error('Failed to delete special survey:', err)
      setError(err.message || 'Failed to delete special survey')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz data...</p>
        </div>
      </div>
    )
  }

  if (error && !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/quiz/${quizId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Quiz
          </Link>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create Special Survey</h1>
                <p className="text-gray-600">Create exclusive surveys for users who pass "{quiz?.title}"</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Min Score: {quiz?.minimum_score}%</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-600" />
                <span>Total Points: {quiz?.total_points}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Max Attempts: {quiz?.max_attempts}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-5 h-5 text-red-500 flex-shrink-0">⚠️</div>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-5 h-5 text-green-500 flex-shrink-0">✅</div>
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Existing Special Surveys */}
        {specialSurveys.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Existing Special Surveys</h2>
            <div className="space-y-4">
              {specialSurveys.map((survey) => (
                <div key={survey.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{survey.title}</h3>
                    {survey.description && (
                      <p className="text-sm text-gray-600">{survey.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Created {new Date(survey.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/surveys/${survey.survey_id}`}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => deleteSpecialSurvey(survey.survey_id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Special Survey Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Special Survey</h2>
          
          <form onSubmit={handleCreateSpecialSurvey} className="space-y-6">
            {/* Survey Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter survey title..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter survey description..."
                />
              </div>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Questions</h3>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text *
                        </label>
                        <input
                          type="text"
                          value={question.question_text}
                          onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="Enter question text..."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Type
                        </label>
                        <select
                          value={question.question_type}
                          onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="text_input">Text Input</option>
                          <option value="rating">Rating (1-5)</option>
                        </select>
                      </div>

                      {question.question_type === 'multiple_choice' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Options
                            </label>
                            <button
                              type="button"
                              onClick={() => addOption(index)}
                              className="text-sm text-purple-600 hover:text-purple-700"
                            >
                              + Add Option
                            </button>
                          </div>
                          <div className="space-y-2">
                            {question.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  placeholder={`Option ${optionIndex + 1}`}
                                />
                                {question.options && question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(index, optionIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={question.required}
                          onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                          className="mr-2 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor={`required-${index}`} className="text-sm text-gray-700">
                          Required question
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={creating || !connected}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Special Survey
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
