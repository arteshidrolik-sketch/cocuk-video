# Çocuk Video Filtresi - Proje Kurulum Rehberi

## Proje Özeti
YouTube videoları için yapay zeka destekli içerik filtreleme uygulaması. Ebeveynlerin çocuklarına güvenli video içeriği sunmasını sağlar.

---

## 1. Gerekli Hesaplar ve Kayıtlar

### 1.1 GitHub
| Alan | Değer |
|------|-------|
| **Hesap** | github.com/arteshidrolik-sketch |
| **Repo** | cocuk-video |
| **Amaç** | Kod versiyonlama ve Vercel entegrasyonu |

**Neden:** Next.js projesini barındırmak ve Vercel ile otomatik deployment için.

### 1.2 Vercel
| Alan | Değer |
|------|-------|
| **Hesap** | arteshidrolik@gmail.com |
| **Proje** | cocuk-video |
| **Domain** | cocuk-video.vercel.app |
| **Amaç** | Next.js uygulamasını host etmek |

**Neden:** Serverless hosting, otomatik deployment, Türkiye'den hızlı erişim.

### 1.3 Neon PostgreSQL
| Alan | Değer |
|------|-------|
| **Hesap** | Neon Tech |
| **Database** | cocuk-video-db |
| **Amaç** | Kullanıcı verileri, abonelikler, video analizleri |

**Neden:** Ücretsiz tier, Vercel ile uyumlu, serverless.

### 1.4 YouTube Data API
| Alan | Değer |
|------|-------|
| **Platform** | Google Cloud Console |
| **API** | YouTube Data API v3 |
| **Amaç** | Video metadata çekmek |

**Neden:** YouTube videolarının başlık, açıklama, etiketlerine erişim.

### 1.5 Abacus.AI (LLM API)
| Alan | Değer |
|------|-------|
| **Hesap** | Abacus.AI |
| **Amaç** | Video içeriğini analiz etmek için AI modeli |

**Neden:** Video başlık/açıklamasını analiz edip güvenli/uygunsuz olarak sınıflandırma.

### 1.6 PayTR
| Alan | Değer |
|------|-------|
| **Hesap** | Mağaza No: 688965 |
| **Amaç** | Ödeme altyapısı (Türk Lirası) |
| **Durum** | Demo/Test modu |

**Neden:** Türkiye'deki kullanıcıların TL ile ödeme yapması.

---

## 2. Teknik Altyapı

### 2.1 Framework ve Teknolojiler
```
Frontend: Next.js 14 (App Router)
Styling: Tailwind CSS
Database: PostgreSQL (Neon)
ORM: Prisma
Auth: NextAuth.js
Payment: PayTR iFrame API
AI: Abacus.AI (Llama 3.1)
```

### 2.2 Proje Yapısı
```
/home/ubuntu/company/apps/cocuk-video/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── analyze/       # Video analiz endpoint
│   │   ├── payment/       # PayTR entegrasyonu
│   │   └── webhook/       # PayTR callback
│   ├── page.tsx           # Ana sayfa
│   ├── premium/           # Premium sayfası
│   └── layout.tsx         # Root layout
├── components/            # React bileşenleri
├── lib/                   # Yardımcı fonksiyonlar
├── prisma/               # Database schema
└── public/               # Statik dosyalar
```

---

## 3. Özellikler ve Modüller

### 3.1 Çekirdek Özellikler
| Özellik | Açıklama |
|---------|----------|
| **Video Analiz** | YouTube URL'sini AI ile analiz etme |
| **Filtreleme** | Güvenli/uygunsuz içerik tespiti |
| **Kategori** | Eğitici, eğlenceli, müzik vb. sınıflandırma |
| **Abonelik** | Ücretsiz ve premium paketler |
| **Kota Sistemi** | Günlük analiz limiti |

### 3.2 Premium Paketler
| Paket | Fiyat | Özellikler |
|-------|-------|------------|
| **Başlangıç** | 249₺/ay | 100 analiz/gün |
| **Profesyonel** | 349₺/ay | 500 analiz/gün |
| **Kurum** | 549₺/ay | Sınırsız analiz |

---

## 4. API Endpoints

### 4.1 Video Analizi
```http
POST /api/analyze
Body: { "youtubeUrl": "https://youtube.com/watch?v=..." }
```

### 4.2 Ödeme Token
```http
POST /api/payment/create
Body: { "plan": "STARTER", "email": "...", "name": "..." }
```

### 4.3 PayTR Callback
```http
POST /api/webhook/paytr
```

---

## 5. Environment Variables

### 5.1 Vercel'de Tanımlananlar
```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_URL=https://cocuk-video.vercel.app
NEXTAUTH_SECRET=...

# YouTube
YOUTUBE_API_KEY=...

# AI
ABACUSAI_API_KEY=...

# PayTR
PAYTR_MERCHANT_ID=688965
PAYTR_MERCHANT_KEY=...
PAYTR_MERCHANT_SALT=...

# Güvenlik
PARENT_JWT_SECRET=...
```

---

## 6. Yaşanan Sorunlar ve Çözümler

### 6.1 PayTR Hash Hatası
**Sorun:** `hash doğrulanamadı`

**Neden:** Hash string formatı yanlış

**Çözüm:** Doğru hash formatı:
```javascript
const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
```

### 6.2 Environment Variables
**Sorun:** Vercel'de env vars şifreli (encrypted) tanımlanmış

**Çözüm:** Plain text olarak yeniden tanımlandı

