import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

// As 27 UFs (26 estados + Distrito Federal) — lista fixa, nunca muda.
const UF_CODES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

// Nome por extenso (sem acento, minúsculo) -> sigla. D3 (docs/PLAN-
// fundacao-ux.md): "UF por extenso" era rejeitado sem motivo claro — em
// vez de só dar um erro melhor, reconhece o nome por extenso de verdade e
// converte pra sigla antes de validar.
const UF_NAMES: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

// Faixa Unicode dos sinais diacríticos combinantes (acento agudo, til,
// circunflexo...) depois de `normalize('NFD')` separar a letra base do
// acento. Construído via `String.fromCharCode` (não `\uXXXX` dentro da
// regex) para não depender de nenhum escape de string.
const COMBINING_DIACRITICS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g',
);

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '');
}

// Normaliza sigla OU nome por extenso (com/sem acento, qualquer caixa) pra
// sigla canônica; devolve o valor original sem alterar se não reconhecer
// nada (o validador abaixo rejeita com uma mensagem clara).
function normalizeUf(value: string): string {
  const trimmed = stripAccents(value).trim().toLowerCase();
  const byName = UF_NAMES[trimmed];
  if (byName) return byName;

  const byCode = trimmed.toUpperCase();
  if ((UF_CODES as readonly string[]).includes(byCode)) return byCode;

  return value;
}

@ValidatorConstraint({ name: 'isUf' })
class IsUfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    // Campo opcional — só valida quando vier preenchido.
    if (value === undefined || value === null || value === '') return true;
    if (typeof value !== 'string') return false;

    return (UF_CODES as readonly string[]).includes(value);
  }

  defaultMessage(): string {
    return 'UF inválida. Use a sigla de 2 letras (ex.: SP) ou o nome do estado.';
  }
}

// Decorator composto (mesmo padrão do `IsDocument`): normaliza (sigla ou
// nome por extenso, com/sem acento, qualquer caixa) e valida contra a
// lista fixa das 27 UFs.
export function Uf(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? normalizeUf(value) : value,
    )(object, propertyName);

    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUfConstraint,
    });
  };
}
