import { NextRequest, NextResponse } from 'next/server';
import { testWebhook } from '@/lib/webhook';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const result = await testWebhook(id);
    if (!result.ok && result.error === 'Webhook not found') {
      return NextResponse.json({ error: '未找到该 Webhook' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
