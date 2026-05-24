import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/prisma/client';
import { UserErrorCode } from '../domain/errors/user-error-codes';

export type UserErrorContext =
    | 'create'
    | 'findAll'
    | 'findOne'
    | 'update'
    | 'remove';

@Injectable()
export class UserErrorMapper {
    mapAndThrow(error: unknown, context: UserErrorContext): never {
        if (error instanceof HttpException) {
            throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                throw new ConflictException({
                    message: 'Usuario ja existe.',
                    code: UserErrorCode.DUPLICATE,
                    details: { target: error.meta?.target },
                });
            }

            if (error.code === 'P2025') {
                throw new NotFoundException({
                    message: 'Usuario nao encontrado.',
                    code: UserErrorCode.NOT_FOUND,
                });
            }
        }

        throw new InternalServerErrorException({
            message: this.internalMessageByContext(context),
            code: this.internalCodeByContext(context),
        });
    }

    private internalMessageByContext(context: UserErrorContext): string {
        if (context === 'create') return 'Erro interno ao criar usuario.';
        if (context === 'findAll') return 'Erro ao buscar usuarios.';
        if (context === 'findOne') return 'Erro ao buscar usuario.';
        if (context === 'update') return 'Erro ao atualizar usuario.';
        return 'Erro ao remover usuario.';
    }

    private internalCodeByContext(context: UserErrorContext): string {
        if (context === 'create') return UserErrorCode.CREATE_ERROR;
        if (context === 'findAll') return UserErrorCode.FIND_ALL_ERROR;
        if (context === 'findOne') return UserErrorCode.FIND_ONE_ERROR;
        if (context === 'update') return UserErrorCode.UPDATE_ERROR;
        return UserErrorCode.REMOVE_ERROR;
    }
}
