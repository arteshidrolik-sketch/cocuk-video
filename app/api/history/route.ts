import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyParentToken } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Yönetim paneli: kimlik doğrulama gerekli (BULGU-03)
  const authError = verifyParentToken(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [history, total] = await Promise.all([
      prisma.videoHistory.findMany({
        where,
        orderBy: { watchedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.videoHistory.count({ where }),
    ]);

    return NextResponse.json({ history, total });
  } catch (error) {
    console.error('History GET error:', error);
    return NextResponse.json({ error: 'Geçmiş alınamadı' }, { status: 500 });
  }
}