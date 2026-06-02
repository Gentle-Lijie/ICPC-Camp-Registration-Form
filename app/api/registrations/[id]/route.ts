import { NextRequest, NextResponse } from 'next/server';
import { getRegistrationById, updateRegistration, deleteRegistration } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const reg = getRegistrationById(id);
    if (!reg) {
      return NextResponse.json({ error: '未找到该报名记录' }, { status: 404 });
    }
    return NextResponse.json({ data: reg });
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

    const reg = updateRegistration(id, body);
    if (!reg) {
      return NextResponse.json({ error: '未找到该报名记录' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: reg });
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
    const success = deleteRegistration(id);
    if (!success) {
      return NextResponse.json({ error: '未找到该报名记录' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
