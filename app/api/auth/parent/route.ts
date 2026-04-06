import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signParentToken } from '@/lib/auth-middleware';
import { isRateLimited, resetRateLimit, getRateLimitInfo } from '@/lib/login-rate-limit';

export const dynamic = 'force-dynamic';

/** İstek kaynağının IP adresini okur */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, action } = body;

    const settings = await prisma.settings.findFirst();

    if (action === 'setup') {
      if (settings?.parentPasswordHash) {
        return NextResponse.json({ error: 'Kayıt zaten yapılmış' }, { status: 400 });
      }
      const { firstName, lastName } = body;
      if (!firstName || !lastName) {
        return NextResponse.json({ error: 'İsim ve soyisim zorunludur' }, { status: 400 });
      }
      const hash = await bcrypt.hash(password, 10);
      await prisma.settings.upsert({
        where: { id: 1 },
        update: {
          parentPasswordHash: hash,
          parentFirstName: firstName,
          parentLastName: lastName,
        },
        create: {
          parentPasswordHash: hash,
          parentFirstName: firstName,
          parentLastName: lastName,
          ageGroup: '3-13',
          predefinedFilters: { violence: true, fear: true, profanity: true, adult: true },
          customKeywords: [],
        },
      });
      return NextResponse.json({ success: true, message: 'Kayıt başarıyla tamamlandı' });
    }

    if (action === 'login') {
      const ip = getClientIp(request);

      // Rate limit kontrolü (BULGU-04)
      if (isRateLimited(ip)) {
        const { resetInMs } = getRateLimitInfo(ip);
        const resetInSec = Math.ceil(resetInMs / 1000);
        return NextResponse.json(
          {
            error: `Çok fazla başarısız deneme. Lütfen ${resetInSec} saniye bekleyin.`,
            retryAfterSeconds: resetInSec,
          },
          { status: 429 }
        );
      }

      if (!settings?.parentPasswordHash) {
        return NextResponse.json({ error: 'Şifre henüz ayarlanmamış' }, { status: 400 });
      }

      const valid = await bcrypt.compare(password, settings.parentPasswordHash);
      if (!valid) {
        const { remaining } = getRateLimitInfo(ip);
        return NextResponse.json(
          {
            error: 'Yanlış şifre',
            attemptsRemaining: Math.max(0, remaining - 1),
          },
          { status: 401 }
        );
      }

      // Başarılı giriş — rate limit sayacını sıfırla, JWT token ver
      resetRateLimit(ip);
      const token = signParentToken();
      return NextResponse.json({ success: true, message: 'Giriş başarılı', token });
    }

    if (action === 'change') {
      const { currentPassword, newPassword } = body;
      if (!settings?.parentPasswordHash) {
        return NextResponse.json({ error: 'Şifre henüz ayarlanmamış' }, { status: 400 });
      }
      const valid = await bcrypt.compare(currentPassword, settings.parentPasswordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Mevcut şifre yanlış' }, { status: 401 });
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.settings.update({
        where: { id: 1 },
        data: { parentPasswordHash: hash },
      });
      return NextResponse.json({ success: true, message: 'Şifre başarıyla değiştirildi' });
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    console.error('Parent auth error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}
