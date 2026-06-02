import { NextRequest, NextResponse } from 'next/server';
import { getQuestions, createQuestion } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const questions = getQuestions();
    return NextResponse.json({ data: questions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, type, options, required, sort_order, description } = body;

    if (!label) {
      return NextResponse.json({ error: '题目标题为必填项' }, { status: 400 });
    }

    const validTypes = ['text', 'textarea', 'select', 'multiselect', 'code_select', 'number', 'checkbox'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: '不支持的题目类型' }, { status: 400 });
    }

    const { shuffle_options } = body;
    const question = createQuestion({
      label,
      type: type || 'text',
      options: options ? JSON.stringify(options) : null,
      required: required !== undefined ? (required ? 1 : 0) : 1,
      sort_order: sort_order || 0,
      description: description || '',
      shuffle_options: shuffle_options ? 1 : 0,
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
