import { Injectable } from '@nestjs/common';
import { UserResponseDto } from '../dto/user-response.dto';
import { DateUtil } from '../utils/date.util';
import { UserValidator } from '../validators/user.validator';
import { UserLike } from '../types/user-like.type';

@Injectable()
export class UserMapper {
  constructor(private validator: UserValidator) {}

  mapToResponseDto(user: UserLike): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      age: user.birthDate ? DateUtil.calculateAge(user.birthDate) : null,
      createAge: DateUtil.calculateDaysSinceCreation(user.createdAt),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      validationStatus: this.validator.validateEmail(user.email),
      isActive: this.validator.isActive(user),
      isAdult: user.birthDate ? DateUtil.isAdult(user.birthDate) : false,
    };
  }

  mapToResponseDtoArray(users: UserLike[]): UserResponseDto[] {
    return users.map((user) => this.mapToResponseDto(user));
  }
}
