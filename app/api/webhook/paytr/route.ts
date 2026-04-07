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

    // Hash doğrulama
    const merchantKey = process.env.PAYTR_MERCHANT_KEY!;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT!;
    
    const hashStr = `${merchantOid}${paymentAmount}${totalAmount}${currency}${status}`;
    const calculatedHash = crypto
      .createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
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
      
      // Kullanıcıyı bul veya oluştur
      // Burada email bilgisi olmadığı için merchant_oid'den kullanıcıyı bulmak gerek
      // Şimdilik basit bir log atalım
      console.log('Payment successful:', { merchantOid, planType, paymentAmount });
      
      // TODO: Kullanıcı aboneliğini güncelle
    }

    // PayTR'a başarılı yanıt gönder
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('PayTR webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
