'use client';

import { useState } from 'react';
import { CheckCircle, Star, Building2, Zap, Shield, Infinity, ArrowRight, Loader2 } from 'lucide-react';

const plans = [
  {
    id: 'STARTER',
    name: 'Başlangıç',
    price: 249,
    description: 'Bireysel kullanım için ideal',
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    features: [
      'Günlük 50 video analizi',
      'Temel içerik filtreleme',
      'Yaş grubu ayarları',
      'E-posta desteği',
    ],
    popular: false,
  },
  {
    id: 'PLUS',
    name: 'Profesyonel',
    price: 349,
    description: 'Aileler için en popüler seçim',
    icon: Star,
    color: 'from-violet-500 to-purple-600',
    features: [
      'Sınırsız video analizi',
      'Gelişmiş içerik filtreleme',
      'Özel anahtar kelime listesi',
      'Kanal onay sistemi',
      'İzleme geçmişi',
      'Öncelikli destek',
    ],
    popular: true,
  },
  {
    id: 'INSTITUTION',
    name: 'Kurum',
    price: 549,
    description: 'Okul ve kurumlar için',
    icon: Building2,
    color: 'from-emerald-500 to-teal-600',
    features: [
      'Tüm Plus özellikleri',
      'Çoklu kullanıcı yönetimi',
      'Merkezi yönetim paneli',
      'API erişimi',
      'Özel entegrasyon desteği',
      '7/24 telefon desteği',
    ],
    popular: false,
  },
];

declare global {
  interface Window {
    iframeResizer: unknown;
  }
}

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paytrToken, setPaytrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const email = 'sales@estechnic.com.tr'; // Sabit email adresi

  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : null;
  const status = searchParams?.get('status');

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    setPaytrToken(null);
    setError(null);
    
    // Direkt ödemeyi başlat
    setLoading(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, email }),
      });

      const data = await res.json();

      if (data.token) {
        setPaytrToken(data.token);

        // Load PayTR iFrame script
        const script = document.createElement('script');
        script.src = 'https://www.paytr.com/js/iframeResizer.min.js';
        script.onload = () => {
          if (window.iframeResizer) {
            // @ts-expect-error paytr iframe resizer
            window.iframeResizer({ checkOrigin: false }, '#paytriframe');
          }
        };
        document.head.appendChild(script);
        
        // Scroll to iFrame
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      } else {
        setError(data.error || 'Ödeme başlatılamadı');
      }
    } catch {
      setError('Bir hata oluştu, lütfen tekrar deneyin');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-sm font-medium">Premium Üyelik</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Çocuğunuzu{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Güvende Tutun
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Sınırsız video analizi ve gelişmiş filtreler ile çocuğunuzun dijital güvenliğini garanti altına alın.
        </p>
      </div>

      {/* Success / Fail Banner */}
      {status === 'success' && (
        <div className="max-w-md mx-auto mb-8 bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-300 font-semibold">Ödeme başarılı! Premium üyeliğiniz aktifleştirildi.</p>
        </div>
      )}
      {status === 'fail' && (
        <div className="max-w-md mx-auto mb-8 bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-center">
          <p className="text-red-300 font-semibold">Ödeme başarısız. Lütfen tekrar deneyin.</p>
        </div>
      )}

      {/* Plans */}
      {!paytrToken && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border transition-all duration-300 cursor-pointer ${
                  plan.popular
                    ? 'border-purple-500/60 bg-gradient-to-b from-purple-900/40 to-slate-900/60 shadow-lg shadow-purple-500/20'
                    : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600'
                } ${isSelected ? 'ring-2 ring-purple-400 scale-[1.02]' : ''}`}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      ÖNERİLEN
                    </span>
                  </div>
                )}

                <div className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                  <div className="flex items-end gap-1 mb-6">
                    <span className="text-4xl font-black text-white">₺{plan.price}</span>
                    <span className="text-slate-400 mb-1">/ay</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-slate-300 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${plan.color} text-white shadow-lg`
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {isSelected ? 'Seçildi ✓' : 'Seç'}
                    {!isSelected && <ArrowRight className="inline w-4 h-4 ml-1" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="max-w-md mx-auto bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-300">Ödeme sayfası hazırlanıyor...</p>
        </div>
      )}

      {/* Error State */}
      {error && !paytrToken && (
        <div className="max-w-md mx-auto bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-center">
          <p className="text-red-300">{error}</p>
          <button
            onClick={() => { setError(null); setSelectedPlan(null); }}
            className="mt-3 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm"
          >
            Geri Dön
          </button>
        </div>
      )}

      {/* PayTR iFrame */}
      {paytrToken && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-4 text-center">
            <Shield className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm">Güvenli ödeme sayfasına yönlendiriliyorsunuz</p>
          </div>
          <iframe
            id="paytriframe"
            src={`https://www.paytr.com/odeme/guvenli/${paytrToken}`}
            frameBorder="0"
            scrolling="no"
            style={{ width: '100%', minHeight: '600px' }}
            className="rounded-2xl overflow-hidden"
          />
        </div>
      )}

      {/* Trust Badges */}
      <div className="max-w-3xl mx-auto mt-12 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>256-bit SSL Şifreleme</span>
        </div>
        <div className="flex items-center gap-2">
          <Infinity className="w-4 h-4 text-purple-400" />
          <span>İstediğiniz zaman iptal</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-blue-400" />
          <span>PayTR ile güvenli ödeme</span>
        </div>
      </div>
    </div>
  );
}
