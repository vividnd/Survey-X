interface QuestionTypeBadgeProps {
  questionType: 'multiple_choice' | 'rating' | 'text_input'
  size?: 'sm' | 'md'
}

export default function QuestionTypeBadge({ questionType, size = 'sm' }: QuestionTypeBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  
  const getBadgeConfig = () => {
    switch (questionType) {
      case 'multiple_choice':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: '📋',
          label: 'Multiple Choice'
        }
      case 'rating':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: '⭐',
          label: 'Rating'
        }
      case 'text_input':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          icon: '✏️',
          label: 'Text Input'
        }
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: '❓',
          label: 'Unknown'
        }
    }
  }

  const config = getBadgeConfig()

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.bg} ${config.text}`}>
      {config.icon} {config.label}
    </span>
  )
}
