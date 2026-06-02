import { NextRequest, NextResponse } from 'next/server';
import { getWebhookById, updateWebhook, deleteWebhook } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const webhook = getWebhookById(id);
    if (!webhook) {
      return NextResponse.json({ error: '未找到该 Webhook' }, { status: 404 });
    }
    return NextResponse.json({ data: webhook });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();

    if (body.events && Array.isArray(body.events)) {
      body.events = JSON.stringify(body.events);
    }

    const webhook = updateWebhook(id, body);
    if (!webhook) {
      return NextResponse.json({ error: '未找到该 Webhook' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: webhook });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const success = deleteWebhook(id);
    if (!success) {
      return NextResponse.json({ error: '未找到该 Webhook' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
