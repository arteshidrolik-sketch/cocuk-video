import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const merchantOid = params.get('merchant_oid') || '';
    const status = params.get('status') || '';
    const totalAmount = params.get('total_amount') || '';
    const hash = params.get('hash') || '';

    const merchantKey = process.env.PAYTR_MERCHANT_KEY!;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT!;

    // Verify hash
    const hashStr = `${merchantOid}${merchantSalt}${status}${totalAmount}`;
    const expectedHash = crypto
      .createHmac('sha256', merchantKey)
      .update(hashStr)
      .digest('base64');

    if (hash !== expectedHash) {
      console.error('PayTR hash mismatch');
      return new NextResponse('PAYTR_HASH_MISMATCH', { status: 400 });
    }

    if (status === 'success') {
      // Extract plan from merchant_oid (e.g. "PLUS-1234567890")
      const plan = merchantOid.split('-')[0];

      // Update or create subscription
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await prisma.subscription.create({
        data: {
          userId: merchantOid, // Will be refined with actual userId
          plan: plan || 'STARTER',
          status: 'ACTIVE',
          endDate,
          paytrPaymentId: merchantOid,
        },
      });

      // Mark user as premium in quota (IP-based for now)
      // Note: In production, link userId from merchant_oid or session
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Payment callback error:', error);
    return new NextResponse('FAIL', { status: 500 });
  }
}
