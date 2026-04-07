import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
      return NextResponse.json({ suggestions: [] });
    }

    // YouTube Search API ile öneriler al
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '5',
      safeSearch: 'strict',
      key: apiKey,
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();
    
    // Video başlıklarından öneriler oluştur
    const suggestions = (data.items || []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown>;
      return snippet?.title || '';
    }).filter((title: string) => title.length > 0);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('YouTube suggestions error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
