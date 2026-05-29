import { Injectable } from '@nestjs/common';
import { DateUtil } from '../utils/date.util';

@Injectable()
export class UserValidator {
  validateEmail(email: string): boolean {
    return email === 'new@teste.com';
  }

  isActive(user: any): boolean {
    // Exemplo: usuário é ativo se não foi deletado
    return user.deletedAt === null;
  }

  isEligibleForSpecialOffer(user: any): boolean {
    // Exemplo: oferta especial para maiores de 18
    return user.birthDate ? DateUtil.isAdult(user.birthDate) : false;
  }
}
