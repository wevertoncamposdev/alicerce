export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string | null;
  age!: number | null;
  createAge!: number;
  validationStatus?: boolean;
  isActive?: boolean;
  isAdult?: boolean;
  birthDate?: Date | null;
  createdAt!: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}
