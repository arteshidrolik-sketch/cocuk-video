import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recent = await prisma.videoHistory.findMany({
      where: { status: 'approved' },
      orderBy: { watchedAt: 'desc' },
      take: 8,
    });
    return NextResponse.json(recent);
  } catch (error) {
    console.error('Recent GET error:', error);
    return NextResponse.json({ error: 'Son videolar alınamadı' }, { status: 500 });
  }
}