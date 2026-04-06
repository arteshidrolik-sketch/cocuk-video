'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import Image from 'next/image';

type Tab = 'settings' | 'channels' | 'history' | 'pending';

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
      const [settingsRes, channelsRes, historyRes, pendingRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/channels'),
        fetch('/api/history'),
        fetch('/api/pending'),
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
    } catch (err) {
      console.error('Data load error:', err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('parentAuth');
    router.replace('/');
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
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
        headers: { 'Content-Type': 'application/json' },
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
      await fetch(`/api/channels?id=${id}`, { method: 'DELETE' });
      setChannels(channels.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Remove channel error:', err);
    }
  };

  const handlePendingAction = async (videoId: string, action: 'approve' | 'reject') => {
    try {
      await fetch('/api/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">Ebeveyn Paneli</span>
          </div>
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
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
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
      </div>
    </div>
  );
}