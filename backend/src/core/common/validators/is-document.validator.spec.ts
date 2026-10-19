import { validate } from 'class-validator';
import { IsDocument } from './is-document.validator';

class Dummy {
  documentType?: string;

  @IsDocument()
  document?: string;
}

async function validateDocument(
  document: string | undefined,
  documentType?: string,
) {
  const dummy = new Dummy();
  dummy.document = document;
  dummy.documentType = documentType;
  return validate(dummy);
}

describe('IsDocument', () => {
  it('accepts an empty document regardless of documentType', async () => {
    const errors = await validateDocument(undefined, 'CPF');
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid CPF', async () => {
    const errors = await validateDocument('52998224725', 'CPF');
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid CPF', async () => {
    const errors = await validateDocument('11111111111', 'CPF');
    expect(errors).toHaveLength(1);
  });

  it('rejects a CPF with the wrong length', async () => {
    const errors = await validateDocument('123', 'CPF');
    expect(errors).toHaveLength(1);
  });

  it('accepts a valid CNPJ', async () => {
    const errors = await validateDocument('11222333000181', 'CNPJ');
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid CNPJ', async () => {
    const errors = await validateDocument('11111111111111', 'CNPJ');
    expect(errors).toHaveLength(1);
  });

  it('accepts any non-empty value when documentType is OUTRO', async () => {
    const errors = await validateDocument('qualquer-coisa-123', 'OUTRO');
    expect(errors).toHaveLength(0);
  });

  it('accepts any non-empty value when documentType is not informed', async () => {
    const errors = await validateDocument('qualquer-coisa-123', undefined);
    expect(errors).toHaveLength(0);
  });
});
