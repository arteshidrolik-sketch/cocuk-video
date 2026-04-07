import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, plan, merchantOid } = await request.json();

    if (!userId || !plan) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });
    }

    // Check active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        paytrPaymentId: merchantOid,
        status: 'ACTIVE',
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Abonelik bulunamadı' }, { status: 404 });
    }

    // Mark user as premium in quota table
    await prisma.userQuota.upsert({
      where: { userId },
      update: { isPremium: true },
      create: { userId, isPremium: true },
    });

    return NextResponse.json({ success: true, message: 'Premium aktifleştirildi' });
  } catch (error) {
    console.error('Payment notify error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId gerekli' }, { status: 400 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    hasSubscription: !!subscription,
    subscription: subscription || null,
  });
}
