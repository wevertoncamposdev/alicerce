import { ValidationError } from 'class-validator';
import { flattenValidationErrors } from './validation-error.util';

function error(
  property: string,
  constraints: Record<string, string>,
): ValidationError {
  const err = new ValidationError();
  err.property = property;
  err.constraints = constraints;
  return err;
}

describe('flattenValidationErrors', () => {
  it('maps a known constraint to a Portuguese message', () => {
    const result = flattenValidationErrors([
      error('email', { isEmail: 'email must be an email' }),
    ]);

    expect(result).toEqual([{ field: 'email', message: 'E-mail inválido.' }]);
  });

  it('falls back to a generic message for an unmapped constraint', () => {
    const result = flattenValidationErrors([
      error('document', { isDocument: 'Documento inválido.' }),
    ]);

    expect(result).toEqual([{ field: 'document', message: 'Valor inválido.' }]);
  });

  it('maps forbidNonWhitelisted errors to a clear message', () => {
    const result = flattenValidationErrors([
      error('unknownField', {
        whitelistValidation: 'property unknownField should not exist',
      }),
    ]);

    expect(result).toEqual([
      { field: 'unknownField', message: 'Campo não permitido.' },
    ]);
  });

  it('flattens nested errors (DTO aninhado) prefixando o caminho do campo', () => {
    const child = error('city', { isString: 'city must be a string' });
    const parent = new ValidationError();
    parent.property = 'address';
    parent.children = [child];

    const result = flattenValidationErrors([parent]);

    expect(result).toEqual([
      { field: 'address.city', message: 'Precisa ser um texto.' },
    ]);
  });
});
