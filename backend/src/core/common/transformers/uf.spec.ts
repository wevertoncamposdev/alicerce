import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Uf } from './uf';

class Dummy {
  @Uf()
  value?: string;
}

async function normalizeAndValidate(value: unknown) {
  const instance = plainToInstance(Dummy, { value });
  const errors = await validate(instance);
  return { normalized: instance.value, errors };
}

describe('Uf', () => {
  it('accepts a code as-is', async () => {
    const { normalized, errors } = await normalizeAndValidate('SP');
    expect(normalized).toBe('SP');
    expect(errors).toHaveLength(0);
  });

  it('normalizes a lowercase code', async () => {
    const { normalized, errors } = await normalizeAndValidate('sp');
    expect(normalized).toBe('SP');
    expect(errors).toHaveLength(0);
  });

  it('normalizes a full state name with accent and mixed case', async () => {
    const { normalized, errors } = await normalizeAndValidate('São Paulo');
    expect(normalized).toBe('SP');
    expect(errors).toHaveLength(0);
  });

  it('normalizes a full state name without accent', async () => {
    const { normalized, errors } = await normalizeAndValidate('sao paulo');
    expect(normalized).toBe('SP');
    expect(errors).toHaveLength(0);
  });

  it('normalizes a multi-word state name', async () => {
    const { normalized, errors } =
      await normalizeAndValidate('Rio Grande do Sul');
    expect(normalized).toBe('RS');
    expect(errors).toHaveLength(0);
  });

  it('rejects a code that is not a real UF', async () => {
    const { errors } = await normalizeAndValidate('XX');
    expect(errors).toHaveLength(1);
  });

  it('accepts empty/null/undefined (optional field)', async () => {
    expect((await normalizeAndValidate(undefined)).errors).toHaveLength(0);
    expect((await normalizeAndValidate(null)).errors).toHaveLength(0);
    expect((await normalizeAndValidate('')).errors).toHaveLength(0);
  });
});
