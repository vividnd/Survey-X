import { supabase } from './supabase'

export interface Quiz {
  id: string
  survey_id: string
  title: string
  description?: string
  minimum_score: number
  total_points: number
  time_limit_minutes?: number
  max_attempts: number
  availability_duration_minutes?: number
  availability_ends_at?: string
  creator_wallet: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  survey_question_id: string
  points: number
  correct_answer?: string
  correct_answers?: string[]
  explanation?: string
  created_at: string
  // Extended question data
  question_text: string
  question_type: 'multiple_choice' | 'rating' | 'text_input'
  options?: string[]
  required: boolean
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  participant_wallet: string
  attempt_number: number
  started_at: string
  submitted_at?: string
  time_taken_minutes?: number
  total_score: number
  max_possible_score: number
  percentage: number
  is_passed: boolean
  status: 'in_progress' | 'submitted' | 'graded'
  created_at: string
  updated_at: string
}

export interface QuizResponse {
  id: string
  attempt_id: string
  question_id: string
  response_data: any
  is_correct?: boolean
  points_awarded: number
  is_graded: boolean
  graded_by?: string
  graded_at?: string
  feedback?: string
  created_at: string
  updated_at: string
}

export interface WhitelistEntry {
  id: string
  wallet_address: string
  quiz_id: string
  attempt_id: string
  score: number
  percentage: number
  whitelisted_at: string
  expires_at?: string
  is_active: boolean
  created_at: string
}

