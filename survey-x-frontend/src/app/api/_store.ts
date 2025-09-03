// Simple in-memory store for surveys and responses.
// Note: This resets on serverless cold start. Replace with a real DB for durability.

export type Question = {
  id: string;
  text: string;
  type: 'text' | 'multiple-choice' | 'rating';
  options?: string[];
};

export type Survey = {
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
  questions: Question[];
};

export type ResponseMeta = {
  queueSig: string;
  finalizeSig: string;
  decryptedResponse?: string;
};

export type SurveyResponseRecord = {
  timestamp: string;
  responses: Record<string, unknown>;
  arcium?: ResponseMeta;
};

export const store: {
  surveys: Survey[];
  responses: Record<string, SurveyResponseRecord[]>;
} = {
  surveys: [],
  responses: {},
};


