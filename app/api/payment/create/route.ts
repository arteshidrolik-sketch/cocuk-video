import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getClientIP } from '@/lib/quota-check';

const PLANS: Record<string, { amount: number; name: string }> = {
  STARTER: { amount: 24900, name: 'Başlangıç Paketi' },
  PLUS: { amount: 34900, name: 'Profesyonel Paketi' },
  INSTITUTION: { amount: 54900, name: 'Kurum Paketi' },
};

export async function POST(request: NextRequest) {
  try {
    const { plan, email, name } = await request.json();

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Geçersiz paket' }, { status: 400 });
    }

    const merchantId = process.env.PAYTR_MERCHANT_ID!;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY!;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT!;

    const userIp = getClientIP(request);
    const merchantOid = `${plan}${Date.now()}`;
    const paymentAmount = PLANS[plan].amount;
    const paymentType = 'card';
    const installmentCount = '0';
    const currency = 'TL';
    const testMode = '1';
    const nonThreeD = '0';

    const userBasket = Buffer.from(
      JSON.stringify([[PLANS[plan].name, (paymentAmount / 100).toFixed(2), 1]])
    ).toString('base64');

    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmount}${paymentType}${installmentCount}${currency}${testMode}${nonThreeD}`;
    const paytrToken = crypto
      .createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
      .digest('base64');

    const params = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: email || 'test@test.com',
      payment_amount: String(paymentAmount),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: '1',
      no_installment: '0',
      max_installment: '0',
      user_name: name || 'Kullanıcı',
      user_address: 'Türkiye',
      user_phone: '05000000000',
      merchant_ok_url: 'https://cocuk-video.vercel.app/premium?status=success',
      merchant_fail_url: 'https://cocuk-video.vercel.app/premium?status=fail',
      timeout_limit: '30',
      currency,
      test_mode: testMode,
      payment_type: paymentType,
      installment_count: installmentCount,
      non_3d: nonThreeD,
    });

    const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await response.json();

    if (data.status === 'success') {
      return NextResponse.json({ token: data.token, merchantOid });
    } else {
      console.error('PayTR token error:', data);
      return NextResponse.json({ error: data.reason || 'Token alınamadı' }, { status: 500 });
    }
  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