export interface SpecialSurvey {
  id: string
  survey_id: string
  quiz_id: string
  title: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export class QuizService {
  static supabase = supabase
  // Quiz Management
  static async createQuiz(quizData: Partial<Quiz>): Promise<Quiz> {
    console.log('🎯 QuizService.createQuiz called with:', {
      id: quizData.id,
      survey_id: quizData.survey_id,
      title: quizData.title
    })

    const { data, error } = await supabase
      .from('quizzes')
      .insert(quizData)
      .select()
      .single()

    if (error) {
      console.error('❌ Quiz creation error:', error)
      throw error
    }

    console.log('✅ Quiz created successfully:', {
      createdId: data?.id,
      returnedData: data
    })

    return data
  }

  static async getQuiz(quizId: string): Promise<Quiz | null> {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // If quiz doesn't have creator_wallet, try to find it from quiz questions
    if (data && !data.creator_wallet) {
      try {
        // Get creator wallet from the first quiz question's survey
        const { data: quizQuestions } = await supabase
          .from('quiz_questions')
          .select(`
            survey_questions!inner(
              surveys!inner(creator_wallet)
            )
          `)
          .eq('quiz_id', quizId)
          .limit(1)

        if (quizQuestions && quizQuestions.length > 0) {
          const creatorWallet = (quizQuestions[0] as any).survey_questions?.surveys?.[0]?.creator_wallet
          if (creatorWallet && creatorWallet.length === 44) {
            data.creator_wallet = creatorWallet
            console.log('✅ Found creator wallet from quiz questions:', creatorWallet)
          }
        }
      } catch (fallbackError) {
        console.warn('⚠️ Could not find creator wallet from quiz questions:', fallbackError)
      }
    }

    return data
  }

  static async getQuizzesByCreator(creatorWallet: string): Promise<Quiz[]> {
    // Get quizzes that have questions linked to surveys created by this wallet
    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions(
          survey_questions(
            surveys!inner(creator_wallet)
          )
        )
      `)
      .eq('quiz_questions.survey_questions.surveys.creator_wallet', creatorWallet)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Quiz Questions
  static async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    // First try to get quiz questions
    const { data, error } = await supabase
      .from('quiz_questions')
      .select(`
        *,
        survey_questions!inner(
          question_text,
          question_type,
          options,
          required
        )
      `)
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading quiz questions:', error)
      throw error
    }
    
    console.log('Raw quiz questions data:', data)
    console.log('Quiz questions count:', data?.length || 0)

    // If we have quiz questions, return them
    if (data && data.length > 0) {
      console.log('Processing quiz questions with survey data...')
      const processedQuestions = data.map(q => ({
        ...q,
        question_text: q.survey_questions.question_text,
        question_type: q.survey_questions.question_type,
        options: q.survey_questions.options,
        required: q.survey_questions.required
      }))
      console.log('Processed quiz questions:', processedQuestions)
      return processedQuestions
    }

    console.log('No quiz questions found, will use fallback...')
    
    // Fallback: If no quiz questions exist, get questions from the survey
    console.log('No quiz questions found, falling back to survey questions')
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('survey_id')
      .eq('id', quizId)
      .single()
    
    if (quizError) {
      console.error('Error loading quiz data:', quizError)
      throw quizError
    }
    
    const { data: surveyQuestions, error: surveyError } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', quizData.survey_id)
      .order('order_index', { ascending: true })
    
    if (surveyError) {
      console.error('Error loading survey questions:', surveyError)
      throw surveyError
    }
    
    console.log('Fallback survey questions:', surveyQuestions)
    console.log('Quiz data for fallback:', quizData)

    if (!surveyQuestions || surveyQuestions.length === 0) {
      console.log('No survey questions found for quiz fallback')
      return []
    }

    // Convert survey questions to quiz questions format
    const convertedQuestions = surveyQuestions.map((sq, index) => ({
      id: `fallback-${sq.id}`,
      quiz_id: quizId,
      survey_question_id: sq.id,
      points: 1.0, // Default points
      correct_answer: undefined,
      correct_answers: undefined,
      explanation: undefined,
      created_at: sq.created_at || new Date().toISOString(),
      question_text: sq.question_text,
      question_type: sq.question_type,
      options: sq.options,
      required: sq.required
    }))

    console.log('Converted fallback questions:', convertedQuestions)
    return convertedQuestions
  }

  static async addQuizQuestion(questionData: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(questionData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Quiz Attempts
  static async createQuizAttempt(attemptData: Partial<QuizAttempt>): Promise<QuizAttempt> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert(attemptData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getQuizAttempt(attemptId: string): Promise<QuizAttempt | null> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getUserQuizAttempts(quizId: string, walletAddress: string): Promise<QuizAttempt[]> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('participant_wallet', walletAddress)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async submitQuizAttempt(attemptId: string): Promise<QuizAttempt> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Quiz Responses
  static async submitQuizResponse(responseData: Partial<QuizResponse>): Promise<QuizResponse> {
    const { data, error } = await supabase
      .from('quiz_responses')
      .insert(responseData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getQuizResponses(attemptId: string): Promise<QuizResponse[]> {
    const { data, error } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  static async getAllQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        participant_wallet,
        total_score,
        percentage,
        is_passed,
        status,
        created_at,
        updated_at
      `)
      .eq('quiz_id', quizId)
      .order('total_score', { ascending: false }) // Highest scores first

    if (error) throw error
    return data
  }

