'use client';

        // Survey X - Blockchain-Powered Surveys with Arcium Integration
        // Trigger Vercel redeploy with latest fixes and improved popups
        import { useState, useEffect } from 'react';
        import dynamic from 'next/dynamic';
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false }
);
import { SurveyCreator } from '@/components/SurveyCreator';
// Devnet demo removed
import { SurveyList } from '@/components/SurveyList';
import { SurveyResponse } from '@/components/SurveyResponse';
import { SurveyStats } from '@/components/SurveyStats';
import { SurveyResponsesViewer } from '@/components/SurveyResponsesViewer';

// Real survey data structure with timing features
interface Survey {
  id: string;
  publicId: string; // User-friendly ID for sharing
  title: string;
  description: string;
  questionCount: number;
  responseCount: number;
  createdAt: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  maxResponses?: number;
  keywords: string[]; // For search functionality
  questions: {
    id: string;
    text: string;
    type: 'text' | 'multiple-choice' | 'rating';
    options?: string[];
  }[];
}

export default function Home() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statsSurvey, setStatsSurvey] = useState<Survey | null>(null);
  const [responsesSurvey, setResponsesSurvey] = useState<Survey | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'browse'>('create');
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate user-friendly survey ID
  const generatePublicId = () => {
    const adjectives = ['Quick', 'Smart', 'Fun', 'Cool', 'Easy', 'Fast', 'Good', 'Nice', 'Best', 'Top'];
    const nouns = ['Survey', 'Poll', 'Quiz', 'Form', 'Study', 'Check', 'Ask', 'Test', 'Vote', 'Query'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const numbers = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `${adjective}${noun}${numbers}`;
  };

  // Extract keywords from survey title and description
  const extractKeywords = (title: string, description: string): string[] => {
    const text = `${title} ${description}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 2);
    return [...new Set(words)]; // Remove duplicates
  };

  // Filter surveys based on search query
  const filteredSurveys = surveys.filter(survey => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    
    // Search by public ID
    if (survey.publicId.toLowerCase().includes(query)) return true;
    
    // Search by title
    if (survey.title.toLowerCase().includes(query)) return true;
    
    // Search by description
    if (survey.description.toLowerCase().includes(query)) return true;
    
    // Search by keywords
    if (survey.keywords.some(keyword => keyword.includes(query))) return true;
    
    return false;
  });

  // Calculate real stats from actual survey data
  const totalResponses = surveys.reduce((sum, survey) => sum + survey.responseCount, 0);
  const activeSurveys = surveys.filter(survey => survey.isActive).length;
  const completionRateValue = surveys.length > 0 ? Math.round((totalResponses / (surveys.length * 10)) * 100) : 0; // Assuming 10 is target per survey
  void completionRateValue;

  // Load surveys from API (Supabase is now mandatory)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/surveys', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data)) {
            setSurveys(json.data);
          }
        } else {
          console.error('Failed to load surveys:', await res.text());
        }
      } catch (error) {
        console.error('Error loading surveys:', error);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);



  const handleCreateSurvey = async (
    newSurvey: Omit<Survey, 'id' | 'publicId' | 'createdAt' | 'responseCount' | 'keywords'>
  ) => {
    const publicId = generatePublicId();
    const keywords = extractKeywords(newSurvey.title, newSurvey.description);
    const survey: Survey = {
      ...newSurvey,
      id: Date.now().toString(),
      publicId,
      keywords,
      createdAt: new Date().toISOString(),
      responseCount: 0,
    };

    const res = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(survey),
    });
    if (res.ok) {
      const json = await res.json();
      const saved = (json?.data ?? survey) as Survey;
      setSurveys(prev => [...prev, saved]);
    } else {
      throw new Error(`Failed to create survey: ${await res.text()}`);
    }
  };

  const handleViewSurvey = (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      setSelectedSurvey(survey);
    }
  };

  const handleViewStats = (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      setStatsSurvey(survey);
      setShowStats(true);
    }
  };

  const handleViewResponses = (surveyId: string) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey) {
      setResponsesSurvey(survey);
    }
  };

  const handleSurveySubmit = async (
    responses: Record<string, unknown>,
    arcium?: { queueSig: string; finalizeSig: string; decryptedResponse?: string }
  ) => {
    if (!selectedSurvey) return;
    const payload = {
      timestamp: new Date().toISOString(),
      responses,
      arcium,
    };
    const res = await fetch(`/api/surveys/${selectedSurvey.id}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Failed to submit response: ${await res.text()}`);
    setSurveys(prev =>
      prev.map(survey =>
        survey.id === selectedSurvey.id
          ? { ...survey, responseCount: survey.responseCount + 1 }
          : survey
      )
    );
    setSelectedSurvey(null);
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete survey: ${await res.text()}`);
    setSurveys(prev => prev.filter(s => s.id !== surveyId));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // You could add a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">SX</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Survey X</h1>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Create, Share, and Analyze Surveys
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Build powerful surveys with blockchain-powered privacy and get real-time insights from your audience.
          </p>
        </div>

        {/* Devnet quick action removed */}

        {/* Real Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {surveys.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Surveys</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalResponses}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Responses</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeSurveys}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Active Surveys</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit mx-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Create Survey
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'browse'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Browse Surveys
            </button>
          </div>
        </div>

        {/* Create Survey Tab */}
        {activeTab === 'create' && (
          <div className="mb-8">
            <SurveyCreator onCreateSurvey={handleCreateSurvey} />
          </div>
        )}

        {/* Browse Surveys Tab */}
        {activeTab === 'browse' && (
          <div className="mb-8">
            <div className="max-w-md mx-auto mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Search by survey ID, title, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Survey List */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {activeTab === 'create' ? `Your Surveys (${surveys.length})` : `Available Surveys (${filteredSurveys.length})`}
          </h3>
          <SurveyList
            surveys={activeTab === 'create' ? surveys : filteredSurveys}
            onViewSurvey={handleViewSurvey}
            onViewStats={handleViewStats}
            onViewResponses={handleViewResponses}
            onDeleteSurvey={activeTab === 'create' ? handleDeleteSurvey : undefined}
            onCopyId={copyToClipboard}
            showPublicId={true}
          />
        </div>
      </main>

      {/* Modals */}
      {selectedSurvey && (
        <SurveyResponse
          survey={selectedSurvey}
          onSubmit={handleSurveySubmit}
          onClose={() => setSelectedSurvey(null)}
        />
      )}

      {showStats && statsSurvey && (
        <SurveyStats
          surveyTitle={statsSurvey.title}
          stats={{
            totalResponses: statsSurvey.responseCount,
            completionRate: Math.round((statsSurvey.responseCount / 10) * 100), // Assuming target is 10
            averageTime: 4.2, // This would be calculated from actual response times
            questionStats: statsSurvey.questions.map(q => ({
              questionId: q.id,
              questionText: q.text,
              responseCount: statsSurvey.responseCount,
              // Add real response data here when available
            }))
          }}
          onClose={() => {
            setShowStats(false);
            setStatsSurvey(null);
          }}
        />
      )}

      {responsesSurvey && (
        <SurveyResponsesViewer
          surveyId={responsesSurvey.id}
          surveyTitle={responsesSurvey.title}
          onClose={() => setResponsesSurvey(null)}
        />
      )}

      {/* Sliding Footer */}
      <footer className="fixed bottom-0 left-0 w-full h-16 overflow-hidden pointer-events-none z-50">
        <div className="sliding-footer flex items-center justify-center h-full">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-2 rounded-full shadow-lg font-semibold text-lg whitespace-nowrap">
            ⚡ Powered by Arcium
          </div>
        </div>
      </footer>
    </div>
  );
}
