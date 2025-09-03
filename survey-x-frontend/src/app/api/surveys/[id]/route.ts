import { NextRequest } from 'next/server';
import { deleteSurvey, getSurveyById } from '../../_storage';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const survey = await getSurveyById(params.id);
  if (!survey) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  return Response.json({ success: true, data: survey });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = await deleteSurvey(params.id);
  if (!ok) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  return Response.json({ success: true });
}


