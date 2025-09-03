'use client';

interface SurveyStats {
  totalResponses: number;
  completionRate: number;
  averageTime: number;
  questionStats: {
    questionId: string;
    questionText: string;
    responseCount: number;
    averageRating?: number;
    textResponses?: string[];
    choiceDistribution?: Record<string, number>;
  }[];
}

interface SurveyStatsProps {
  surveyTitle: string;
  stats: SurveyStats;
  onClose: () => void;
}

export function SurveyStats({ surveyTitle, stats, onClose }: SurveyStatsProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const renderQuestionStats = (questionStat: typeof stats.questionStats[0]) => {
    if (questionStat.averageRating !== undefined) {
      return (
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {questionStat.averageRating.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500">Average Rating</div>
        </div>
      );
    }

    if (questionStat.choiceDistribution) {
      const total = Number(Object.values(questionStat.choiceDistribution).reduce((a: unknown, b: unknown) => Number(a) + Number(b), 0));
      return (
        <div className="space-y-2">
          {Object.entries(questionStat.choiceDistribution).map(([choice, count]) => (
            <div key={choice} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">{choice}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${((count as number) / total) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.round(((count as number) / total) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (questionStat.textResponses) {
      return (
        <div className="max-h-32 overflow-y-auto space-y-2">
          {questionStat.textResponses.slice(0, 5).map((response: string, index: number) => (
            <div key={index} className="text-sm text-gray-600 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              &ldquo;{response}&rdquo;
            </div>
          ))}
          {questionStat.textResponses.length > 5 && (
            <div className="text-xs text-gray-500 text-center">
              +{questionStat.textResponses.length - 5} more responses
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Survey Statistics
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {surveyTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalResponses}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Total Responses</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📈</span>
                <div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {stats.completionRate}%
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Completion Rate</div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                <div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatTime(stats.averageTime)}
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Avg. Time</div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">❓</span>
                <div>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {stats.questionStats.length}
                  </div>
                  <div className="text-sm text-orange-700 dark:text-orange-300">Questions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Stats */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📊 Question Analysis
            </h3>
            
            {stats.questionStats.map((questionStat) => (
              <div
                key={questionStat.questionId}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6"
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                  {questionStat.questionText}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Response Count: {questionStat.responseCount}
                    </div>
                    {renderQuestionStats(questionStat)}
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-8 border-blue-200 dark:border-blue-800 flex items-center justify-center">
                      <div className="text-lg font-bold text-blue-600">
                        {Math.round((questionStat.responseCount / stats.totalResponses) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
