import { NextRequest, NextResponse } from 'next/server';
import { getQuestionById, updateQuestion, deleteQuestion } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const question = getQuestionById(id);
    if (!question) {
      return NextResponse.json({ error: '未找到该题目' }, { status: 404 });
    }
    return NextResponse.json({ data: question });
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
    if (typeof body.shuffle_options === 'boolean' || typeof body.shuffle_options === 'number') {
      body.shuffle_options = body.shuffle_options ? 1 : 0;
    }

    const question = updateQuestion(id, body);
    if (!question) {
      return NextResponse.json({ error: '未找到该题目' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: question });
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
    const success = deleteQuestion(id);
    if (!success) {
      return NextResponse.json({ error: '未找到该题目' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
