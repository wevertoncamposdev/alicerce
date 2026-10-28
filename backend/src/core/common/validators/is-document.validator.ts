import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Dígitos verificadores padrão (mod 11) — mesmo algoritmo usado pela
// Receita Federal para validar CPF/CNPJ sem consultar nenhuma base externa.
function calculateCheckDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce(
    (acc, digit, index) => acc + digit * weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  if (/^(\d)\1{10}$/.test(value)) return false; // todos os dígitos iguais

  const digits = value.split('').map(Number);
  const firstCheck = calculateCheckDigit(
    digits.slice(0, 9),
    [10, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  if (firstCheck !== digits[9]) return false;

  const secondCheck = calculateCheckDigit(
    digits.slice(0, 10),
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return secondCheck === digits[10];
}

function isValidCnpj(value: string): boolean {
  if (!/^\d{14}$/.test(value)) return false;
  if (/^(\d)\1{13}$/.test(value)) return false; // todos os dígitos iguais

  const digits = value.split('').map(Number);
  const firstCheck = calculateCheckDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  if (firstCheck !== digits[12]) return false;

  const secondCheck = calculateCheckDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return secondCheck === digits[13];
}

// Extraído do constraint pra ser reusado fora do class-validator — D4
// (docs/PLAN-fundacao-ux.md): o DTO sozinho só vê o payload parcial de um
// PATCH, então não dá pra pegar "document sem documentType no mesmo
// payload" pulando a checagem. Quem precisa do registro mesclado (ver
// TenantService#update) chama esta função direto, sem duplicar o algoritmo
// de dígito verificador.
export function isValidDocumentForType(
  documentType: unknown,
  value: unknown,
): boolean {
  // Campo opcional — só valida quando vier preenchido (ver
  // CreateTenantDto: documentType/document são ambos opcionais).
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;

  if (documentType === 'CPF') return isValidCpf(value);
  if (documentType === 'CNPJ') return isValidCnpj(value);

  // Sem documentType ou "OUTRO": não é um registro brasileiro com
  // checksum conhecido — qualquer string não vazia é aceita.
  return true;
}

@ValidatorConstraint({ name: 'isDocument' })
export class IsDocumentConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    // Lê o campo irmão `documentType` do mesmo objeto, mesmo padrão de
    // IsStrongPassword lendo `email`.
    const documentType = (args.object as Record<string, unknown>).documentType;
    return isValidDocumentForType(documentType, value);
  }

  defaultMessage(): string {
    return 'Documento inválido para o tipo informado.';
  }
}

// Valida CPF (11 dígitos) ou CNPJ (14 dígitos) via dígito verificador,
// conforme o `documentType` irmão no mesmo objeto — "OUTRO" ou ausente não
// valida checksum (Fase 5, Plano Base.md 5.1).
export function IsDocument(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDocumentConstraint,
    });
  };
}
