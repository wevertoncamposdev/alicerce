import { plainToInstance } from 'class-transformer';
import { OnlyDigits } from './only-digits';

class Dummy {
  @OnlyDigits()
  value?: unknown;
}

function transform(value: unknown): unknown {
  return plainToInstance(Dummy, { value }).value;
}

describe('OnlyDigits', () => {
  it('removes mask characters from a CNPJ', () => {
    expect(transform('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('removes mask characters from a CEP', () => {
    expect(transform('01310-100')).toBe('01310100');
  });

  it('removes mask characters from a phone number', () => {
    expect(transform('(11) 91234-5678')).toBe('11912345678');
  });

  it('leaves a pure-digit string unchanged', () => {
    expect(transform('12345678901')).toBe('12345678901');
  });

  it('passes through non-string values unchanged', () => {
    expect(transform(undefined)).toBeUndefined();
    expect(transform(null)).toBeNull();
  });
});
