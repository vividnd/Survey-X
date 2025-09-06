'use client'

import { useState } from 'react'
import { Check, Sparkles, ArrowRight } from 'lucide-react'
import { surveyTemplates, SurveyTemplate, getAllCategories } from '@/lib/surveyTemplates'

interface TemplateSelectorProps {
  onSelectTemplate: (template: SurveyTemplate) => void
  onStartBlank: () => void
}

export default function TemplateSelector({ onSelectTemplate, onStartBlank }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null)
  
  const categories = ['All', ...getAllCategories()]
  const filteredTemplates = selectedCategory === 'All' 
    ? surveyTemplates 
    : surveyTemplates.filter(t => t.category === selectedCategory)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Choose a Template</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Start with a pre-built template or create your survey from scratch. 
          Templates include optimized questions for common use cases.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all hover:shadow-lg ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {selectedTemplate?.id === template.id && (
              <div className="absolute top-4 right-4">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
            
            <div className="text-4xl mb-4">{template.icon}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{template.name}</h3>
            <p className="text-gray-600 mb-4">{template.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium">Category:</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-gray-700">
                  {template.category}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium">Questions:</span>
                <span className="ml-2">{template.questions.length}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium">Max Responses:</span>
                <span className="ml-2">{template.maxResponses}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1">
              {template.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Template Preview */}
      {selectedTemplate && (
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Preview: {selectedTemplate.name}
          </h3>
          <div className="space-y-3">
            {selectedTemplate.questions.map((question, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">
                      {index + 1}. {question.question_text}
                    </p>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        question.question_type === 'multiple_choice' 
                          ? 'bg-blue-100 text-blue-800' 
                          : question.question_type === 'rating'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {question.question_type === 'multiple_choice' && '📋 Multiple Choice'}
                        {question.question_type === 'rating' && '⭐ Rating'}
                        {question.question_type === 'text_input' && '✏️ Text Input'}
                      </span>
                      {question.required && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    {question.options && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-1">Options:</p>
                        <div className="flex flex-wrap gap-1">
                          {question.options.map((option, optIndex) => (
                            <span
                              key={optIndex}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onStartBlank}
          className="flex items-center justify-center px-8 py-4 border-2 border-blue-500 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 hover:border-blue-600 transition-all duration-200 shadow-md hover:shadow-lg bg-white"
        >
          <Plus className="w-5 h-5 mr-3" />
          Start from Scratch
        </button>
        
        {selectedTemplate && (
          <button
            onClick={() => onSelectTemplate(selectedTemplate)}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Use This Template
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        )}
      </div>
    </div>
  )
}
