import * as crypto from 'crypto';

// Reaproveita COOKIE_SECRET (já existe, já é forte) — URL assinada local e
// cookie assinado têm a mesma necessidade (HMAC com um segredo do servidor),
// não precisa de segredo novo (ver ADR 0010).
function getSecret(): string {
  const value = process.env.COOKIE_SECRET;
  if (!value) {
    throw new Error(
      'COOKIE_SECRET não definida — necessária para assinar URLs locais',
    );
  }
  return value;
}

export function signLocalKey(
  key: string,
  expiresInSeconds: number,
): { exp: number; sig: string } {
  const exp = Date.now() + expiresInSeconds * 1000;
  const sig = crypto
    .createHmac('sha256', getSecret())
    .update(`${key}:${exp}`)
    .digest('hex');

  return { exp, sig };
}

export function verifyLocalKeySignature(
  key: string,
  exp: number,
  sig: string,
): boolean {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (typeof sig !== 'string' || sig.length === 0) return false;

  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(`${key}:${exp}`)
    .digest('hex');

  // Comparação em tempo constante — evita que diferenças de tempo revelem a
  // assinatura esperada byte a byte.
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(sig);

  return (
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  );
}
