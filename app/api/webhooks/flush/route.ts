import { NextRequest, NextResponse } from 'next/server';
import { flushWebhookQueue } from '@/lib/webhook';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhook_id');
    const result = await flushWebhookQueue(webhookId ? parseInt(webhookId) : undefined);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
