import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from './normalize-email.decorator';

class Dummy {
  @NormalizeEmail()
  email?: string;
}

function normalize(value: unknown): unknown {
  return plainToInstance(Dummy, { email: value }).email;
}

describe('NormalizeEmail', () => {
  it('lowercases and trims a mixed-case e-mail', () => {
    expect(normalize('  Fulano@X.com  ')).toBe('fulano@x.com');
  });

  it('leaves an already-normalized e-mail unchanged', () => {
    expect(normalize('fulano@x.com')).toBe('fulano@x.com');
  });

  it('passes through undefined (optional field absent)', () => {
    expect(normalize(undefined)).toBeUndefined();
  });

  it('passes through a non-string value untouched for @IsEmail() to reject', () => {
    expect(normalize(123)).toBe(123);
  });
});
