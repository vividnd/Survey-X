import { NextRequest } from 'next/server';
import type { Survey } from '../_store';
import { listSurveys, createSurvey } from '../_storage';

export async function GET() {
  const surveys = await listSurveys();
  return Response.json({ success: true, data: surveys });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<Survey, 'id' | 'publicId' | 'createdAt' | 'responseCount' | 'keywords'> & {
      id?: string;
      publicId?: string;
      createdAt?: string;
      responseCount?: number;
      keywords?: string[];
    };

    // Allow caller to provide full Survey (from current UI), otherwise minimally construct
    let incoming: Survey;
    if ('id' in body && 'publicId' in body && 'createdAt' in body && 'responseCount' in body && 'keywords' in body) {
      incoming = body as unknown as Survey;
    } else {
      const id = Date.now().toString();
      const createdAt = new Date().toISOString();
      const keywords = [] as string[];
      incoming = {
        id,
        publicId: id,
        createdAt,
        responseCount: 0,
        keywords,
        title: body.title,
        description: body.description,
        questionCount: body.questions?.length ?? 0,
        isActive: body.isActive ?? true,
        startDate: body.startDate,
        endDate: body.endDate,
        maxResponses: body.maxResponses,
        questions: (body as any).questions ?? [],
      };
    }

    const saved = await createSurvey(incoming);
    return Response.json({ success: true, data: saved }, { status: 201 });
  } catch (e) {
    return Response.json({ success: false, error: (e as Error).message }, { status: 400 });
  }
}


