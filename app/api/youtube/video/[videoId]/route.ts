import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId;

    // videoId format doğrulaması: YouTube standart 11 karakter (BULGU-05)
    const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
    if (!VIDEO_ID_REGEX.test(videoId)) {
      return NextResponse.json({ error: 'Geçersiz video ID formatı' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
      return NextResponse.json({ error: 'YouTube API anahtarı ayarlanmamış' }, { status: 500 });
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Video bilgisi alınamadı' }, { status: response.status });
    }

    const data = await response.json();
    const video = data.items?.[0];

    if (!video) {
      return NextResponse.json({ error: 'Video bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({
      videoId,
      title: video.snippet?.title || '',
      channelId: video.snippet?.channelId || '',
      channelName: video.snippet?.channelTitle || '',
      thumbnailUrl: video.snippet?.thumbnails?.high?.url || '',
      description: video.snippet?.description || '',
      duration: video.contentDetails?.duration || '',
    });
  } catch (error) {
    console.error('Video info error:', error);
    return NextResponse.json({ error: 'Video bilgisi alınamadı' }, { status: 500 });
  }
}