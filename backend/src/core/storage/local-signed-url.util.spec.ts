import { signLocalKey, verifyLocalKeySignature } from './local-signed-url.util';

describe('local-signed-url.util', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, COOKIE_SECRET: 'test-secret' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('aceita uma assinatura válida e não expirada', () => {
    const { exp, sig } = signLocalKey('abc.png', 3600);
    expect(verifyLocalKeySignature('abc.png', exp, sig)).toBe(true);
  });

  it('rejeita uma assinatura expirada', () => {
    const { sig } = signLocalKey('abc.png', -1);
    const expiredExp = Date.now() - 1000;
    expect(verifyLocalKeySignature('abc.png', expiredExp, sig)).toBe(false);
  });

  it('rejeita quando a key não bate com a assinatura', () => {
    const { exp, sig } = signLocalKey('abc.png', 3600);
    expect(verifyLocalKeySignature('outra-key.png', exp, sig)).toBe(false);
  });

  it('rejeita uma assinatura adulterada', () => {
    const { exp, sig } = signLocalKey('abc.png', 3600);
    const tampered = sig.slice(0, -1) + (sig.endsWith('a') ? 'b' : 'a');
    expect(verifyLocalKeySignature('abc.png', exp, tampered)).toBe(false);
  });

  it('rejeita assinatura gerada com um segredo diferente', () => {
    const { exp, sig } = signLocalKey('abc.png', 3600);
    process.env.COOKIE_SECRET = 'outro-secret';
    expect(verifyLocalKeySignature('abc.png', exp, sig)).toBe(false);
  });
});
