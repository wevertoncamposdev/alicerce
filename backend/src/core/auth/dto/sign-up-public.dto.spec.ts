import { validate } from 'class-validator';
import { SignUpPublicDto } from './sign-up-public.dto';

function buildDto(acceptedTerms: unknown): SignUpPublicDto {
  const dto = new SignUpPublicDto();
  dto.tenantName = 'Instituição de Teste';
  dto.tenantSlug = 'instituicao-de-teste';
  dto.email = 'pessoa@example.com';
  dto.password = 'uma-senha-bem-forte-123';
  dto.acceptedTerms = acceptedTerms as boolean;
  return dto;
}

describe('SignUpPublicDto.acceptedTerms (etapa 9.1, LGPD)', () => {
  it('rejeita quando ausente', async () => {
    const dto = buildDto(undefined);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'acceptedTerms')).toBe(true);
  });

  it('rejeita quando falso', async () => {
    const dto = buildDto(false);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'acceptedTerms')).toBe(true);
  });

  it('aceita quando verdadeiro', async () => {
    const dto = buildDto(true);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'acceptedTerms')).toBe(false);
  });
});
