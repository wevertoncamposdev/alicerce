import { Transform } from 'class-transformer';

// D3 (docs/PLAN-fundacao-ux.md): CPF/CNPJ/CEP/telefone chegam do front com
// máscara (pontos, barra, hífen, espaço) — sem normalizar, o validador de
// dígito verificador (is-document.validator.ts) e o tamanho da coluna
// rejeitam um valor correto só porque tem pontuação. Remove tudo que não é
// dígito antes de validar; passa adiante valores não-string (undefined num
// campo opcional, ou algo que o validador seguinte vai rejeitar de
// qualquer forma) sem tentar normalizar — mesmo padrão defensivo do
// `NormalizeEmail`.
export function OnlyDigits(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D+/g, '') : value,
  );
}
