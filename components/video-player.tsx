'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, SkipForward, Loader2, Play, CheckCircle, XCircle, Home } from 'lucide-react';

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, options: {
        videoId: string;
        events: {
          onReady?: (event: { target: YTPlayer }) => void;
          onStateChange?: (event: { data: number }) => void;
        };
        playerVars?: Record<string, number | string>;
      }) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
}

interface VideoItem {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  description?: string;
}

interface VideoPlayerProps {
  video: VideoItem;
  onClose: () => void;
}

export default function VideoPlayer({ video, onClose }: VideoPlayerProps) {
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [nextVideo, setNextVideo] = useState<VideoItem | null>(null);
  const [analyzingNext, setAnalyzingNext] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const playerRef = useRef<YTPlayer | null>(null);
  const relatedVideosRef = useRef<VideoItem[]>([]);
  const analyzingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    relatedVideosRef.current = relatedVideos;
  }, [relatedVideos]);

  useEffect(() => {
    analyzingRef.current = analyzingNext;
  }, [analyzingNext]);

  // Load YouTube IFrame API
  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        playerRef.current = new window.YT.Player('youtube-player', {
          videoId: video.videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onStateChange: (event) => {
              // 0 = ended
              if (event.data === 0) {
                handleVideoEnd();
              }
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [video.videoId]);

  // Fetch related videos
  useEffect(() => {
    const fetchRelated = async () => {
      setLoadingRelated(true);
      try {
        // Use first 3-4 meaningful words of title for better search results
        const shortQuery = video.title
          .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 1)
          .slice(0, 4)
          .join(' ')
          .trim();
        const searchQuery = shortQuery || video.channelName || 'çocuk video';
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.videos) {
          const filtered = data.videos.filter((v: VideoItem) => v.videoId !== video.videoId);
          setRelatedVideos(filtered.slice(0, 8));
        }
      } catch (err) {
        console.error('Benzer videolar yüklenemedi:', err);
      } finally {
        setLoadingRelated(false);
      }
    };
    fetchRelated();
  }, [video.videoId, video.title, video.channelName]);

  const handleVideoEnd = useCallback(() => {
    const videos = relatedVideosRef.current;
    if (videos.length > 0 && !analyzingRef.current) {
      analyzeAndPlayNext(videos[0]);
    }
  }, []);

  const analyzeAndPlayNext = async (videoToAnalyze: VideoItem) => {
    if (analyzingRef.current) return;
    
    setAnalyzingNext(true);
    analyzingRef.current = true;
    setNextVideo(videoToAnalyze);
    setAnalysisStatus('pending');
    setAnalysisMessage('Video analiz ediliyor...');
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoToAnalyze),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Stream okunamadı');

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      const lines = result.split('\n').filter(l => l.startsWith('data: '));
      const lastLine = lines[lines.length - 1];
      if (lastLine) {
        const jsonStr = lastLine.replace('data: ', '');
        const data = JSON.parse(jsonStr);

        if (data.decision === 'UYGUN') {
          setAnalysisStatus('approved');
          setAnalysisMessage('Video uygun! Açılıyor...');
          setTimeout(() => {
            window.location.href = `/?play=${videoToAnalyze.videoId}&title=${encodeURIComponent(videoToAnalyze.title)}&channel=${encodeURIComponent(videoToAnalyze.channelName)}`;
          }, 500);
        } else if (data.decision === 'BELIRSIZ') {
          setAnalysisStatus('rejected');
          setAnalysisMessage('Bu video ebeveyn onayı bekliyor.');
          tryNextInQueue(videoToAnalyze.videoId);
        } else {
          setAnalysisStatus('rejected');
          setAnalysisMessage(data.reason || 'Bu video uygun değil.');
          tryNextInQueue(videoToAnalyze.videoId);
        }
      }
    } catch (err) {
      console.error('Analiz hatası:', err);
      setAnalysisStatus('rejected');
      setAnalysisMessage('Analiz sırasında hata oluştu.');
      tryNextInQueue(videoToAnalyze.videoId);
    } finally {
      setAnalyzingNext(false);
      analyzingRef.current = false;
    }
  };

  const tryNextInQueue = (currentVideoId: string) => {
    const remaining = relatedVideosRef.current.filter(v => v.videoId !== currentVideoId);
    relatedVideosRef.current = remaining;
    setRelatedVideos(remaining);
    
    if (remaining.length > 0) {
      setTimeout(() => {
        analyzeAndPlayNext(remaining[0]);
      }, 1500);
    } else {
      setTimeout(() => {
        setNextVideo(null);
        setAnalysisStatus(null);
      }, 2000);
    }
  };

  const playVideoNow = (vid: VideoItem) => {
    if (!analyzingRef.current) {
      analyzeAndPlayNext(vid);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 overflow-hidden">
      {/* Header with exit button */}
      <div className="flex items-center justify-between p-3 md:p-4 flex-shrink-0">
        <h2 className="text-white font-semibold text-base md:text-lg truncate pr-4 flex-1">
          {video.title}
        </h2>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white hover:opacity-90 transition-all shadow-lg"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Ana Sayfa</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-all"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
      
      {/* Main video */}
      <div className="flex-1 flex items-center justify-center px-2 md:px-4 min-h-0">
        <div className="w-full max-w-5xl h-full flex items-center justify-center">
          <div className="relative w-full aspect-video bg-black rounded-xl md:rounded-2xl overflow-hidden shadow-2xl max-h-full">
            <div id="youtube-player" className="absolute inset-0 w-full h-full" />
          </div>
        </div>
      </div>

      {/* Analysis notification overlay */}
      {analysisStatus && nextVideo && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-sm rounded-2xl p-5 shadow-2xl border border-white/10 max-w-sm z-10">
          {analysisStatus === 'pending' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <div>
                <p className="text-white font-medium">{analysisMessage}</p>
                <p className="text-white/60 text-sm mt-1 truncate max-w-[250px]">{nextVideo.title}</p>
              </div>
            </div>
          )}
          {analysisStatus === 'approved' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
              <p className="text-white font-medium">{analysisMessage}</p>
            </div>
          )}
          {analysisStatus === 'rejected' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <XCircle className="w-10 h-10 text-red-400" />
              <div>
                <p className="text-white font-medium">{analysisMessage}</p>
                <p className="text-white/50 text-sm mt-1">Başka video deneniyor...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related videos - below the video */}
      <div className="flex-shrink-0 bg-gray-900/50 backdrop-blur-sm border-t border-white/10">
        <div className="p-3 md:p-4">
          <div className="flex items-center gap-2 mb-3">
            <SkipForward className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
            <h3 className="text-white font-semibold text-sm md:text-base">Sıradaki Videolar</h3>
          </div>

          {loadingRelated ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : relatedVideos.length === 0 ? (
            <p className="text-white/50 text-sm text-center py-4">Benzer video bulunamadı</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {relatedVideos.map((relatedVideo, index) => (
                <button
                  key={relatedVideo.videoId}
                  onClick={() => playVideoNow(relatedVideo)}
                  disabled={analyzingNext}
                  className="flex-shrink-0 w-40 md:w-48 bg-white/5 hover:bg-white/10 rounded-xl p-2 transition-all text-left group disabled:opacity-50"
                >
                  <div className="relative">
                    <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                      {relatedVideo.thumbnailUrl && (
                        <img
                          src={relatedVideo.thumbnailUrl}
                          alt={relatedVideo.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded">
                        Sıradaki
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <p className="text-white text-xs md:text-sm font-medium line-clamp-2 mt-2">
                    {relatedVideo.title}
                  </p>
                  <p className="text-white/50 text-xs mt-1 truncate">
                    {relatedVideo.channelName}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
