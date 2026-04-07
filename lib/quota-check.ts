import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return '127.0.0.1';
}

export interface QuotaCheckResult {
  allowed: boolean;
  isPremium: boolean;
  isTrialActive: false;
  totalVideoCount: number;
  freeVideoLimit: number;
  response?: NextResponse;
}

const FREE_LIMIT = 10;

export async function checkQuota(request: NextRequest): Promise<QuotaCheckResult> {
  const ip = getClientIP(request);

  // Get or create user quota
  let quota = await prisma.userQuota.findUnique({ where: { userId: ip } });
  if (!quota) {
    quota = await prisma.userQuota.create({ data: { userId: ip } });
  }

  // Premium users — no limits
  if (quota.isPremium) {
    return { allowed: true, isPremium: true, isTrialActive: false, totalVideoCount: quota.dailyVideoCount, freeVideoLimit: FREE_LIMIT };
  }

  // Check active subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: { userId: ip, status: 'ACTIVE', endDate: { gt: new Date() } },
  });
  if (activeSubscription) {
    await prisma.userQuota.update({ where: { userId: ip }, data: { isPremium: true } });
    return { allowed: true, isPremium: true, isTrialActive: false, totalVideoCount: quota.dailyVideoCount, freeVideoLimit: FREE_LIMIT };
  }

  // 10 ücretsiz video kontrolü (toplam, günlük değil)
  if (quota.dailyVideoCount >= FREE_LIMIT) {
    const response = NextResponse.json(
      {
        error: 'quota_exceeded',
        message: `${FREE_LIMIT} ücretsiz video hakkınızı kullandınız. Devam etmek için bir paket seçin.`,
        totalVideoCount: quota.dailyVideoCount,
        freeVideoLimit: FREE_LIMIT,
        trialUsed: true,
      },
      { status: 429 }
    );
    return { allowed: false, isPremium: false, isTrialActive: false, totalVideoCount: quota.dailyVideoCount, freeVideoLimit: FREE_LIMIT, response };
  }

  return { allowed: true, isPremium: false, isTrialActive: false, totalVideoCount: quota.dailyVideoCount, freeVideoLimit: FREE_LIMIT };
}

export async function incrementQuota(request: NextRequest): Promise<void> {
  const ip = getClientIP(request);
  const quota = await prisma.userQuota.findUnique({ where: { userId: ip } });
  if (!quota || quota.isPremium) return;

  await prisma.userQuota.update({
    where: { userId: ip },
    data: { dailyVideoCount: { increment: 1 } },
  });
}
