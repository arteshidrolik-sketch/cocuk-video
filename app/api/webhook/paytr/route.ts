import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();

    const merchantOid = body.get('merchant_oid') as string;
    const status = body.get('status') as string;
    const totalAmount = body.get('total_amount') as string;
    const paymentType = body.get('payment_type') as string;
    const paymentAmount = body.get('payment_amount') as string;
    const currency = body.get('currency') as string;
    const hash = body.get('hash') as string;

    // Hash doğrulama - PayTR iFrame API callback format
    // hash = merchant_oid + merchant_salt + status + total_amount
    const merchantKey = process.env.PAYTR_MERCHANT_KEY!;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT!;

    const hashStr = `${merchantOid}${merchantSalt}${status}${totalAmount}`;
    const calculatedHash = crypto
      .createHmac('sha256', merchantKey)
      .update(hashStr)
      .digest('base64');

    if (hash !== calculatedHash) {
      console.error('PayTR webhook: Hash mismatch');
      return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
    }

    // Ödeme başarılı mı?
    if (status === 'success') {
      // Plan tipini merchant_oid'den çıkar
      const planType = merchantOid.startsWith('STARTER') ? 'STARTER' :
                       merchantOid.startsWith('PLUS') ? 'PLUS' : 'INSTITUTION';

      // Bitiş tarihi hesapla (1 ay sonra)
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      // Aboneliği oluştur/güncelle
      // merchant_oid formatı: PLAN{timestamp} şeklinde
      // Kullanıcıyı email ile ilişkilendirmek için payment'de email'i de kaydetmek gerekir
      // Şimdilik merchant_oid ile ilişkilendiriyoruz

      await prisma.subscription.create({
        data: {
          userId: merchantOid, // Geçici olarak merchant_oid kullanıyoruz
          plan: planType,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: endDate,
          paytrPaymentId: merchantOid,
        },
      });

      // UserQuota'yu güncelle - premium yap
      await prisma.userQuota.upsert({
        where: { userId: merchantOid },
        update: {
          isPremium: true,
        },
        create: {
          userId: merchantOid,
          isPremium: true,
          dailyVideoCount: 0,
        },
      });

      console.log('Payment successful - Subscription created:', {
        merchantOid,
        planType,
        endDate,
      });
    }

    // PayTR'a başarılı yanıt gönder
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('PayTR webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
