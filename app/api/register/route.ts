import { NextRequest, NextResponse } from 'next/server';
import { createRegistration, getQuestions, getFormFields } from '@/lib/db';
import { triggerWebhooks } from '@/lib/webhook';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Dynamic validation from form_fields config
    const formFields = getFormFields();
    const requiredFields = formFields.filter(f => f.required && f.visible);

    for (const field of requiredFields) {
      const value = body[field.field_key];
      if (!value || !String(value).trim()) {
        return NextResponse.json(
          { error: `请填写: ${field.label}` },
          { status: 400 }
        );
      }
    }

    // Phone format validation (if phone field is required/present)
    const phoneField = formFields.find(f => f.input_type === 'tel' && f.visible);
    if (phoneField && body[phoneField.field_key]) {
      if (!/^1[3-9]\d{9}$/.test(body[phoneField.field_key])) {
        return NextResponse.json(
          { error: `${phoneField.label}格式不正确` },
          { status: 400 }
        );
      }
    }

    // Validate required custom questions
    const questions = getQuestions().filter(q => q.required);
    const { responses } = body;
    if (responses && Array.isArray(responses)) {
      for (const q of questions) {
        const resp = responses.find((r: any) => r.question_id === q.id);
        if (!resp || !resp.response || resp.response.trim() === '') {
          return NextResponse.json(
            { error: `请填写: ${q.label}` },
            { status: 400 }
          );
        }
      }
    }

    // Build registration data dynamically
    const regData: any = {};
    for (const field of formFields) {
      if (body[field.field_key] !== undefined) {
        regData[field.field_key] = body[field.field_key];
      }
    }

    // Ensure core fields have defaults
    regData.name = regData.name || '';
    regData.student_id = regData.student_id || '';
    regData.phone = regData.phone || '';

    // OIerDB data
    regData.oierdb_id = body.oierdb_id || null;
    regData.oierdb_data = body.oierdb_data || null;
    regData.competition_history = body.competition_history || null;
    regData.responses = responses;

    const registration = createRegistration(regData);

    // Trigger webhooks
    await triggerWebhooks('registration.new', registration);

    return NextResponse.json({ success: true, data: registration }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
