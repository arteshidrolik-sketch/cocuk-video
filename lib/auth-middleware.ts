import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.PARENT_JWT_SECRET || 'cocuk-video-default-secret-change-in-production';

export interface ParentJWTPayload {
  role: 'parent';
  iat: number;
  exp: number;
}

/**
 * Ebeveyn JWT token'ı oluşturur (login sırasında).
 * Geçerlilik süresi: 4 saat
 */
export function signParentToken(): string {
  return jwt.sign({ role: 'parent' }, JWT_SECRET, { expiresIn: '4h' });
}

/**
 * İstek başlığındaki Bearer token'ı doğrular.
 * Geçersizse 401 döner, geçerliyse null döner.
 */
export function verifyParentToken(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Kimlik doğrulama gerekli' }, { status: 401 });
  }
  const token = authHeader.slice(7);
  try {
    jwt.verify(token, JWT_SECRET) as ParentJWTPayload;
    return null; // token geçerli
  } catch {
    return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş token' }, { status: 401 });
  }
}
