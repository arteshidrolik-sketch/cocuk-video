import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const pageToken = searchParams.get('pageToken') || '';

    if (!query) {
      return NextResponse.json({ error: 'Arama sorgusu gerekli' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
      return NextResponse.json({ error: 'YouTube API anahtarı ayarlanmamış' }, { status: 500 });
    }

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '8',
      safeSearch: 'strict',
      key: apiKey,
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('YouTube API error:', error);
      return NextResponse.json({ error: 'YouTube API hatası' }, { status: response.status });
    }

    const data = await response.json();
    const videos = (data.items || []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      const id = item.id as Record<string, string>;
      const thumbnails = snippet.thumbnails as Record<string, Record<string, string>>;
      return {
        videoId: id?.videoId || '',
        title: snippet?.title || '',
        channelId: snippet?.channelId || '',
        channelName: snippet?.channelTitle || '',
        thumbnailUrl: thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url || '',
        description: snippet?.description || '',
      };
    });

    return NextResponse.json({
      videos,
      nextPageToken: data.nextPageToken || null,
    });
  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json({ error: 'Arama başarısız' }, { status: 500 });
  }
}