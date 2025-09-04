'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [tables, setTables] = useState<any[]>([])

  useEffect(() => {
    testSupabaseConnection()
  }, [])

  const testSupabaseConnection = async () => {
    try {
      console.log('Testing Supabase connection...')

      // Test basic connection
      const { data, error } = await supabase
        .from('surveys')
        .select('count', { count: 'exact', head: true })

      if (error) {
        console.error('Supabase connection error:', error)
        setStatus('error')
        setMessage(`Database connection failed: ${error.message}`)
        return
      }

      console.log('Supabase connection successful!')
      setStatus('success')
      setMessage('Database connection successful!')

              // Check if tables exist
      const tablesToCheck = ['surveys', 'survey_questions', 'survey_responses', 'user_profiles']

      for (const tableName of tablesToCheck) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)

          if (error && error.message.includes('relation "public.' + tableName + '" does not exist')) {
            console.log(`${tableName} table does not exist`)
            setTables(prev => [...prev, { name: tableName, exists: false }])
          } else {
            console.log(`${tableName} table exists`)
            setTables(prev => [...prev, { name: tableName, exists: true }])
          }
        } catch (e) {
          console.log(`Error checking ${tableName} table:`, e)
          setTables(prev => [...prev, { name: tableName, exists: false }])
        }
      }

    } catch (error: any) {
      console.error('Test failed:', error)
      setStatus('error')
      setMessage(`Test failed: ${error.message}`)
    }
  }

  const testSurveyCreation = async () => {
    try {
      setMessage('Testing survey creation...')

      const testSurvey = {
        title: 'Test Survey',
        description: 'This is a test survey',
        creator_wallet: '11111111111111111111111111111112', // Fake wallet for testing
        survey_id: `test_${Date.now()}`,
        category: 'other',
        hashtags: ['test'],
        is_active: true,
        question_count: 1,
        response_count: 0
      }

      const { data, error } = await supabase
        .from('surveys')
        .insert(testSurvey)
        .select()

      if (error) {
        console.error('Survey creation error:', error)
        setMessage(`Survey creation failed: ${error.message}`)
      } else {
        console.log('Survey creation successful:', data)
        setMessage('Survey creation successful!')
      }

    } catch (error: any) {
      console.error('Survey creation test failed:', error)
      setMessage(`Survey creation test failed: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Connection Test</h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className={`p-4 rounded-lg ${
            status === 'loading' ? 'bg-yellow-50 border border-yellow-200' :
            status === 'success' ? 'bg-green-50 border border-green-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {status === 'loading' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
              )}
              {status === 'success' && (
                <div className="w-5 h-5 bg-green-500 rounded-full mr-3"></div>
              )}
              {status === 'error' && (
                <div className="w-5 h-5 bg-red-500 rounded-full mr-3"></div>
              )}
              <p className={`font-medium ${
                status === 'loading' ? 'text-yellow-800' :
                status === 'success' ? 'text-green-800' :
                'text-red-800'
              }`}>
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Database Tables</h2>
          {tables.map((table, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="font-medium">{table.name}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                table.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {table.exists ? 'Exists' : 'Missing'}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-3">
            <button
              onClick={testSupabaseConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Database Connection
            </button>

            <button
              onClick={testSurveyCreation}
              className="ml-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Test Survey Creation
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
