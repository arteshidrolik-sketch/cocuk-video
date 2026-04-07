'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Search, Play, Star, Shield, Lock, Eye, EyeOff, User, Zap } from 'lucide-react';
import ChildHeader from '@/components/child-header';
import VideoCard from '@/components/video-card';
import VideoAnalyzer from '@/components/video-analyzer';
import VideoPlayer from '@/components/video-player';

interface VideoItem {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string;
  description?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Quota / freemium state
  const [videoCount, setVideoCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  // Setup state
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check if setup is needed
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (!data.hasPassword) {
          setNeedsSetup(true);
        }
      } catch {
        console.error('Ayarlar kontrol edilemedi');
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, []);

  // Check URL params for auto-play
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const playId = params.get('play');
      const playTitle = params.get('title');
      const playChannel = params.get('channel');
      
      if (playId && playTitle) {
        setPlayingVideo({
          videoId: playId,
          title: decodeURIComponent(playTitle),
          channelId: '',
          channelName: playChannel ? decodeURIComponent(playChannel) : '',
          thumbnailUrl: `https://i.ytimg.com/vi/CMEKPq-wYfI/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCiulyySIOy3l9vvKoxBFp5nR9IxA`,
        });
        // Clear URL params
        window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  useEffect(() => {
    if (!needsSetup && !checkingSetup) {
      const loadRecent = async () => {
        try {
          const res = await fetch('/api/recent');
          const data = await res.json();
          if (Array.isArray(data)) {
            setRecentVideos(data.map((v: Record<string, unknown>) => ({
              videoId: v.videoId as string,
              title: v.videoTitle as string,
              channelId: v.channelId as string || '',
              channelName: v.channelName as string,
              thumbnailUrl: v.thumbnailUrl as string || '',
            })));
          }
        } catch {
          console.error('Son videolar yüklenemedi');
        }
      };
      loadRecent();
    }
  }, [needsSetup, checkingSetup]);

  // Quota bilgisini yükle
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await fetch('/api/trial');
        const data = await res.json();
        setVideoCount(data.dailyVideoCount ?? 0);
        setIsPremium(data.isPremium ?? false);
        // Zaten 10 videoyu kullanmış ve premium değilse → /premium
        if (!data.isPremium && (data.dailyVideoCount ?? 0) >= 10) {
          router.push('/premium');
        }
      } catch {
        // ignore
      }
    };
    fetchQuota();
  }, [router]);

  const handleStartTrial = async () => {
    // Trial kaldırıldı — kullanılmıyor
    try {
      const res = await fetch('/api/trial', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTrialMessage(data.message || 'Deneme başlatılamadı.');
      }
    } catch {
      setTrialMessage('Bağlantı hatası.');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleQuotaExceeded = (_data: { dailyVideoCount: number; freeVideoLimit: number; trialUsed: boolean }) => {
    router.push('/premium');
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (!firstName.trim() || !lastName.trim()) {
      setSetupError('İsim ve soyisim zorunludur.');
      return;
    }

    if (setupPassword.length < 4) {
      setSetupError('Şifre en az 4 karakter olmalıdır.');
      return;
    }

    if (setupPassword !== setupConfirm) {
      setSetupError('Şifreler eşleşmiyor.');
      return;
    }

    setSetupLoading(true);
    try {
      const res = await fetch('/api/auth/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'setup', 
          password: setupPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNeedsSetup(false);
      } else {
        setSetupError(data.error || 'Kayıt başarısız');
      }
    } catch (err) {
      console.error('Setup error:', err);
      setSetupError('Bağlantı hatası: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setHasSearched(true);
    setLoading(true);
    setError('');
    setVideos([]);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Arama başarısız');
        return;
      }
      setVideos(data.videos || []);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video: VideoItem) => {
    setSelectedVideo(video);
  };

  const handleVideoApproved = () => {
    if (selectedVideo) {
      setPlayingVideo(selectedVideo);
      setSelectedVideo(null);
    }
  };

  // Loading state
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Setup screen (Kayıt Ekranı)
  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl mb-4 shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Ebeveyn Kaydı 👋
            </h1>
            <p className="text-gray-600">
              Çocuğunuz için güvenli video platformuna başlamak için kayıt olun.
            </p>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İsim
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Adınız"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Soyisim
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Soyadınız"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şifre Oluştur
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Şifre (en az 4 karakter)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Şifreyi tekrar girin"
                />
              </div>
            </div>

            {setupError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {setupError}
              </div>
            )}

            <button
              type="submit"
              disabled={setupLoading}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {setupLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                'Kayıt Ol ve Başla'
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
            <h3 className="font-medium text-indigo-800 mb-2">ℹ️ Bilgilendirme</h3>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• Bu şifre ebeveyn paneline giriş için kullanılacak</li>
              <li>• Filtreleme ayarlarını yönetebileceksiniz</li>
              <li>• Onaylı kanallar ekleyebileceksiniz</li>
              <li>• İzleme geçmişini takip edebileceksiniz</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ChildHeader onSearch={handleSearch} searchQuery={searchQuery} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!hasSearched ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl mb-6 shadow-xl animate-bounce-slow">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Merhaba! 👋
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Güvenli video izleme platformuna hoş geldin! 🌟
            </p>
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 max-w-xl mx-auto shadow-xl">
              <Search className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Yukarıdaki arama kutusunu kullanarak izlemek istediğin videoyu ara!
              </p>
            </div>

            {recentVideos.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Star className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl font-bold text-gray-800">Son İzlenenler</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recentVideos.slice(0, 4).map((video) => (
                    <VideoCard
                      key={video.videoId}
                      {...video}
                      onClick={() => handleVideoClick(video)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-lg text-gray-600">Videolar aranıyor...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">😢</span>
                </div>
                <p className="text-lg text-red-600">{error}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Lütfen tekrar deneyin veya farklı bir arama yapın.
                </p>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg text-gray-600">Hiç video bulunamadı</p>
                <p className="text-sm text-gray-500 mt-2">
                  Farklı bir arama terimi deneyin.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Play className="w-6 h-6 text-indigo-500" />
                  <h2 className="text-xl font-bold text-gray-800">
                    &quot;{searchQuery}&quot; için sonuçlar
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {videos.map((video) => (
                    <VideoCard
                      key={video.videoId}
                      {...video}
                      onClick={() => handleVideoClick(video)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {selectedVideo && (
        <VideoAnalyzer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onApproved={handleVideoApproved}
          onQuotaExceeded={handleQuotaExceeded}
        />
      )}

      {playingVideo && (
        <VideoPlayer
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      {/* Video sayacı - Premium kullanıcılarda gösterme */}
      {!isPremium && videoCount > 0 && videoCount < 10 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-indigo-500" />
          <span>Ücretsiz: <strong>{videoCount}/10</strong> video kullanıldı</span>
        </div>
      )}
      
      {/* Premium badge */}
      {isPremium && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-5 py-2.5 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-semibold">
          <Star className="w-4 h-4" />
          <span>Premium Üye ✨</span>
        </div>
      )}
    </div>
  );
}
