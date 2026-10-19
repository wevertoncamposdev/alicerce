import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MIN_LENGTH = 8;

@ValidatorConstraint({ name: 'isStrongPassword' })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== 'string' || value.length < MIN_LENGTH) {
      return false;
    }

    // Só compara com o e-mail quando ele vem no mesmo payload — num PATCH
    // parcial sem `email`, não há com o que comparar.
    const email = (args.object as Record<string, unknown>).email;
    if (typeof email === 'string' && value === email) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return `A senha deve ter no mínimo ${MIN_LENGTH} caracteres e não pode ser igual ao e-mail.`;
  }
}

// Política mínima de senha (AGENTS §1.7): mínimo 8 caracteres, nunca igual
// ao e-mail do mesmo objeto. Lista de senhas vazadas fica como melhoria
// futura (fora do escopo desta etapa).
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
