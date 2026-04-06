import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifyParentToken } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          ageGroup: '3-13',
          predefinedFilters: { violence: true, fear: true, profanity: true, adult: true },
          customKeywords: [],
        },
      });
    }
    return NextResponse.json({
      ...settings,
      hasPassword: !!settings.parentPasswordHash,
      // Şifre hash'ini asla istemciye gönderme
      parentPasswordHash: undefined,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Ayarlar alınamadı' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Kimlik doğrulama kontrolü (BULGU-02 + BULGU-03)
  const authError = verifyParentToken(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { ageGroup, predefinedFilters, customKeywords, newPassword, currentPassword, dailyTimeLimitMinutes } = body;

    const updateData: Record<string, unknown> = {};
    if (ageGroup) updateData.ageGroup = ageGroup;
    if (predefinedFilters) updateData.predefinedFilters = predefinedFilters;
    if (customKeywords !== undefined) updateData.customKeywords = customKeywords;
    if (dailyTimeLimitMinutes !== undefined) {
      updateData.dailyTimeLimitMinutes = dailyTimeLimitMinutes === null ? null : parseInt(dailyTimeLimitMinutes);
    }

    // Şifre değiştirme — mevcut şifre zorunlu (BULGU-02)
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Şifre değiştirmek için mevcut şifre zorunludur' },
          { status: 400 }
        );
      }
      const settings = await prisma.settings.findFirst();
      if (settings?.parentPasswordHash) {
        const valid = await bcrypt.compare(currentPassword, settings.parentPasswordHash);
        if (!valid) {
          return NextResponse.json({ error: 'Mevcut şifre yanlış' }, { status: 401 });
        }
      }
      updateData.parentPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: updateData,
      create: {
        ageGroup: ageGroup || '3-13',
        predefinedFilters: predefinedFilters || { violence: true, fear: true, profanity: true, adult: true },
        customKeywords: customKeywords || [],
        dailyTimeLimitMinutes: dailyTimeLimitMinutes ? parseInt(dailyTimeLimitMinutes) : null,
        parentPasswordHash: newPassword ? await bcrypt.hash(newPassword, 10) : null,
      },
    });

    return NextResponse.json({
      ...settings,
      hasPassword: !!settings.parentPasswordHash,
      parentPasswordHash: undefined,
    });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 });
  }
}
