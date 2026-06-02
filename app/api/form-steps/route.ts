import { NextResponse } from 'next/server';
import { getFormSteps } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const steps = getFormSteps();
    return NextResponse.json({ data: steps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
