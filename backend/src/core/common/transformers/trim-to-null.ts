import { Transform } from 'class-transformer';

// D2/D3 (docs/PLAN-fundacao-ux.md): campo opcional de texto vazio vira
// `null`, nunca `""` — já garantido no autosave do front (D2), repetido
// aqui na borda do DTO pra qualquer cliente (não só o FormView). Espaço
// em branco só ("   ") também conta como vazio. Passa adiante valores
// não-string sem tentar normalizar.
export function TrimToNull(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });
}
