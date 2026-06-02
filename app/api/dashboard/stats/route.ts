import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = getDashboardStats();
    return NextResponse.json({ data: stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
