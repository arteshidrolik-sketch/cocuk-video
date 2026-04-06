import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getClientIP } from '@/lib/quota-check';

export const dynamic = 'force-dynamic';

// GET: Deneme durumunu döndür
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);

  let quota = await prisma.userQuota.findUnique({ where: { userId: ip } });
  if (!quota) {
    return NextResponse.json({
      trialUsed: false,
      isTrialActive: false,
      trialEndsAt: null,
      isPremium: false,
    });
  }

  let isTrialActive = false;
  let trialEndsAt: Date | null = null;

  if (quota.trialUsed && quota.trialStartDate) {
    trialEndsAt = new Date(quota.trialStartDate.getTime() + 24 * 60 * 60 * 1000);
    isTrialActive = new Date() < trialEndsAt;
  }

  return NextResponse.json({
    trialUsed: quota.trialUsed,
    isTrialActive,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    isPremium: quota.isPremium,
    dailyVideoCount: quota.dailyVideoCount,
  });
}

// POST: 1 günlük deneme başlat
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  let quota = await prisma.userQuota.findUnique({ where: { userId: ip } });

  if (!quota) {
    quota = await prisma.userQuota.create({ data: { userId: ip } });
  }

  if (quota.trialUsed) {
    return NextResponse.json(
      { error: 'trial_already_used', message: 'Deneme sürenizi daha önce kullandınız.' },
      { status: 400 }
    );
  }

  if (quota.isPremium) {
    return NextResponse.json(
      { error: 'already_premium', message: 'Zaten premium üyesiniz.' },
      { status: 400 }
    );
  }

  const trialStartDate = new Date();
  const trialEndsAt = new Date(trialStartDate.getTime() + 24 * 60 * 60 * 1000);

  await prisma.userQuota.update({
    where: { userId: ip },
    data: { trialUsed: true, trialStartDate },
  });

  return NextResponse.json({
    success: true,
    message: '1 günlük deneme süreniz başlatıldı!',
    trialStartDate: trialStartDate.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
  });
}
