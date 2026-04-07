'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Youtube,
  History,
  Clock,
  LogOut,
  Shield,
  Plus,
  Trash2,
  Check,
  X,
  ExternalLink,
  Home,
  Star,
  Zap,
  Crown,
} from 'lucide-react';
import Image from 'next/image';

type Tab = 'settings' | 'channels' | 'history' | 'pending' | 'subscription';

interface SettingsData {
  ageGroup: string;
  predefinedFilters: {
    violence: boolean;
    fear: boolean;
    profanity: boolean;
    adult: boolean;
  };
  customKeywords: string[];
  dailyTimeLimitMinutes: number | null;
}

interface Channel {
  id: number;
  channelId: string;
  channelName: string;
  channelThumbnail: string | null;
}

interface HistoryItem {
  id: number;
  videoId: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string | null;
  status: string;
  watchedAt: string;
  approvedBy: string;
}

interface PendingItem {
  id: number;
  videoId: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string | null;
  analysisResult: { reason: string } | null;
}

export default function ParentPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<SettingsData>({
    ageGroup: '3-13',
    predefinedFilters: { violence: true, fear: true, profanity: true, adult: true },
    customKeywords: [],
    dailyTimeLimitMinutes: null,
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannelId, setNewChannelId] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Pending state
  const [pending, setPending] = useState<PendingItem[]>([]);

  // Subscription state
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ plan: string; startDate: string; endDate: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    const auth = sessionStorage.getItem('parentAuth');
    if (auth !== 'true') {
      router.replace('/');
    } else {
      setAuthorized(true);
      loadData();
    }
  }, [router]);

  const loadData = async () => {
    try {
      const authHeaders = getAuthHeader();
      const [settingsRes, channelsRes, historyRes, pendingRes, trialRes] = await Promise.all([
        fetch('/api/settings', { headers: authHeaders }),
        fetch('/api/channels', { headers: authHeaders }),
        fetch('/api/history', { headers: authHeaders }),
        fetch('/api/pending', { headers: authHeaders }),
        fetch('/api/trial'),
      ]);

      const settingsData = await settingsRes.json();
      setSettings({
        ageGroup: settingsData.ageGroup || '3-13',
        predefinedFilters: settingsData.predefinedFilters || { violence: true, fear: true, profanity: true, adult: true },
        customKeywords: settingsData.customKeywords || [],
        dailyTimeLimitMinutes: settingsData.dailyTimeLimitMinutes || null,
      });

      setChannels(await channelsRes.json() || []);
      const historyData = await historyRes.json();
      setHistory(historyData.history || []);
      setPending(await pendingRes.json() || []);
      
      // Premium durumunu yükle
      const trialData = await trialRes.json();
      setIsPremium(trialData.isPremium ?? false);
      if (trialData.subscriptionInfo) {
        setSubscriptionInfo(trialData.subscriptionInfo);
      }
    } catch (err) {
      console.error('Data load error:', err);
    }
  };

  const getAuthHeader = (): Record<string, string> => {
    const token = sessionStorage.getItem('parentToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const handleLogout = () => {
    sessionStorage.removeItem('parentAuth');
    sessionStorage.removeItem('parentToken');
    router.replace('/');
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error('Save error:', data.error);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !settings.customKeywords.includes(newKeyword.trim())) {
      setSettings({
        ...settings,
        customKeywords: [...settings.customKeywords, newKeyword.trim()],
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setSettings({
      ...settings,
      customKeywords: settings.customKeywords.filter((k) => k !== keyword),
    });
  };

  const addChannel = async () => {
    if (!newChannelId.trim()) return;
    setAddingChannel(true);
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ channelId: newChannelId.trim() }),
      });
      if (res.ok) {
        const channel = await res.json();
        setChannels([channel, ...channels]);
        setNewChannelId('');
      }
    } catch (err) {
      console.error('Add channel error:', err);
    } finally {
      setAddingChannel(false);
    }
  };

  const removeChannel = async (id: number) => {
    try {
      await fetch(`/api/channels?id=${id}`, { method: 'DELETE', headers: getAuthHeader() });
      setChannels(channels.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Remove channel error:', err);
    }
  };

  const handlePendingAction = async (videoId: string, action: 'approve' | 'reject') => {
    try {
      await fetch('/api/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ videoId, action }),
      });
      setPending(pending.filter((p) => p.videoId !== videoId));
      loadData();
    } catch (err) {
      console.error('Pending action error:', err);
    }
  };

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter((h) => h.status === historyFilter);

  if (!mounted || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Ebeveyn Paneli</span>
          </div>
          
          {/* Ana Sayfa Linki - Ortada */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-12 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"
            title="Ana Sayfa"
          >
            <Home className="w-7 h-7" />
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'settings', icon: Settings, label: 'Ayarlar' },
            { id: 'channels', icon: Youtube, label: 'Onaylı Kanallar' },
            { id: 'history', icon: History, label: 'İzleme Geçmişi' },
            { id: 'pending', icon: Clock, label: `Bekleyenler (${pending.length})` },
            { id: 'subscription', icon: isPremium ? Star : Crown, label: isPremium ? 'Premium ✨' : 'Üyelik' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              } ${tab.id === 'subscription' && isPremium ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : ''}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4">Filtreleme Ayarları</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yaş Grubu</label>
                <select
                  value={settings.ageGroup}
                  onChange={(e) => setSettings({ ...settings, ageGroup: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="3-6">3-6 Yaş</option>
                  <option value="7-10">7-10 Yaş</option>
                  <option value="11-13">11-13 Yaş</option>
                  <option value="3-13">3-13 Yaş (Genel)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">⏱️ Günlük Süre Sınırı</label>
                <select
                  value={settings.dailyTimeLimitMinutes === null ? '' : settings.dailyTimeLimitMinutes}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    dailyTimeLimitMinutes: e.target.value === '' ? null : parseInt(e.target.value) 
                  })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Sınırsız</option>
                  <option value="15">15 dakika</option>
                  <option value="30">30 dakika</option>
                  <option value="45">45 dakika</option>
                  <option value="60">1 saat</option>
                  <option value="90">1.5 saat</option>
                  <option value="120">2 saat</option>
                  <option value="180">3 saat</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Çocuğunuzun günlük izleme süresini sınırlayın</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Önceden Tanımlı Kriterler</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'violence', label: '👊 Şiddet' },
                  { key: 'fear', label: '👻 Korku/Dehşet' },
                  { key: 'profanity', label: '🤬 Küfür/Argo' },
                  { key: 'adult', label: '🚫 Yetişkin İçerik' },
                ].map((filter) => (
                  <label
                    key={filter.key}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      settings.predefinedFilters[filter.key as keyof typeof settings.predefinedFilters]
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={settings.predefinedFilters[filter.key as keyof typeof settings.predefinedFilters]}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          predefinedFilters: {
                            ...settings.predefinedFilters,
                            [filter.key]: e.target.checked,
                          },
                        })
                      }
                      className="sr-only"
                    />
                    <span>{filter.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Özel Kelimeler/Kriterler</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="Örn: zombi, silah, kan..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button onClick={addKeyword} className="btn-secondary flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Ekle
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.customKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {keyword}
                    <button onClick={() => removeKeyword(keyword)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button onClick={saveSettings} disabled={saving} className="btn-primary">
              {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </button>
          </div>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4">Onaylı Kanallar</h2>
            <p className="text-sm text-gray-500 mb-4">
              Bu kanallardan gelen videolar otomatik olarak onaylanır.
            </p>
            
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newChannelId}
                onChange={(e) => setNewChannelId(e.target.value)}
                placeholder="Kanal ID veya @handle (orn: @TRTÇocuk)"
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button onClick={addChannel} disabled={addingChannel} className="btn-primary">
                {addingChannel ? 'Ekleniyor...' : 'Kanal Ekle'}
              </button>
            </div>

            {channels.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz onaylı kanal yok</p>
            ) : (
              <div className="space-y-3">
                {channels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden relative">
                      {channel.channelThumbnail ? (
                        <Image src={channel.channelThumbnail} alt={channel.channelName} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Youtube className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{channel.channelName}</p>
                      <p className="text-xs text-gray-500">{channel.channelId}</p>
                    </div>
                    <button
                      onClick={() => removeChannel(channel.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">İzleme Geçmişi</h2>
              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">Tümü</option>
                <option value="approved">Onaylanan</option>
                <option value="rejected">Reddedilen</option>
              </select>
            </div>

            {filteredHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Geçmiş kaydı yok</p>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-20 h-12 rounded bg-gray-200 overflow-hidden relative flex-shrink-0">
                      {item.thumbnailUrl ? (
                        <Image src={item.thumbnailUrl} alt={item.videoTitle} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.videoTitle}</p>
                      <p className="text-xs text-gray-500">
                        {item.channelName} · {new Date(item.watchedAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4">Bekleyen Onaylar</h2>

            {pending.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Bekleyen onay yok 🎉</p>
            ) : (
              <div className="space-y-4">
                {pending.map((item) => (
                  <div key={item.id} className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-20 rounded-lg bg-gray-200 overflow-hidden relative flex-shrink-0">
                        {item.thumbnailUrl ? (
                          <Image src={item.thumbnailUrl} alt={item.videoTitle} fill className="object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{item.videoTitle}</h3>
                        <p className="text-sm text-gray-500 mb-2">{item.channelName}</p>
                        {item.analysisResult?.reason && (
                          <p className="text-sm text-amber-700 bg-amber-100 px-2 py-1 rounded inline-block">
                            {item.analysisResult.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <a
                        href={`https://www.youtube.com/watch?v=${item.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4" /> Önizle
                      </a>
                      <div className="flex-1" />
                      <button
                        onClick={() => handlePendingAction(item.videoId, 'reject')}
                        className="flex items-center gap-1 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" /> Reddet
                      </button>
                      <button
                        onClick={() => handlePendingAction(item.videoId, 'approve')}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Check className="w-4 h-4" /> Onayla
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Üyelik Durumu
            </h2>

            {isPremium ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-8 h-8" />
                    <span className="text-2xl font-bold">Premium Üye ✨</span>
                  </div>
                  <p className="text-white/90">
                    Tüm premium özelliklere erişiminiz var!
                  </p>
                </div>

                {subscriptionInfo && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h3 className="font-semibold mb-3">Abonelik Bilgileri</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Plan:</span>
                        <span className="font-medium">
                          {subscriptionInfo.plan === 'STARTER' && 'Başlangıç'}
                          {subscriptionInfo.plan === 'PLUS' && 'Profesyonel'}
                          {subscriptionInfo.plan === 'INSTITUTION' && 'Kurum'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Başlangıç:</span>
                        <span>{new Date(subscriptionInfo.startDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bitiş:</span>
                        <span>{new Date(subscriptionInfo.endDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-green-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Aktif Özellikler
                  </h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>✓ Sınırsız video analizi</li>
                    <li>✓ Gelişmiş içerik filtreleme</li>
                    <li>✓ Özel anahtar kelime listesi</li>
                    <li>✓ Kanal onay sistemi</li>
                    <li>✓ İzleme geçmişi</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gray-100 p-6 rounded-2xl text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Ücretsiz Plan</h3>
                  <p className="text-gray-500 mb-4">
                    Günlük 10 video analizi hakkınız var.
                  </p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-indigo-800 mb-2">Premium'a Yükselt</h3>
                  <p className="text-sm text-indigo-600 mb-4">
                    Sınırsız analiz ve tüm özelliklere erişmek için premium üye olun.
                  </p>
                  <Link
                    href="/premium"
                    className="block w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-center font-semibold rounded-xl hover:opacity-90 transition-all"
                  >
                    Planları Görüntüle
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}