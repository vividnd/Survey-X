'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Users, Clock, PieChart } from 'lucide-react'

interface Question {
  id: number
  question_text: string
  question_type: 'multiple_choice' | 'rating' | 'text_input'
  options?: string[]
}

interface Response {
  id: string
  response_data: any[] | null
  submitted_at: string
}

interface ResponseAnalyticsProps {
  questions: Question[]
  responses: Response[]
}

export default function ResponseAnalytics({ questions, responses }: ResponseAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'trends'>('overview')

  // Calculate analytics data
  const totalResponses = responses.length
  const completionRate = responses.filter(r => r.response_data && r.response_data.length > 0).length
  const avgResponseTime = "2.5 min" // Placeholder - would need to track actual time
  
  // Rating question analytics
  const ratingQuestions = questions.filter(q => q.question_type === 'rating')
  const ratingAnalytics = ratingQuestions.map(question => {
    const questionResponses = responses
      .filter(r => r.response_data && r.response_data[question.id - 1])
      .map(r => r.response_data![question.id - 1]?.answer || r.response_data![question.id - 1]?.value)
      .filter(val => val && !isNaN(Number(val)))
      .map(val => Number(val))
    
    const average = questionResponses.length > 0 ? 
      (questionResponses.reduce((sum, val) => sum + val, 0) / questionResponses.length).toFixed(1) : 0
    
    return {
      question: question.question_text,
      average: Number(average),
      total: questionResponses.length,
      distribution: [1,2,3,4,5].map(rating => 
        questionResponses.filter(val => val === rating).length
      )
    }
  })

  // Multiple choice analytics
  const mcQuestions = questions.filter(q => q.question_type === 'multiple_choice')
  const mcAnalytics = mcQuestions.map(question => {
    const questionResponses = responses
      .filter(r => r.response_data && r.response_data[question.id - 1])
      .map(r => r.response_data![question.id - 1]?.answer || r.response_data![question.id - 1]?.value)
      .filter(val => val)
    
    const optionCounts = question.options?.map(option => ({
      option,
      count: questionResponses.filter(resp => resp === option).length,
      percentage: questionResponses.length > 0 ? 
        Math.round((questionResponses.filter(resp => resp === option).length / questionResponses.length) * 100) : 0
    })) || []
    
    return {
      question: question.question_text,
      total: questionResponses.length,
      options: optionCounts
    }
  })

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'questions', label: 'Questions', icon: PieChart },
    { id: 'trends', label: 'Trends', icon: TrendingUp }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Response Analytics</h3>
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Total Responses</p>
                  <p className="text-2xl font-bold text-blue-900">{totalResponses}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-900">
                    {totalResponses > 0 ? Math.round((completionRate / totalResponses) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Avg. Time</p>
                  <p className="text-2xl font-bold text-purple-900">{avgResponseTime}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-600">Questions</p>
                  <p className="text-2xl font-bold text-orange-900">{questions.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Question Type Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Question Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['multiple_choice', 'rating', 'text_input'].map((type) => {
                const count = questions.filter(q => q.question_type === type).length
                const percentage = questions.length > 0 ? Math.round((count / questions.length) * 100) : 0
                const colors = {
                  multiple_choice: 'bg-blue-500',
                  rating: 'bg-green-500',
                  text_input: 'bg-purple-500'
                }
                const labels = {
                  multiple_choice: 'Multiple Choice',
                  rating: 'Rating',
                  text_input: 'Text Input'
                }
                
                return (
                  <div key={type} className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${colors[type as keyof typeof colors]}`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{labels[type as keyof typeof labels]}</span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${colors[type as keyof typeof colors]}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Rating Questions */}
          {ratingAnalytics.map((analytics, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">{analytics.question}</h4>
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl font-bold text-green-600">{analytics.average}/5</div>
                <div className="text-sm text-gray-600">{analytics.total} responses</div>
              </div>
              <div className="space-y-2">
                {[1,2,3,4,5].map((rating) => {
                  const count = analytics.distribution[rating - 1]
                  const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0
                  return (
                    <div key={rating} className="flex items-center space-x-3">
                      <span className="w-6 text-sm text-gray-600">{rating}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-8 text-sm text-gray-600">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Multiple Choice Questions */}
          {mcAnalytics.map((analytics, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">{analytics.question}</h4>
              <div className="space-y-3">
                {analytics.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{option.option}</span>
                        <span className="font-medium">{option.count} ({option.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${option.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Trends Coming Soon</h4>
          <p className="text-gray-600">Response trends over time will be available in a future update.</p>
        </div>
      )}
    </div>
  )
}
