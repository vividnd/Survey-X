import { createClient } from '@supabase/supabase-js';
import { store, type Survey, type SurveyResponseRecord } from './_store';

type SupabaseSurveyRow = Omit<Survey, 'keywords' | 'questions'> & {
  keywords: string[] | null;
  questions: unknown;
};

type SupabaseResponseRow = {
  id?: string;
  survey_id: string;
  timestamp: string;
  responses: unknown;
  arcium: unknown | null;
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY environment variables.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function listSurveys(): Promise<Survey[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('surveys')
    .select('*')
    .order('createdAt', { ascending: true });
  if (error) throw error;
  return (data as SupabaseSurveyRow[]).map((row) => ({
    ...row,
    keywords: row.keywords ?? [],
    questions: (row.questions as Survey['questions']) ?? [],
  }));
}

export async function createSurvey(survey: Survey): Promise<Survey> {
  const sb = getSupabase();
  const insertRow: SupabaseSurveyRow = {
    ...survey,
    keywords: survey.keywords,
    questions: survey.questions,
  };
  const { data, error } = await sb.from('surveys').insert(insertRow).select('*').single();
  if (error) throw error;
  const row = data as SupabaseSurveyRow;
  return {
    ...row,
    keywords: row.keywords ?? [],
    questions: (row.questions as Survey['questions']) ?? [],
  };
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('surveys')
    .select('*')
    .or(`id.eq.${id},publicId.eq.${id}`)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as SupabaseSurveyRow;
  return {
    ...row,
    keywords: row.keywords ?? [],
    questions: (row.questions as Survey['questions']) ?? [],
  };
}

export async function deleteSurvey(id: string): Promise<boolean> {
  const sb = getSupabase();
  const { error, count } = await sb.from('surveys').delete({ count: 'estimated' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function listResponses(surveyId: string): Promise<SurveyResponseRecord[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return (data as SupabaseResponseRow[]).map((r) => ({
    timestamp: r.timestamp,
    responses: r.responses as Record<string, unknown>,
    arcium: (r.arcium as SurveyResponseRecord['arcium']) ?? undefined,
  }));
}

export async function addResponse(surveyId: string, record: SurveyResponseRecord): Promise<void> {
  const sb = getSupabase();
  const row: SupabaseResponseRow = {
    survey_id: surveyId,
    timestamp: record.timestamp,
    responses: record.responses,
    arcium: record.arcium ?? null,
  };
  const { error } = await sb.from('responses').insert(row);
  if (error) throw error;
  // increment responseCount
  try {
    await sb.rpc('increment_response_count', { survey_id_input: surveyId });
  } catch (rpcError) {
    console.warn('Failed to increment response count:', rpcError);
    // Don't fail the whole operation for this
  }
}


