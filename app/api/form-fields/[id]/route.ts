import { NextRequest, NextResponse } from 'next/server';
import { getFormFieldById, updateFormField, deleteFormField } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const field = getFormFieldById(id);
    if (!field) {
      return NextResponse.json({ error: '未找到该字段' }, { status: 404 });
    }
    return NextResponse.json({ data: field });
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

    if (body.options && Array.isArray(body.options)) {
      body.options = JSON.stringify(body.options);
    }
    if (typeof body.required === 'boolean') {
      body.required = body.required ? 1 : 0;
    }
    if (typeof body.visible === 'boolean') {
      body.visible = body.visible ? 1 : 0;
    }

    const field = updateFormField(id, body);
    if (!field) {
      return NextResponse.json({ error: '未找到该字段' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: field });
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
    const success = deleteFormField(id);
    if (!success) {
      return NextResponse.json({ error: '未找到该字段' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
