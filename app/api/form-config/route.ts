import { NextResponse } from 'next/server';
import { getFormConfig } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getFormConfig();
    return NextResponse.json({ data: config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
