'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Circle } from 'lucide-react'

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'rating' | 'text_input'
  options?: string[]
  required: boolean
}

interface MobileOptimizedSurveyProps {
  questions: Question[]
  responses: { [key: string]: any }
  onResponseChange: (questionId: string, value: any) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export default function MobileOptimizedSurvey({
  questions,
  responses,
  onResponseChange,
  onSubmit,
  isSubmitting
}: MobileOptimizedSurveyProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const isFirstQuestion = currentQuestionIndex === 0

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = () => {
    onSubmit()
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
                onClick={() => onResponseChange(currentQuestion.id, option)}
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
                    {response === option && <Check className="w-3 h-3 text-white" />}
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
                  onClick={() => onResponseChange(currentQuestion.id, rating)}
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
              onChange={(e) => onResponseChange(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg resize-none focus:border-blue-500 focus:ring-0 text-base"
              rows={4}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
          </span>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {currentQuestion.question_text}
            </h2>
            
            {currentQuestion.required && (
              <p className="text-sm text-red-600 mb-4">* Required</p>
            )}

            {renderQuestion()}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
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
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
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
                  Submit
                  <Check className="w-4 h-4 ml-1" />
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
              <ChevronRight className="w-4 h-4 ml-1" />
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
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
