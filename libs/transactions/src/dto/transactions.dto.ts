import { PaginationParams } from '@app/core/dto/pagination-params.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import {
  TransactionStatus,
  TransactionType,
  Currency,
  WithdrawalStatus,
  WithdrawalFeeType,
  PaymentProvider,
} from '@app/typeorm/utils/enums';
import { IsAny } from '@app/core/validators/IsAny.validator';

export class TransactionDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  user: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNumber()
  fee: number;

  @ApiProperty()
  @IsUUID()
  wallet: string;

  @ApiProperty({ enum: TransactionStatus })
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty()
  @IsString()
  reference: string;

  @ApiProperty()
  @IsString()
  wasRefunded: boolean;

  @ApiProperty()
  @IsString()
  wasReverted: boolean;

  @ApiProperty()
  @IsDateString()
  dateCompleted: Date;

  @ApiProperty()
  @IsDateString()
  dateInitiated: Date;

  @ApiProperty()
  @IsDateString()
  dateRefunded: Date;

  @ApiProperty()
  @IsDateString()
  dateReverted: Date;

  @ApiProperty()
  meta: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class InitiateDepositDto {
  @ApiProperty()
  @IsNumber()
  @Min(100, { message: 'Amount must be greater than N100' })
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider: PaymentProvider;
}

export class ConvertCurrencyDto {
  @ApiProperty()
  @IsNumber()
  @Min(100, { message: 'Amount must be greater than N100' })
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  @IsNotEmpty()
  baseCurrency: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  @IsNotEmpty()
  targetCurrency: string;
}

export class FxRateDto {
  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  @IsNotEmpty()
  baseCurrency: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  @IsNotEmpty()
  targetCurrency: string;
}

export class ValidateAccountDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountNumber: string;
}

export class TransactionQueryDto extends PaginationParams {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  wallet?: string;

  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: Date;
}

export class BankDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  ussdTemplate: string | null;

  @ApiProperty()
  @IsString()
  baseUssdCode: string | null;

  @ApiProperty()
  @IsString()
  bankId: string | null;

  @ApiProperty()
  @IsString()
  nipBankCode: string;
}

export class AccountVerificationDto {
  @ApiProperty()
  @IsString()
  accountName: string | null;

  @ApiProperty()
  @IsString()
  accountNumber: string | null;

  @ApiProperty()
  @IsString()
  bankCode: string | null;
}

export class InitiateDepositResponseDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsString()
  reference: string;

  @ApiProperty()
  @IsString()
  customerFullName: string;

  @ApiProperty()
  @IsString()
  customerEmail: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty()
  @IsString()
  accessCode: string;
}

export class MonnifyWebhookPayloadDto {
  @ApiProperty()
  @IsString()
  eventType: any;

  @ApiProperty()
  @IsAny()
  eventData: any;
}

export class PaystackWebhookPayloadDto {
  @ApiProperty()
  @IsString()
  event: any;

  @ApiProperty()
  @IsAny()
  data: any;
}

export class InitiateWithdrawalDto {
  @ApiProperty()
  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  @IsNotEmpty()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountNumber: string;
}

export class WithdrawalRequestDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsUUID()
  user: string;

  @ApiProperty()
  userInfo?: {
    fullName: string;
    email: string;
    username: string;
  };

  @ApiProperty()
  @IsUUID()
  transaction: string;

  @ApiProperty()
  @IsUUID()
  wallet: string;

  @ApiProperty({ enum: WithdrawalStatus })
  @IsEnum(WithdrawalStatus)
  status: WithdrawalStatus;

  @ApiProperty()
  @IsUUID()
  @IsOptional()
  processedBy: string | null;

  @ApiProperty()
  @IsDateString()
  @IsOptional()
  dateProcessed: Date | null;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsDateString()
  dateInitiated: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  isAutoWithdrawn: boolean;
}

export class WithdrawalRequestQueryDto extends PaginationParams {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user?: string;

  @ApiPropertyOptional({ enum: WithdrawalStatus })
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  status?: WithdrawalStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: Date;
}

export class WithdrawalConfigDto {
  @ApiProperty()
  @IsNumber()
  minimumWithdrawal: number;

  @ApiProperty()
  @IsNumber()
  maximumWithdrawal: number;

  @ApiProperty()
  @IsNumber()
  maximumAutoWithdrawalableAmount: number;

  @ApiProperty({ enum: WithdrawalFeeType })
  @IsEnum(WithdrawalFeeType)
  withdrawalFeeType: WithdrawalFeeType;

  @ApiProperty()
  @IsNumber()
  withdrawalFeeValue: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UpdateWithdrawalConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumWithdrawal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumWithdrawal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumAutoWithdrawalableAmount?: number;

  @ApiPropertyOptional({ enum: WithdrawalFeeType })
  @IsOptional()
  @IsEnum(WithdrawalFeeType)
  withdrawalFeeType?: WithdrawalFeeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  withdrawalFeeValue?: number;
}

export class AdminLoadOrUnloadWalletDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;
}
