import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyParentToken } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

// Geçerli action değerleri (BULGU-06)
const VALID_ACTIONS = ['approve', 'reject'] as const;
type PendingAction = typeof VALID_ACTIONS[number];

export async function GET(request: NextRequest) {
  // Yönetim paneli: kimlik doğrulama gerekli (BULGU-03)
  const authError = verifyParentToken(request);
  if (authError) return authError;

  try {
    const pending = await prisma.pendingApproval.findMany({
      orderBy: { requestedAt: 'desc' },
    });
    return NextResponse.json(pending);
  } catch (error) {
    console.error('Pending GET error:', error);
    return NextResponse.json({ error: 'Bekleyen onaylar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Yönetim paneli: kimlik doğrulama gerekli (BULGU-03)
  const authError = verifyParentToken(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { videoId, action } = body; // action: 'approve' | 'reject'

    // Action değeri doğrulaması (BULGU-06)
    if (!VALID_ACTIONS.includes(action as PendingAction)) {
      return NextResponse.json(
        { error: `Geçersiz işlem. İzin verilen değerler: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const pending = await prisma.pendingApproval.findUnique({
      where: { videoId },
    });

    if (!pending) {
      return NextResponse.json({ error: 'Bekleyen onay bulunamadı' }, { status: 404 });
    }

    // Geçmişe kaydet
    await prisma.videoHistory.create({
      data: {
        videoId: pending.videoId,
        videoTitle: pending.videoTitle,
        channelId: pending.channelId,
        channelName: pending.channelName,
        thumbnailUrl: pending.thumbnailUrl,
        status: action === 'approve' ? 'approved' : 'rejected',
        analysisResult: pending.analysisResult ?? undefined,
        approvedBy: 'parent',
      },
    });

    // Bekleyenden sil
    await prisma.pendingApproval.delete({
      where: { videoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pending POST error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}