'use client';

interface Survey {
  id: string;
  publicId: string;
  title: string;
  description: string;
  questionCount: number;
  responseCount: number;
  createdAt: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  maxResponses?: number;
  keywords: string[];
}

interface SurveyListProps {
  surveys: Survey[];
  onViewSurvey: (surveyId: string) => void;
  onViewStats: (surveyId: string) => void;
  onDeleteSurvey?: (surveyId: string) => void;
  onCopyId?: (id: string) => void;
  showPublicId?: boolean;
  onViewResponses?: (surveyId: string) => void;
}

export function SurveyList({ surveys, onViewSurvey, onViewStats, onDeleteSurvey, onCopyId, showPublicId, onViewResponses }: SurveyListProps) {
  const isSurveyAvailable = (survey: Survey) => {
    const now = new Date();
    const startDate = survey.startDate ? new Date(survey.startDate) : null;
    const endDate = survey.endDate ? new Date(survey.endDate) : null;
    
    // Check if survey has started
    if (startDate && now < startDate) return false;
    
    // Check if survey has ended
    if (endDate && now > endDate) return false;
    
    // Check if max responses reached
    if (survey.maxResponses && survey.responseCount >= survey.maxResponses) return false;
    
    return survey.isActive;
  };

  const getSurveyStatus = (survey: Survey) => {
    const now = new Date();
    const startDate = survey.startDate ? new Date(survey.startDate) : null;
    const endDate = survey.endDate ? new Date(survey.endDate) : null;
    
    if (!survey.isActive) return { status: 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };
    if (startDate && now < startDate) return { status: 'Scheduled', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
    if (endDate && now > endDate) return { status: 'Ended', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    if (survey.maxResponses && survey.responseCount >= survey.maxResponses) return { status: 'Full', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    return { status: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  };

  if (surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4 text-6xl">📊</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No surveys yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first survey to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <div
          key={survey.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {survey.title}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSurveyStatus(survey).color}`}>
                  {getSurveyStatus(survey).status}
                </span>
              </div>
              
              {/* Survey ID */}
              {showPublicId && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Survey ID:</span>
                  <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                    {survey.publicId}
                  </code>
                  {onCopyId && (
                    <button
                      onClick={() => onCopyId(survey.publicId)}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Copy Survey ID"
                    >
                      📋
                    </button>
                  )}
                </div>
              )}
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {survey.description}
              </p>
              
              <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <div className="flex items-center gap-1">
                  <span>📊</span>
                  <span>{survey.questionCount} questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>👥</span>
                  <span>{survey.responseCount}{survey.maxResponses ? `/${survey.maxResponses}` : ''} responses</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>📅</span>
                  <span>{new Date(survey.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* Timing Information */}
              {(survey.startDate || survey.endDate) && (
                <div className="flex items-center gap-6 text-xs text-gray-400 dark:text-gray-500">
                  {survey.startDate && (
                    <div className="flex items-center gap-1">
                      <span>🕐</span>
                      <span>Starts: {new Date(survey.startDate).toLocaleString()}</span>
                    </div>
                  )}
                  {survey.endDate && (
                    <div className="flex items-center gap-1">
                      <span>⏰</span>
                      <span>Ends: {new Date(survey.endDate).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onViewSurvey(survey.id)}
                disabled={!isSurveyAvailable(survey)}
                className={`px-4 py-2 text-white rounded-md text-sm font-medium transition-colors ${
                  isSurveyAvailable(survey)
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isSurveyAvailable(survey) ? 'Take Survey' : 'Unavailable'}
              </button>
              <button
                onClick={() => onViewStats(survey.id)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white rounded-md text-sm font-medium transition-colors"
              >
                Stats
              </button>
              {onViewResponses && (
                <button
                  onClick={() => onViewResponses(survey.id)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white rounded-md text-sm font-medium transition-colors"
                >
                  Responses
                </button>
              )}
              {onDeleteSurvey && (
                <button
                  onClick={() => onDeleteSurvey(survey.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
