import { plainToInstance } from 'class-transformer';
import { TrimToNull } from './trim-to-null';

class Dummy {
  @TrimToNull()
  value?: unknown;
}

function transform(value: unknown): unknown {
  return plainToInstance(Dummy, { value }).value;
}

describe('TrimToNull', () => {
  it('trims surrounding whitespace', () => {
    expect(transform('  Associação Maravilhosa  ')).toBe(
      'Associação Maravilhosa',
    );
  });

  it('turns an empty string into null', () => {
    expect(transform('')).toBeNull();
  });

  it('turns a whitespace-only string into null', () => {
    expect(transform('   ')).toBeNull();
  });

  it('passes through non-string values unchanged', () => {
    expect(transform(undefined)).toBeUndefined();
    expect(transform(null)).toBeNull();
  });
});
