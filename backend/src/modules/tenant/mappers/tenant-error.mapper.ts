import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/client';
import { TenantErrorCode } from '../domain/errors/tenant-error-codes';

export type TenantErrorContext =
    | 'create'
    | 'findAll'
    | 'findOne'
    | 'update'
    | 'remove';

@Injectable()
export class TenantErrorMapper {
    mapAndThrow(error: unknown, context: TenantErrorContext): never {
        if (error instanceof HttpException) {
            throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException({
                    message: 'Tenant ja existe.',
                    code: TenantErrorCode.DUPLICATE,
                    details: { target: error.meta?.target },
                });
            }

            if (error.code === 'P2025') {
                throw new NotFoundException({
                    message: 'Tenant nao encontrado.',
                    code: TenantErrorCode.NOT_FOUND,
                });
            }
        }

        throw new InternalServerErrorException({
            message: this.internalMessageByContext(context),
            code: this.internalCodeByContext(context),
        });
    }

    private internalMessageByContext(context: TenantErrorContext): string {
        if (context === 'create') return 'Erro interno ao criar tenant.';
        if (context === 'findAll') return 'Erro ao buscar tenants.';
        if (context === 'findOne') return 'Erro ao buscar tenant.';
        if (context === 'update') return 'Erro ao atualizar tenant.';
        return 'Erro ao remover tenant.';
    }

    private internalCodeByContext(context: TenantErrorContext): string {
        if (context === 'create') return TenantErrorCode.CREATE_ERROR;
        if (context === 'findAll') return TenantErrorCode.FIND_ALL_ERROR;
        if (context === 'findOne') return TenantErrorCode.FIND_ONE_ERROR;
        if (context === 'update') return TenantErrorCode.UPDATE_ERROR;
        return TenantErrorCode.REMOVE_ERROR;
    }
}
