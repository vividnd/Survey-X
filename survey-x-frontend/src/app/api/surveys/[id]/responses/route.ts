import { NextRequest } from 'next/server';
import type { SurveyResponseRecord } from '../../../_store';
import { listResponses, addResponse } from '../../../_storage';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const list = await listResponses(params.id);
  return Response.json({ success: true, data: list });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json()) as SurveyResponseRecord;
    await addResponse(params.id, body);
    return Response.json({ success: true }, { status: 201 });
  } catch (e) {
    return Response.json({ success: false, error: (e as Error).message }, { status: 400 });
  }
}


