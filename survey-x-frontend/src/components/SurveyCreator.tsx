'use client';

import { useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSurveyEncrypted } from '@/lib/surveyArcium';

const surveySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  maxResponses: z.number().optional(),
  questions: z.array(z.object({
    text: z.string().min(1, 'Question text is required'),
    type: z.enum(['text', 'multiple-choice', 'rating']),
  })).min(1, 'At least one question is required'),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyCreatorProps {
  onCreateSurvey: (survey: {
    title: string;
    description: string;
    questionCount: number;
    isActive: boolean;
    questions: {
      id: string;
      text: string;
      type: 'text' | 'multiple-choice' | 'rating';
      options?: string[];
    }[];
  }) => void;
}

export function SurveyCreator({ onCreateSurvey }: SurveyCreatorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      questions: [{ text: '', type: 'text' as const }],
    },
  });

  const questions = watch('questions');

  const addQuestion = () => {
    setValue('questions', [...questions, { text: '', type: 'text' as const }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setValue('questions', questions.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: SurveyFormData) => {
    try {
      // STRICT WALLET ENFORCEMENT - No wallet = No survey creation
      if (!wallet) {
        alert('❌ WALLET REQUIRED\n\nYou must connect your Solana wallet to create surveys.\n\nThis ensures your survey is properly encrypted and stored on-chain via Arcium Network.');
        return;
      }

      if (!wallet.publicKey) {
        alert('❌ WALLET NOT READY\n\nYour wallet is connected but not ready.\n\nPlease ensure your wallet is fully loaded and try again.');
        return;
      }

      setIsCreating(true);

      const now = new Date();
      const startDate = data.startDate ? new Date(data.startDate) : now;
      const endDate = data.endDate ? new Date(data.endDate) : null;
      
      // Validate dates
      if (endDate && startDate >= endDate) {
        alert('❌ End date must be after start date');
        setIsCreating(false);
        return;
      }
      
      const surveyData = {
        title: data.title,
        description: data.description,
        questionCount: data.questions.length,
        isActive: true,
        startDate: data.startDate,
        endDate: data.endDate,
        maxResponses: data.maxResponses,
        questions: data.questions.map((q, index) => ({
          id: `q${index + 1}`,
          text: q.text,
          type: q.type,
        })),
      };
      
      // MANDATORY ARCIUM TRANSACTION - This MUST succeed or survey creation fails
      console.log('🔐 Initiating Arcium encrypted survey creation...');
      const arciumResult = await createSurveyEncrypted(surveyData, connection, wallet);
      
      if (!arciumResult) {
        throw new Error('Arcium transaction failed - no result returned');
      }

      console.log('✅ Arcium transaction successful:', arciumResult);
      alert('🔐 Survey encrypted and committed on-chain successfully!\n\nNow saving to database...');

      // Only save to database after successful blockchain transaction
      await onCreateSurvey(surveyData);
      
      alert('🎉 SURVEY CREATED SUCCESSFULLY!\n\n✅ Encrypted on Arcium Network\n✅ Stored in database\n✅ Ready for responses');
      setIsCreating(false);
      reset();
    } catch (error) {
      console.error('❌ Survey creation failed:', error);
      setIsCreating(false);
      
      if (error instanceof Error && error.message.includes('Arcium')) {
        alert(`❌ BLOCKCHAIN TRANSACTION FAILED\n\nYour survey could not be created because the Arcium Network transaction failed.\n\nError: ${error.message}\n\nPlease:\n• Check your wallet has enough SOL for gas\n• Ensure you're on Solana Devnet\n• Try again`);
      } else {
        alert(`❌ SURVEY CREATION FAILED\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your wallet connection and try again.`);
      }
    }
  };

  if (!isCreating) {
    return (
      <button
        onClick={() => setIsCreating(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Create New Survey
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Survey</h2>
        <button
          onClick={() => setIsCreating(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Survey Title
          </label>
          <input
            {...register('title')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter survey title"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter survey description"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        {/* Survey Timing Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="datetime-local"
              {...register('startDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              {...register('endDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Responses (Optional)
            </label>
            <input
              type="number"
              {...register('maxResponses', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="No limit"
              min="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Questions
          </label>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="flex gap-2">
                <input
                  {...register(`questions.${index}.text`)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter question text"
                />
                <select
                  {...register(`questions.${index}.type`)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="text">Text</option>
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="rating">Rating</option>
                </select>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {errors.questions && (
            <p className="mt-1 text-sm text-red-600">{errors.questions.message}</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={addQuestion}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
          >
            Add Question
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            Create Survey
          </button>
        </div>
      </form>
    </div>
  );
}
