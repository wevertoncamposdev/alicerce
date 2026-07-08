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

    parseDate(value?: string): Date | undefined {
        if (!value) {
            return undefined;
        }

        return new Date(value);
    }

    validateDateRange(foundedAt?: Date, closedAt?: Date): void {
        if (foundedAt && closedAt && closedAt < foundedAt) {
            throw new BadRequestException({
                message: 'A data de encerramento nao pode ser anterior a data de fundacao.',
                code: TenantErrorCode.DATE_RANGE_INVALID,
                details: {
                    foundedAt: foundedAt.toISOString(),
                    closedAt: closedAt.toISOString(),
                },
            });
        }
    }
}
