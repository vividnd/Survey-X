import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  })
  throw new Error('Missing required Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types
export interface Survey {
  id: string
  title: string
  description: string
  creator_wallet: string
  survey_id: string // Arcium survey ID
  category: string
  hashtags: string[]
  is_active: boolean
  question_count: number
  response_count: number
  max_responses?: number
  created_at: string
  updated_at: string
}

export interface SurveyQuestion {
  id: string
  survey_id: string
  question_id: number
  question_text: string
  question_type: 'multiple_choice' | 'rating' | 'text_input'
  options?: string[] // For multiple choice questions
  required: boolean
  order_index: number
}

export interface SurveyResponse {
  id: string
  survey_id: string
  responder_wallet: string
  response_id: string // Arcium response ID
  computation_status: 'pending' | 'processing' | 'completed' | 'failed'
  submitted_at: string
  transaction_hash?: string
  response_data?: any[] // Actual response data for creators to view
}

export interface UserProfile {
  wallet_address: string
  display_name?: string
  bio?: string
  avatar_url?: string
  surveys_created: number
  responses_submitted: number
  created_at: string
  updated_at: string
}
