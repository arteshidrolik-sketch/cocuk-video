'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Search, Play, Star, Shield, Lock, Eye, EyeOff, User, Crown, X, Zap } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Quota / freemium state
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [quotaData, setQuotaData] = useState<{ dailyVideoCount: number; freeVideoLimit: number; trialUsed: boolean } | null>(null);
  const [trialInfo, setTrialInfo] = useState<{ isTrialActive: boolean; trialEndsAt: string | null; trialUsed: boolean; isPremium: boolean } | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialMessage, setTrialMessage] = useState('');

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

  // Fetch trial/quota info
  useEffect(() => {
    const fetchTrialInfo = async () => {
      try {
        const res = await fetch('/api/trial');
        const data = await res.json();
        setTrialInfo(data);
      } catch {
        // ignore
      }
    };
    fetchTrialInfo();
  }, []);

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setTrialMessage('');
    try {
      const res = await fetch('/api/trial', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTrialMessage('🎉 1 günlük deneme başlatıldı! Sınırsız analiz yapabilirsiniz.');
        const info = await fetch('/api/trial').then(r => r.json());
        setTrialInfo(info);
        setTimeout(() => {
          setShowPremiumModal(false);
          setTrialMessage('');
        }, 2000);
      } else {
        setTrialMessage(data.message || 'Deneme başlatılamadı.');
      }
    } catch {
      setTrialMessage('Bağlantı hatası.');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleQuotaExceeded = (data: { dailyVideoCount: number; freeVideoLimit: number; trialUsed: boolean }) => {
    setQuotaData(data);
    setShowPremiumModal(true);
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
    } catch {
      setSetupError('Bağlantı hatası');
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

      {/* Trial info banner */}
      {trialInfo?.isTrialActive && trialInfo.trialEndsAt && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-medium">
            Deneme aktif — {new Date(trialInfo.trialEndsAt).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}&apos;e kadar sınırsız
          </span>
        </div>
      )}

      {/* Premium modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-center">
              <button
                onClick={() => { setShowPremiumModal(false); setTrialMessage(''); }}
                className="absolute top-4 right-4 p-1.5 bg-white/20 rounded-full text-white hover:bg-white/30 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-4">
                <Crown className="w-10 h-10 text-yellow-300" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Günlük Limit Doldu!</h2>
              <p className="text-white/80 text-sm">
                Bugün {quotaData?.dailyVideoCount ?? 5}/{quotaData?.freeVideoLimit ?? 5} video analiz hakkını kullandınız.
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {trialMessage && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${trialMessage.startsWith('🎉') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {trialMessage}
                </div>
              )}

              {/* Trial option */}
              {!quotaData?.trialUsed && !trialInfo?.trialUsed && (
                <div className="border-2 border-indigo-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Ücretsiz Deneme</h3>
                      <p className="text-xs text-gray-500">1 günlük tam erişim — sadece bir kez</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStartTrial}
                    disabled={trialLoading}
                    className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {trialLoading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Başlatılıyor...</>
                    ) : (
                      '🚀 Denemeyi Başlat'
                    )}
                  </button>
                </div>
              )}

              {/* Premium option */}
              <div className="border-2 border-purple-200 rounded-2xl p-4 bg-purple-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Crown className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Premium Üyelik</h3>
                    <p className="text-xs text-gray-500">Sınırsız analiz, öncelikli destek</p>
                  </div>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 mb-3">
                  <li>✅ Günlük sınırsız video analizi</li>
                  <li>✅ Öncelikli AI analizi</li>
                  <li>✅ Gelişmiş ebeveyn raporları</li>
                </ul>
                <button
                  disabled
                  className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl opacity-70 cursor-not-allowed"
                  title="Yakında aktif olacak"
                >
                  💳 Premium&apos;a Geç — Yakında
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">Ödeme sistemi yakında aktif olacak</p>
              </div>

              <p className="text-center text-xs text-gray-400">
                Yarın {quotaData?.freeVideoLimit ?? 5} ücretsiz hakkınız yenilenecek.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
