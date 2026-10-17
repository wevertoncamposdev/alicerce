import { Injectable } from '@nestjs/common';
import { DateUtil } from '../utils/date.util';
import { UserLike } from '../types/user-like.type';

@Injectable()
export class UserValidator {
  validateEmail(email: string): boolean {
    return email === 'new@teste.com';
  }

  isActive(user: UserLike): boolean {
    // Exemplo: usuário é ativo se não foi deletado
    return user.deletedAt === null;
  }

  isEligibleForSpecialOffer(user: UserLike): boolean {
    // Exemplo: oferta especial para maiores de 18
    return user.birthDate ? DateUtil.isAdult(user.birthDate) : false;
  }
}
