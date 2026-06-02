import { NextRequest, NextResponse } from 'next/server';
import { getWebhooks, createWebhook } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const webhooks = getWebhooks();
    return NextResponse.json({ data: webhooks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, secret, events, frequency, is_active } = body;

    if (!name || !url) {
      return NextResponse.json({ error: '名称和 URL 为必填项' }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'URL 格式不正确' }, { status: 400 });
    }

    const webhook = createWebhook({
      name,
      url,
      secret: secret || '',
      events: JSON.stringify(events || ['registration.new']),
      frequency: frequency || 'realtime',
      is_active: is_active !== undefined ? (is_active ? 1 : 0) : 1,
    });

    return NextResponse.json({ success: true, data: webhook }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
