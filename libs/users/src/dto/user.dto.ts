import { PaginationParams } from '@app/core/dto/pagination-params.dto';
import { WalletBalance } from '@app/typeorm/entities/wallet-balance.entity';
import { UserRole } from '@app/typeorm/utils/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  verifiedAt: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  role: UserRole;
}

export class UserQueryDto extends PaginationParams {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}

export class CreateAdminDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class CreateAffiliateDto extends CreateAdminDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  affiliateCode: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => Number(value))
  percentageShareOfAffiliate: number;
}

export class WalletDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user: string;

  @ApiProperty()
  balances: WalletBalance[];
}

export class UserStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  verifiedUsers: number;

  @ApiProperty()
  totalAdmins: number;
}
