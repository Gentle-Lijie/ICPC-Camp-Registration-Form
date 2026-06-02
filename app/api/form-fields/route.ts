import { NextRequest, NextResponse } from 'next/server';
import { getFormFields, createFormField } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const fields = getFormFields();
    return NextResponse.json({ data: fields });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step_key, field_key, label, input_type, placeholder, required, visible, sort_order, options, description } = body;

    if (!step_key || !field_key || !label) {
      return NextResponse.json({ error: '步骤、字段键和标签为必填项' }, { status: 400 });
    }

    if (options && Array.isArray(options)) {
      body.options = JSON.stringify(options);
    }

    const field = createFormField({
      step_key,
      field_key,
      label,
      input_type: input_type || 'text',
      placeholder: placeholder || '',
      required: required ? 1 : 0,
      visible: visible !== undefined ? (visible ? 1 : 0) : 1,
      sort_order: sort_order || 0,
      options: body.options || null,
      description: description || '',
    });

    return NextResponse.json({ success: true, data: field }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
