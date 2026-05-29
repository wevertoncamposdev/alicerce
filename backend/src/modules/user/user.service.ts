import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserMapper } from './mappers/user.mapper';
import { UserBusinessRules } from './domain/rules/user-business-rules';
import { UserErrorCode } from './domain/errors/user-error-codes';
import { UserRepository } from './persistence/repository/user.repository';
import { UserErrorMapper } from './mappers/user-error.mapper';
import { Prisma } from '@core/prisma/generated/client';

import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userMapper: UserMapper,
    private readonly userBusinessRules: UserBusinessRules,
    private readonly userErrorMapper: UserErrorMapper,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const { tenantId, personId, ...rest } = createUserDto;
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = await this.userRepository.create({
        ...rest,
        password: hashedPassword,
        tenant: {
          connect: { id: tenantId },
        },
        person: personId
          ? {
            connect: { id: personId },
          }
          : undefined,
      });

      return this.userMapper.mapToResponseDto(user);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'create');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    this.userBusinessRules.validateUserId(id);

    try {
      const { personId, password, ...rest } = updateUserDto;
      const data: Prisma.UserUpdateInput = { ...rest };

      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      if (personId) {
        data.person = {
          connect: { id: personId },
        };
      }

      return await this.userRepository.updateById(id, data);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'update');
    }
  }

  async remove(id: string) {
    this.userBusinessRules.validateUserId(id);

    try {
      return await this.userRepository.softDeleteById(id);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'remove');
    }
  }

  async findAll() {
    try {
      return await this.userRepository.findManyActive();
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findAll');
    }
  }

  async findOne(id: string) {
    this.userBusinessRules.validateUserId(id);

    try {
      const user = await this.userRepository.findById(id);

      if (!user) {
        throw new NotFoundException({
          message: 'Usuario nao encontrado',
          code: UserErrorCode.NOT_FOUND,
          details: { id },
        });
      }

      return user;
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findOne');
    }
  }

  async findOneWithEmail(email: string) {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findOne');
    }
  }

  async findAllWithValidation(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.findManyActive();
      return this.userMapper.mapToResponseDtoArray(users);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findAll');
    }
  }

  async getAdultUserStats(search: string): Promise<UserResponseDto[]> {
    const users = await this.findAllWithValidation();
    return this.userBusinessRules.filterUsersBySearch(users, search);
  }

  async getActiveUsersCount(): Promise<number> {
    try {
      return await this.userRepository.countActive();
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findAll');
    }
  }
}