### 6.3 Demo Hesap Kısıtlaması
**Sorun:** PayTR demo hesapta iFrame açılmıyor

**Durum:** PayTR onayı bekleniyor veya test ortamı kullanılacak

---

## 7. Gelecek Adımlar

### 7.1 Kısa Vadeli
- [ ] PayTR onayı almak veya sandbox testi
- [ ] Gerçek ödeme akışını test etmek
- [ ] Kullanıcı arayüzünü iyileştirmek

### 7.2 Orta Vadeli
- [ ] Mobil uygulama (React Native)
- [ ] Chrome eklentisi
- [ ] Toplu video analizi

### 7.3 Uzun Vadeli
- [ ] Çoklu dil desteği
- [ ] AI modelini fine-tune etmek
- [ ] İçerik üreticileri için API

---

## 8. Önemli Bağlantılar

| Hizmet | URL |
|--------|-----|
| **Canlı Uygulama** | https://cocuk-video.vercel.app |
| **GitHub Repo** | https://github.com/arteshidrolik-sketch/cocuk-video |
| **Vercel Dashboard** | https://vercel.com/arteshidrolik-sketch/cocuk-video |
| **PayTR Panel** | https://www.paytr.com/magaza |
| **Neon Console** | https://console.neon.tech |

---

## 9. İletişim ve Destek

| Rol | İsim | Görev |
|-----|------|-------|
| **Kurucu** | Yücel | Strateji, kararlar |
| **Yönetici** | Buse (Makbule) | Agent yönetimi, koordinasyon |
| **Bilgi İşlem** | Ali | Teknik geliştirme |
| **Pazarlama** | Ayşe | Tanıtım, kullanıcı edinimi |
| **Finans** | Mehmet | Ödeme sistemleri, muhasebe |

---

## 10. Hesap Bilgileri ve Kimlik Bilgileri

> ⚠️ **GÜVENLİK UYARISI:** Bu bilgiler hassas veriler içerir. Sadece yetkili kişilerle paylaşın.

### 10.1 GitHub
| Alan | Değer |
|------|-------|
| **Platform** | github.com |
| **Kullanıcı Adı** | arteshidrolik-sketch |
| **Email** | arteshidrolik@gmail.com |
| **Giriş Yöntemi** | GitHub hesabı (Google ile bağlı) |
| **Not** | 2FA aktif değil |

### 10.2 Vercel
| Alan | Değer |
|------|-------|
| **Platform** | vercel.com |
| **Giriş Yöntemi** | GitHub SSO (arteshidrolik-sketch) |
| **Email** | arteshidrolik@gmail.com |
| **Team** | arteshidrolik-sketch's projects |
| **API Token** | [REDACTED - Güvenlik nedeniyle gizlendi] |

### 10.3 Neon PostgreSQL
| Alan | Değer |
|------|-------|
| **Platform** | console.neon.tech |
| **Giriş Yöntemi** | GitHub SSO |
| **Proje** | cocuk-video-db |
| **Region** | aws-eu-central-1 (Frankfurt) |
| **Database URL** | Vercel env vars'da (DATABASE_URL) |

### 10.4 Google Cloud Console (YouTube API)
| Alan | Değer |
|------|-------|
| **Platform** | console.cloud.google.com |
| **Google Hesabı** | arteshidrolik@gmail.com |
| **Proje** | cocuk-video-api |
| **API** | YouTube Data API v3 |
| **API Key** | Vercel env vars'da (YOUTUBE_API_KEY) |

### 10.5 Abacus.AI
| Alan | Değer |
|------|-------|
| **Platform** | abacus.ai |
| **Giriş Yöntemi** | GitHub SSO |
| **Email** | arteshidrolik@gmail.com |
| **API Key** | Vercel env vars'da (ABACUSAI_API_KEY) |

### 10.6 PayTR
| Alan | Değer |
|------|-------|
| **Platform** | www.paytr.com |
| **Mağaza No** | 688965 |
| **Giriş Yöntemi** | Email/Şifre |
| **Email** | arteshidrolik@gmail.com |
| **Merchant Key** | [REDACTED - Güvenlik nedeniyle gizlendi] |
| **Merchant Salt** | [REDACTED - Güvenlik nedeniyle gizlendi] |
| **Durum** | Demo/Test hesap |
| **Not** | Canlı ödeme için onay bekleniyor |

### 10.7 OpenClaw (Telegram Bot)
| Alan | Değer |
|------|-------|
| **Platform** | OpenClaw Gateway |
| **Bot Adı** | Makbule |
| **Chat ID** | 5828859455 |
| **Kanal** | Telegram |
| **Konfigürasyon** | ~/.openclaw/openclaw.json |

---

## 11. Önemli Dosya ve Konumlar

### 11.1 Sunucu Üzerinde
| Dosya/Klasör | Konum | Açıklama |
|--------------|-------|----------|
| **Proje Kodu** | `/home/ubuntu/company/apps/cocuk-video/` | Ana uygulama dizini |
| **OpenClaw Config** | `~/.openclaw/openclaw.json` | Gateway yapılandırması |
| **Proje Rehberi** | `PROJE_REHBERI.md` | Bu dosya |

### 11.2 GitHub'da
| Repo | URL | Açıklama |
|------|-----|----------|
| **cocuk-video** | https://github.com/arteshidrolik-sketch/cocuk-video | Ana uygulama |
| **getdriver** | https://github.com/arteshidrolik-sketch/getdriver | GetDriver uygulaması |

---

*Son Güncelleme: 2026-04-07*
*Proje Durumu: Beta / Test Aşaması*
