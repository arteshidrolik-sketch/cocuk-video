import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyParentToken } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Yönetim paneli: kimlik doğrulama gerekli (BULGU-03)
  const authError = verifyParentToken(request);
  if (authError) return authError;
  try {
    const channels = await prisma.approvedChannel.findMany({
      orderBy: { addedAt: 'desc' },
    });
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Channels GET error:', error);
    return NextResponse.json({ error: 'Kanallar alınamadı' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Yönetim paneli: kimlik doğrulama gerekli (BULGU-03)
  const authError = verifyParentToken(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { channelId } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Kanal ID gerekli' }, { status: 400 });
    }

    // Kanal bilgisini YouTube'dan al
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
      return NextResponse.json({ error: 'YouTube API anahtarı ayarlanmamış' }, { status: 500 });
    }

    // channelId @handle veya UC ile başlayabilir
    let finalChannelId = channelId;
    let channelData: { channelName: string; channelThumbnail: string } | null = null;

    if (channelId.startsWith('@') || !channelId.startsWith('UC')) {
      // Handle veya username ile arama
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(channelId)}&type=channel&maxResults=1&key=${apiKey}`
      );
      const searchData = await searchRes.json();
      const channel = searchData.items?.[0];
      if (channel) {
        finalChannelId = channel.snippet?.channelId || channel.id?.channelId;
        channelData = {
          channelName: channel.snippet?.title || channelId,
          channelThumbnail: channel.snippet?.thumbnails?.default?.url || '',
        };
      }
    }

    if (!channelData) {
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${finalChannelId}&key=${apiKey}`
      );
      const channelInfo = await channelRes.json();
      const channel = channelInfo.items?.[0];
      if (channel) {
        channelData = {
          channelName: channel.snippet?.title || channelId,
          channelThumbnail: channel.snippet?.thumbnails?.default?.url || '',
        };
      } else {
        channelData = { channelName: channelId, channelThumbnail: '' };
      }
    }

    const newChannel = await prisma.approvedChannel.upsert({
      where: { channelId: finalChannelId },
      update: channelData,
      create: {
        channelId: finalChannelId,
        ...channelData,
      },
    });

    return NextResponse.json(newChannel);
  } catch (error) {
    console.error('Channels POST error:', error);
    return NextResponse.json({ error: 'Kanal eklenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Yönetim paneli: kimlik doğrulama gerekli (BULGU-03)
  const authError = verifyParentToken(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Kanal ID gerekli' }, { status: 400 });
    }

    await prisma.approvedChannel.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Channels DELETE error:', error);
    return NextResponse.json({ error: 'Kanal silinemedi' }, { status: 500 });
  }
}