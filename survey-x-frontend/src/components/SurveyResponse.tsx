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
  onSubmit: (
    responses: Record<string, unknown>,
    arcium?: { queueSig: string; finalizeSig: string; decryptedResponse?: string }
  ) => void;
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
    setIsSubmitting(true);
    const allResponses = { ...responses, ...data };
    console.log('Submitting responses:', allResponses);

    // STRICT WALLET ENFORCEMENT - No wallet = No survey response
    if (!wallet) {
      alert('❌ WALLET REQUIRED\n\nYou must connect your Solana wallet to submit survey responses.\n\nThis ensures your response is properly encrypted and stored on-chain via Arcium Network.');
      setIsSubmitting(false);
      return;
    }

    if (!wallet.publicKey) {
      alert('❌ WALLET NOT READY\n\nYour wallet is connected but not ready.\n\nPlease ensure your wallet is fully loaded and try again.');
      setIsSubmitting(false);
      return;
    }

    let arciumMeta: { queueSig: string; finalizeSig: string; decryptedResponse?: string } | undefined;
    
    // MANDATORY ARCIUM TRANSACTION - This MUST succeed or response submission fails
    try {
      console.log('🔐 Initiating Arcium encrypted response submission...');
      const res = await submitSurveyEncrypted(allResponses, connection, wallet);
      
      if (!res || !res.queueSig || !res.finalizeSig) {
        throw new Error('Arcium transaction failed - incomplete result returned');
      }
      
      arciumMeta = {
        queueSig: res.queueSig,
        finalizeSig: res.finalizeSig,
        decryptedResponse: res.decryptedResponse !== undefined ? res.decryptedResponse.toString() : undefined,
      };
      
      console.log('✅ Arcium transaction successful:', arciumMeta);
      alert('🔐 Response encrypted and committed on-chain successfully!\n\nNow saving to database...');
    } catch (e) {
      console.error('❌ Arcium submission failed:', e);
      setIsSubmitting(false);
      
      if (e instanceof Error && e.message.includes('Arcium')) {
        alert(`❌ BLOCKCHAIN TRANSACTION FAILED\n\nYour response could not be submitted because the Arcium Network transaction failed.\n\nError: ${e.message}\n\nPlease:\n• Check your wallet has enough SOL for gas\n• Ensure you're on Solana Devnet\n• Try again`);
      } else {
        alert(`❌ ENCRYPTION FAILED\n\nFailed to submit encrypted response on-chain.\n\nError: ${e instanceof Error ? e.message : 'Unknown error'}\n\nPlease check your wallet connection and try again.`);
      }
      return;
    }

    // Only save to database after successful blockchain transaction
    try {
      await onSubmit(allResponses, arciumMeta);
      alert('🎉 RESPONSE SUBMITTED SUCCESSFULLY!\n\n✅ Encrypted on Arcium Network\n✅ Stored in database\n✅ Your privacy is protected');
      onClose();
    } catch (error) {
      console.error('❌ Database submission failed:', error);
      alert(`❌ DATABASE SAVE FAILED\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nYour on-chain transaction was successful, but the response couldn't be saved.\n\nPlease contact support with your transaction signatures:\n• Queue: ${arciumMeta?.queueSig}\n• Finalize: ${arciumMeta?.finalizeSig}`);
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
