import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantErrorCode } from '../errors/tenant-error-codes';

@Injectable()
export class TenantBusinessRules {
  validateTenantId(id: string): void {
    if (!id || typeof id !== 'string' || id.length !== 36) {
      throw new BadRequestException({
        message: 'ID invalido',
        code: TenantErrorCode.ID_INVALID,
        details: { id },
      });
    }
  }
}
