import { ValidationError } from 'class-validator';

// D5 (docs/PLAN-fundacao-ux.md): nome de campo e mensagem de validação não
// são sensíveis (o próprio plano diz isso) — por isso o `ValidationPipe`
// (ver configure-app.ts) usa este mapa em vez do `disableErrorMessages`
// padrão do Nest, que escondia tudo em produção e deixava o front sem
// saber qual campo falhou. Mensagens em português, uma por constraint —
// o "não mapeado" cai no fallback, nunca falha.
const CONSTRAINT_MESSAGES: Record<string, string> = {
  isEmail: 'E-mail inválido.',
  isEnum: 'Valor inválido.',
  isUuid: 'Valor inválido.',
  isString: 'Precisa ser um texto.',
  isBoolean: 'Precisa ser verdadeiro ou falso.',
  isIn: 'Valor não permitido.',
  isNotEmpty: 'Campo obrigatório.',
  maxLength: 'Tamanho máximo excedido.',
  minLength: 'Tamanho mínimo não atingido.',
  matches: 'Formato inválido.',
  whitelistValidation: 'Campo não permitido.',
};

const FALLBACK_MESSAGE = 'Valor inválido.';

export type FieldError = { field: string; message: string };

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  const result: FieldError[] = [];

  for (const error of errors) {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      const [firstConstraint] = Object.keys(error.constraints);
      result.push({
        field,
        message: CONSTRAINT_MESSAGES[firstConstraint] ?? FALLBACK_MESSAGE,
      });
    }

    if (error.children?.length) {
      result.push(...flattenValidationErrors(error.children, field));
    }
  }

  return result;
}
