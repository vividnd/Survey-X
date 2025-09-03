'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitSurveyEncrypted } from '@/lib/surveyArcium';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multiple-choice' | 'rating';
  options?: string[];
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

interface SurveyResponseProps {
  survey: Survey;
  onSubmit: (responses: Record<string, unknown>) => void;
  onClose: () => void;
}

const createResponseSchema = (questions: Question[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  
  questions.forEach((question) => {
    switch (question.type) {
      case 'text':
        schemaFields[question.id] = z.string().min(1, 'This field is required');
        break;
      case 'multiple-choice':
        schemaFields[question.id] = z.string().min(1, 'Please select an option');
        break;
      case 'rating':
        schemaFields[question.id] = z.number().min(1, 'Please provide a rating').max(5, 'Rating must be between 1-5');
        break;
    }
  });
  
  return z.object(schemaFields);
};

export function SurveyResponse({ survey, onSubmit, onClose }: SurveyResponseProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const responseSchema = createResponseSchema(survey.questions);
  type ResponseData = z.infer<typeof responseSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ResponseData>({
    resolver: zodResolver(responseSchema),
  });

  // const currentQ = survey.questions[currentQuestion];
  const watchedValues = watch();

  const handleNext = () => {
    if (currentQuestion < survey.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleQuestionSubmit = async (data: ResponseData) => {
    try {
      setIsSubmitting(true);
      const allResponses = { ...responses, ...data };
      console.log('Submitting responses:', allResponses);
      // Call Arcium encrypted submission (stubbed now)
      if (wallet) {
        const res = await submitSurveyEncrypted(allResponses, connection, wallet);
        const msg = `Queued: ${res.queueSig}\nFinalized: ${res.finalizeSig}` + (res.decryptedResponse !== undefined ? `\nDecrypted result: ${res.decryptedResponse.toString()}` : '')
        alert(msg);
      }
      await onSubmit(allResponses);
      alert('Survey submitted successfully!');
      onClose();
    } catch (error) {
      alert('Failed to submit survey');
      console.error('Error submitting survey:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = () => {
    const question = survey.questions[currentQuestion];
    
    return (
      <div key={question.id} className="space-y-6">
        <div className="text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Question {currentQuestion + 1} of {survey.questions.length}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {question.text}
          </h3>
        </div>

        <div className="space-y-4">
          {question.type === 'text' && (
            <textarea
              {...register(question.id)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
              placeholder="Type your answer here..."
            />
          )}

          {question.type === 'multiple-choice' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <label key={index} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    value={option}
                    {...register(question.id)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-900 dark:text-white">{option}</span>
                </label>
              ))}
            </div>
          )}

          {question.type === 'rating' && (
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setValue(question.id, rating)}
                  className={`p-3 rounded-lg transition-colors ${
                    watchedValues[question.id] === rating
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  ⭐
                </button>
              ))}
            </div>
          )}

          {errors[question.id] && (
            <p className="text-sm text-red-600 text-center">
              {errors[question.id]?.message}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {survey.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {survey.description}
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
          <form onSubmit={handleSubmit(handleQuestionSubmit)}>
            {renderQuestion()}

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>

              <div className="flex gap-3">
                {currentQuestion < survey.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Survey'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
