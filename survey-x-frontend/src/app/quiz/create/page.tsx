'use client'

import { useState } from 'react'
import WalletButtonWrapper from '@/components/WalletButtonWrapper'
import QuizCreator from '@/components/QuizCreator'
import { useWalletSafe } from '@/hooks/useWalletSafe'
import { Quiz } from '@/lib/quizService'
import { useRouter } from 'next/navigation'

export default function CreateQuizPage() {
  const { connected } = useWalletSafe()
  const router = useRouter()
  const [createdQuiz, setCreatedQuiz] = useState<Quiz | null>(null)

  const handleQuizCreated = (quiz: Quiz) => {
    setCreatedQuiz(quiz)
    // Redirect to quiz management page
    router.push(`/quiz/${quiz.id}/manage`)
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Quiz</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to create interactive quizzes</p>
          <WalletButtonWrapper />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <QuizCreator onQuizCreated={handleQuizCreated} />
    </div>
  )
}