  static async gradeTextResponse(
    responseId: string, 
    pointsAwarded: number, 
    feedback?: string,
    graderId?: string
  ): Promise<QuizResponse> {
    const { data, error } = await supabase
      .from('quiz_responses')
      .update({
        points_awarded: pointsAwarded,
        is_graded: true,
        graded_by: graderId,
        graded_at: new Date().toISOString(),
        feedback: feedback
      })
      .eq('id', responseId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Whitelist Management
  static async getWhitelistStatus(walletAddress: string, quizId: string): Promise<WhitelistEntry | null> {
    const { data, error } = await supabase
      .from('whitelist')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('quiz_id', quizId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  static async getWhitelistedUsers(quizId: string): Promise<WhitelistEntry[]> {
    const { data, error } = await supabase
      .from('whitelist')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('is_active', true)
      .order('whitelisted_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async addToWhitelist(whitelistData: Partial<WhitelistEntry>): Promise<WhitelistEntry> {
    const { data, error } = await supabase
      .from('whitelist')
      .insert(whitelistData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async removeFromWhitelist(walletAddress: string, quizId: string): Promise<void> {
    const { error } = await supabase
      .from('whitelist')
      .update({ is_active: false })
      .eq('wallet_address', walletAddress)
      .eq('quiz_id', quizId)

    if (error) throw error
  }

  // Special Surveys
  static async getSpecialSurveys(quizId: string): Promise<SpecialSurvey[]> {
    const { data, error } = await supabase
      .from('special_surveys')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  static async createSpecialSurvey(surveyData: Partial<SpecialSurvey>): Promise<SpecialSurvey> {
    const { data, error } = await supabase
      .from('special_surveys')
      .insert(surveyData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Utility Functions
  static async isUserWhitelisted(walletAddress: string, quizId: string): Promise<boolean> {
    const whitelistEntry = await this.getWhitelistStatus(walletAddress, quizId)
    return whitelistEntry !== null
  }

  static async isQuizAcceptingResponses(quizId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('is_quiz_accepting_responses', { p_quiz_id: quizId })

    if (error) throw error
    return data
  }

  static async canUserAccessSpecialSurvey(walletAddress: string, specialSurveyId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('special_surveys')
      .select(`
        quiz_id,
        whitelist!inner(wallet_address)
      `)
      .eq('id', specialSurveyId)
      .eq('whitelist.wallet_address', walletAddress)
      .eq('whitelist.is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data !== null
  }

  // Grading Functions
  static async autoGradeMCQResponse(questionId: string, responseData: any): Promise<{ isCorrect: boolean; points: number }> {
    // Get question details
    const { data: question, error } = await supabase
      .from('quiz_questions')
      .select('correct_answer, points')
      .eq('id', questionId)
      .single()

    if (error) throw error

    const userAnswer = responseData.answer || responseData.value
    const correctAnswer = question.correct_answer
    const points = question.points

    const isCorrect = userAnswer && correctAnswer && 
      userAnswer.toString().toLowerCase().trim() === correctAnswer.toLowerCase().trim()

    return {
      isCorrect,
      points: isCorrect ? points : 0
    }
  }

  // Analytics
  static async getQuizAnalytics(quizId: string): Promise<{
    totalAttempts: number
    passedAttempts: number
    averageScore: number
    averageTime: number
    completionRate: number
  }> {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('total_score, time_taken_minutes, is_passed, status')
      .eq('quiz_id', quizId)

    if (error) throw error

    const totalAttempts = data.length
    const passedAttempts = data.filter(a => a.is_passed).length
    const completedAttempts = data.filter(a => a.status === 'submitted').length
    const averageScore = totalAttempts > 0 ? 
      data.reduce((sum, a) => sum + a.total_score, 0) / totalAttempts : 0
    const averageTime = completedAttempts > 0 ?
      data.filter(a => a.time_taken_minutes)
          .reduce((sum, a) => sum + (a.time_taken_minutes || 0), 0) / completedAttempts : 0
    const completionRate = totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0

    return {
      totalAttempts,
      passedAttempts,
      averageScore,
      averageTime,
      completionRate
    }
  }

  // Delete quiz
  static async deleteQuiz(quizId: string): Promise<void> {
    try {
      // First delete all related data
      await supabase
        .from('quiz_responses')
        .delete()
        .eq('attempt_id', 
          supabase
            .from('quiz_attempts')
            .select('id')
            .eq('quiz_id', quizId)
        )

      await supabase
        .from('quiz_attempts')
        .delete()
        .eq('quiz_id', quizId)

      await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId)

      await supabase
        .from('whitelist')
        .delete()
        .eq('quiz_id', quizId)

      await supabase
        .from('special_surveys')
        .delete()
        .eq('quiz_id', quizId)

      // Finally delete the quiz
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)

      if (error) throw error
    } catch (error) {
      console.error('❌ Failed to delete quiz:', error)
      throw error
    }
  }
}
