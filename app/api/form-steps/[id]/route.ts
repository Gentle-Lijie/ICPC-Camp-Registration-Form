import { NextRequest, NextResponse } from 'next/server';
import { getFormStepById, updateFormStep } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const step = updateFormStep(id, body);
    if (!step) {
      return NextResponse.json({ error: '未找到该步骤' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: step });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
