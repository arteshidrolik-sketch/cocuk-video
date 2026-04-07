import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return '127.0.0.1';
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export interface QuotaCheckResult {
  allowed: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  trialEndsAt?: Date;
  dailyVideoCount: number;
  freeVideoLimit: number;
  response?: NextResponse;
}

export async function checkQuota(request: NextRequest): Promise<QuotaCheckResult> {
  const ip = getClientIP(request);

  // Get free video limit from settings
  const settings = await prisma.settings.findFirst();
  const freeVideoLimit = settings?.freeVideoLimit ?? 5;

  // Get or create user quota
  let quota = await prisma.userQuota.findUnique({ where: { userId: ip } });
  if (!quota) {
    quota = await prisma.userQuota.create({
      data: { userId: ip },
    });
  }

  // Reset daily count if it's a new day
  if (!isToday(quota.lastResetDate)) {
    quota = await prisma.userQuota.update({
      where: { userId: ip },
      data: { dailyVideoCount: 0, lastResetDate: new Date() },
    });
  }

  // Premium users — no limits
  if (quota.isPremium) {
    return { allowed: true, isPremium: true, isTrialActive: false, dailyVideoCount: quota.dailyVideoCount, freeVideoLimit };
  }

  // Check active subscription in Subscription table
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId: ip,
      status: 'ACTIVE',
      endDate: { gt: new Date() },
    },
  });
  if (activeSubscription) {
    // Sync isPremium flag
    await prisma.userQuota.update({
      where: { userId: ip },
      data: { isPremium: true },
    });
    return { allowed: true, isPremium: true, isTrialActive: false, dailyVideoCount: quota.dailyVideoCount, freeVideoLimit };
  }

  // Check active trial
  let isTrialActive = false;
  let trialEndsAt: Date | undefined;
  if (quota.trialUsed && quota.trialStartDate) {
    trialEndsAt = new Date(quota.trialStartDate.getTime() + 24 * 60 * 60 * 1000);
    isTrialActive = new Date() < trialEndsAt;
  }

  if (isTrialActive) {
    return { allowed: true, isPremium: false, isTrialActive: true, trialEndsAt, dailyVideoCount: quota.dailyVideoCount, freeVideoLimit };
  }

  // Check daily quota
  if (quota.dailyVideoCount >= freeVideoLimit) {
    const response = NextResponse.json(
      {
        error: 'quota_exceeded',
        message: `Günlük ${freeVideoLimit} video limitine ulaştınız. Premium'a geçerek sınırsız analiz yapabilirsiniz.`,
        dailyVideoCount: quota.dailyVideoCount,
        freeVideoLimit,
        trialUsed: quota.trialUsed,
      },
      { status: 429 }
    );
    return { allowed: false, isPremium: false, isTrialActive: false, dailyVideoCount: quota.dailyVideoCount, freeVideoLimit, response };
  }

  return { allowed: true, isPremium: false, isTrialActive: false, dailyVideoCount: quota.dailyVideoCount, freeVideoLimit };
}

export async function incrementQuota(request: NextRequest): Promise<void> {
  const ip = getClientIP(request);
  const quota = await prisma.userQuota.findUnique({ where: { userId: ip } });
  if (!quota || quota.isPremium) return;

  // Don't increment during active trial
  if (quota.trialUsed && quota.trialStartDate) {
    const trialEndsAt = new Date(quota.trialStartDate.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() < trialEndsAt) return;
  }

  await prisma.userQuota.update({
    where: { userId: ip },
    data: { dailyVideoCount: { increment: 1 } },
  });
}
