'use client';

import { useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { submitSurveyEncrypted, SurveyTestData } from '@/lib/surveyArcium';

export function ArciumTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const testArciumIntegration = async () => {
    if (!wallet) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');

    try {
      console.log('🧪 Testing Arcium integration with best practices...');
      
      // Test with enhanced survey data structure using only supported Arcium types
      // Following Arcium best practices for data independence and performance
      const testData: SurveyTestData = {
        // submit_response.arcis InputValues (following Arcium types spec)
        response: 85,              // u64 response value
        rating: 4,                 // u8 rating (1-5)
        feedback_length: 120,      // u16 feedback length
        category: 3,               // u8 category (1-5)
        timestamp: 1704067200,     // u64 Unix timestamp
        
        // create_survey.arcis SurveyData (following Arcium types spec)
        title_length: 25,          // u8 title length
        description_length: 150,   // u8 description length
        question_count: 8,         // u8 question count
        complexity_score: 7,       // u8 complexity score (1-10)
        target_audience: 4,        // u8 target audience (1-5)
        estimated_duration: 45     // u16 estimated duration (minutes)
      };

      const result = await submitSurveyEncrypted(testData, connection, wallet);
      
      setResult(JSON.stringify(result, null, 2));
      console.log('✅ Arcium test successful with best practices:', result);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('❌ Arcium test failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">🧪 Arcium Integration Test (Best Practices)</h2>
      
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          Test your Arcium integration with the deployed program on devnet.
        </p>
        <p className="text-sm text-gray-500 mb-2">
          Program ID: {process.env.NEXT_PUBLIC_PROGRAM_ID || 'FoZGZMWrz5ATiCDJsyakp8bxF9gZjGBWZFGpJQrLEgtY'}
        </p>
        <p className="text-sm text-green-600">
          ✅ Following Arcium best practices: Data independence, performance optimization, supported types only
        </p>
      </div>

      <button
        onClick={testArciumIntegration}
        disabled={isLoading || !wallet}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Testing...' : 'Test Arcium Integration'}
      </button>

      {!wallet && (
        <p className="mt-2 text-red-600">Please connect your Solana wallet first</p>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>Success!</strong>
          <pre className="mt-2 text-sm overflow-auto">{result}</pre>
        </div>
      )}
    </div>
  );
}
