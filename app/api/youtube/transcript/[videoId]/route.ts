import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

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
      return NextResponse.json({ transcript: '', available: false, error: 'Geçersiz video ID formatı' }, { status: 400 });
    }

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const text = transcript.map((t: { text: string }) => t.text).join(' ');
      return NextResponse.json({ transcript: text, available: true });
    } catch {
      return NextResponse.json({ transcript: '', available: false, message: 'Altyazı mevcut değil' });
    }
  } catch (error) {
    console.error('Transcript error:', error);
    return NextResponse.json({ transcript: '', available: false, error: 'Altyazı alınamadı' });
  }
}