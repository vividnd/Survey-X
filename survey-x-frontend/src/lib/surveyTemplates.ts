export interface SurveyTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  questions: Array<{
    question_text: string
    question_type: 'multiple_choice' | 'rating' | 'text_input'
    options?: string[]
    required: boolean
  }>
  hashtags: string[]
  maxResponses: number
}

export const surveyTemplates: SurveyTemplate[] = [
  {
    id: 'customer-satisfaction',
    name: 'Customer Satisfaction',
    description: 'Measure customer satisfaction with your product or service',
    category: 'Business',
    icon: '😊',
    questions: [
      {
        question_text: 'How satisfied are you with our product/service?',
        question_type: 'rating',
        required: true
      },
      {
        question_text: 'What is your overall experience?',
        question_type: 'multiple_choice',
        options: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'],
        required: true
      },
      {
        question_text: 'What could we improve?',
        question_type: 'text_input',
        required: false
      },
      {
        question_text: 'Would you recommend us to others?',
        question_type: 'multiple_choice',
        options: ['Definitely', 'Probably', 'Maybe', 'Probably not', 'Definitely not'],
        required: true
      }
    ],
    hashtags: ['customer', 'satisfaction', 'feedback'],
    maxResponses: 100
  },
  {
    id: 'event-feedback',
    name: 'Event Feedback',
    description: 'Collect feedback from event attendees',
    category: 'Events',
    icon: '🎉',
    questions: [
      {
        question_text: 'How would you rate this event?',
        question_type: 'rating',
        required: true
      },
      {
        question_text: 'What was your favorite part?',
        question_type: 'multiple_choice',
        options: ['Keynote speakers', 'Networking', 'Workshops', 'Food & drinks', 'Venue'],
        required: true
      },
      {
        question_text: 'How did you hear about this event?',
        question_type: 'multiple_choice',
        options: ['Social media', 'Email', 'Website', 'Friend/colleague', 'Other'],
        required: true
      },
      {
        question_text: 'Any suggestions for future events?',
        question_type: 'text_input',
        required: false
      }
    ],
    hashtags: ['event', 'feedback', 'attendees'],
    maxResponses: 200
  },
  {
    id: 'employee-satisfaction',
    name: 'Employee Satisfaction',
    description: 'Gauge employee satisfaction and engagement',
    category: 'HR',
    icon: '👥',
    questions: [
      {
        question_text: 'How satisfied are you with your current role?',
        question_type: 'rating',
        required: true
      },
      {
        question_text: 'How would you rate work-life balance?',
        question_type: 'rating',
        required: true
      },
      {
        question_text: 'What motivates you most at work?',
        question_type: 'multiple_choice',
        options: ['Recognition', 'Career growth', 'Salary', 'Team collaboration', 'Flexibility'],
        required: true
      },
      {
        question_text: 'Any additional comments or suggestions?',
        question_type: 'text_input',
        required: false
      }
    ],
    hashtags: ['employee', 'satisfaction', 'hr'],
    maxResponses: 50
  },
  {
    id: 'product-feedback',
    name: 'Product Feedback',
    description: 'Gather user feedback on a specific product',
    category: 'Product',
    icon: '📱',
    questions: [
      {
        question_text: 'How easy is this product to use?',
        question_type: 'rating',
        required: true
      },
      {
        question_text: 'Which features do you use most?',
        question_type: 'multiple_choice',
        options: ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'All features'],
        required: true
      },
      {
        question_text: 'What would you change about this product?',
        question_type: 'text_input',
        required: false
      },
      {
        question_text: 'How likely are you to continue using this product?',
        question_type: 'rating',
        required: true
      }
    ],
    hashtags: ['product', 'feedback', 'usability'],
    maxResponses: 150
  },
  {
    id: 'market-research',
    name: 'Market Research',
    description: 'Conduct market research and consumer insights',
    category: 'Research',
    icon: '📊',
    questions: [
      {
        question_text: 'What is your age range?',
        question_type: 'multiple_choice',
        options: ['18-24', '25-34', '35-44', '45-54', '55+'],
        required: true
      },
      {
        question_text: 'How often do you purchase this type of product?',
        question_type: 'multiple_choice',
        options: ['Daily', 'Weekly', 'Monthly', 'Rarely', 'Never'],
        required: true
      },
      {
        question_text: 'What factors influence your purchasing decisions?',
        question_type: 'multiple_choice',
        options: ['Price', 'Quality', 'Brand', 'Convenience', 'Reviews'],
        required: true
      },
      {
        question_text: 'Any additional thoughts about this product category?',
        question_type: 'text_input',
        required: false
      }
    ],
    hashtags: ['market', 'research', 'consumer'],
    maxResponses: 300
  },
  {
    id: 'course-evaluation',
    name: 'Course Evaluation',
    description: 'Evaluate course content and instructor performance',
    category: 'Education',
    icon: '🎓',
    questions: [
      {
        question_text: 'How would you rate the course content?',
        question_type: 'rating',
        required: true
      },
      {
        question_text: 'How would you rate the instructor?',
        question_type: 'rating',
        required: true
      },
      {
        question_text: 'What was the most valuable part of this course?',
        question_type: 'multiple_choice',
        options: ['Lectures', 'Assignments', 'Discussions', 'Resources', 'Practical exercises'],
        required: true
      },
      {
        question_text: 'How could this course be improved?',
        question_type: 'text_input',
        required: false
      }
    ],
    hashtags: ['course', 'education', 'evaluation'],
    maxResponses: 100
  }
]

export const getTemplateById = (id: string): SurveyTemplate | undefined => {
  return surveyTemplates.find(template => template.id === id)
}

export const getTemplatesByCategory = (category: string): SurveyTemplate[] => {
  return surveyTemplates.filter(template => template.category === category)
}

export const getAllCategories = (): string[] => {
  return [...new Set(surveyTemplates.map(template => template.category))]
}
