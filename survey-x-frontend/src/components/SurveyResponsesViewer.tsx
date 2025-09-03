'use client';

interface SurveyResponsesViewerProps {
  surveyId: string;
  surveyTitle: string;
  onClose: () => void;
}

interface ResponseItem {
  timestamp: string;
  responses: Record<string, unknown>;
  arcium?: { queueSig: string; finalizeSig: string; decryptedResponse?: string };
}

import { useEffect, useState } from 'react';

export function SurveyResponsesViewer({ surveyId, surveyTitle, onClose }: SurveyResponsesViewerProps) {
  const [items, setItems] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/surveys/${surveyId}/responses`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load responses');
        const json = await res.json();
        setItems(Array.isArray(json?.data) ? json.data : []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [surveyId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Responses</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{surveyTitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>
        <div className="p-6">
          {loading && <div className="text-gray-500 dark:text-gray-400">Loading...</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400">No responses yet.</div>
          )}
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto">{JSON.stringify(item.responses, null, 2)}</pre>
                {item.arcium && (
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <div>queueSig: <code className="break-all">{item.arcium.queueSig}</code></div>
                    <div>finalizeSig: <code className="break-all">{item.arcium.finalizeSig}</code></div>
                    {item.arcium.decryptedResponse && (
                      <div>decryptedResponse: <code className="break-all">{item.arcium.decryptedResponse}</code></div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


