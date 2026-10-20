import { BadRequestException, Injectable } from '@nestjs/common';
import { UserErrorCode } from '../errors/user-error-codes';

@Injectable()
export class UserBusinessRules {
  validateUserId(id: string): void {
    if (!id || typeof id !== 'string' || id.length !== 36) {
      throw new BadRequestException({
        message: 'ID invalido',
        code: UserErrorCode.ID_INVALID,
        details: { id },
      });
    }
  }
}
