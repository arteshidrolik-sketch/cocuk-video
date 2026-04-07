import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkQuota, incrementQuota } from '@/lib/quota-check';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // Quota check
    const quota = await checkQuota(request);
    if (!quota.allowed && quota.response) {
      return quota.response;
    }

    const body = await request.json();
    const { videoId, title, description, channelId, channelName, thumbnailUrl } = body;

    // Onaylı kanal kontrolü
    const approvedChannel = await prisma.approvedChannel.findFirst({
      where: { channelId },
    });

    if (approvedChannel) {
      await prisma.videoHistory.create({
        data: {
          videoId,
          videoTitle: title,
          channelId,
          channelName,
          thumbnailUrl,
          status: 'approved',
          analysisResult: { decision: 'UYGUN', reason: 'Onaylı kanal', detectedIssues: [] },
          approvedBy: 'channel',
        },
      });
      await incrementQuota(request);
      return NextResponse.json({
        status: 'completed',
        decision: 'UYGUN',
        reason: 'Bu video onaylı bir kanaldan gelmektedir.',
        detectedIssues: [],
      });
    }

    // Transcript al (5 saniyelik timeout)
    let transcript = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get('host')}`;
      const transcriptRes = await fetch(`${baseUrl}/api/youtube/transcript/${videoId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const transcriptData = await transcriptRes.json();
      transcript = transcriptData.transcript || '';
    } catch {
      console.log('Transcript alınamadı, devam ediliyor...');
    }

    // Ayarları al
    const settings = await prisma.settings.findFirst();
    const predefinedFilters = (settings?.predefinedFilters as Record<string, boolean>) || { violence: true, fear: true, profanity: true, adult: true };
    const customKeywords = (settings?.customKeywords as string[]) || [];
    const ageGroup = settings?.ageGroup || '3-13';

    const activeFilters = [];
    if (predefinedFilters.violence) activeFilters.push('Şiddet');
    if (predefinedFilters.fear) activeFilters.push('Korku/Dehşet');
    if (predefinedFilters.profanity) activeFilters.push('Küfür/Argo');
    if (predefinedFilters.adult) activeFilters.push('Yetişkin İçerik');

    const prompt = `Sen bir çocuk içerik moderasyon uzmanısın. Aşağıdaki YouTube videosunun ${ageGroup} yaş grubundaki çocuklar için uygun olup olmadığını analiz et.

Filtreleme Kriterleri:
- Önceden tanımlı: ${activeFilters.join(', ')}
- Ebeveyn tarafından eklenen özel kriterler: ${customKeywords.length > 0 ? customKeywords.join(', ') : 'Yok'}

Video Bilgileri:
- Başlık: ${title}
- Açıklama: ${description || 'Açıklama yok'}
- Kanal: ${channelName}
- Transcript: ${transcript ? transcript.substring(0, 3000) : 'Altyazı mevcut değil'}

ÖNEMLİ: Sadece aşağıdaki JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "decision": "UYGUN" veya "UYGUN_DEGIL" veya "BELIRSIZ",
  "reason": "Kısa açıklama",
  "detectedIssues": ["sorun1", "sorun2"] veya []
}`;

    // LLM çağrısı (non-streaming)
    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    const llmData = await llmResponse.json();
    const content = llmData.choices?.[0]?.message?.content || '{}';

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { decision: 'BELIRSIZ', reason: 'Analiz sonucu işlenemedi', detectedIssues: [] };
    }

    const decision = result.decision || 'BELIRSIZ';
    const reason = result.reason || 'Analiz tamamlandı';
    const detectedIssues = result.detectedIssues || [];

    // Veritabanına kaydet
    if (decision === 'BELIRSIZ') {
      await prisma.pendingApproval.upsert({
        where: { videoId },
        update: {
          videoTitle: title,
          channelId,
          channelName,
          thumbnailUrl,
          analysisResult: { decision, reason, detectedIssues },
        },
        create: {
          videoId,
          videoTitle: title,
          channelId,
          channelName,
          thumbnailUrl,
          analysisResult: { decision, reason, detectedIssues },
        },
      });
    } else {
      await prisma.videoHistory.create({
        data: {
          videoId,
          videoTitle: title,
          channelId,
          channelName,
          thumbnailUrl,
          status: decision === 'UYGUN' ? 'approved' : 'rejected',
          analysisResult: { decision, reason, detectedIssues },
          approvedBy: 'system',
        },
      });
    }

    await incrementQuota(request);

    return NextResponse.json({
      status: 'completed',
      decision,
      reason,
      detectedIssues,
    });

  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ status: 'error', message: 'Analiz başarısız' }, { status: 500 });
  }
}
