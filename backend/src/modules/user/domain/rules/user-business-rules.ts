import { BadRequestException, Injectable } from '@nestjs/common';
import { UserErrorCode } from '../errors/user-error-codes';
import { UserResponseDto } from '../../dto/user-response.dto';

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

    filterUsersBySearch(users: UserResponseDto[], search: string): UserResponseDto[] {
        if (search === 'all') {
            return users;
        }

        if (search === 'adults') {
            return users.filter((user) => user.isAdult);
        }

        if (search === 'non-adults') {
            return users.filter((user) => !user.isAdult);
        }

        return [];
    }
}
