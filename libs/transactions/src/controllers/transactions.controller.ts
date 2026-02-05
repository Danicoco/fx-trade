import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransactionsService } from '../services/transactions.service';
import { Roles, RolesGuard } from '@app/auth/guards/roles.guard';
import { JwtAuthGuard } from '@app/auth/guards/jwt.guard';
import {
  AccountVerificationDto,
  BankDto,
  InitiateDepositDto,
  InitiateDepositResponseDto,
  TransactionDto,
  TransactionQueryDto,
  InitiateWithdrawalDto,
  WithdrawalRequestDto,
  WithdrawalRequestQueryDto,
  ConvertCurrencyDto,
  FxRateDto,
} from '../dto/transactions.dto';
import { IdDto } from '@app/core/dto/id.dto';
import { GenericStatus } from '@app/core/dto/generic-status.dto';
import { PaymentProvider, UserRole } from '@app/typeorm/utils/enums';
import { User } from '@app/core/decorators/user.decorator';
import { WalletService } from '../services/wallet.service';

@ApiTags('Transactions')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly walletService: WalletService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all transactions (Admin only)' })
  @ApiResponse({ type: TransactionDto, isArray: true })
  async fetchAll(@Query() query: TransactionQueryDto) {
    return new GenericStatus({
      data: await this.transactionsService.fetchAll(query),
      description: 'Transactions retrieved successfully',
    });
  }

  @Get('user')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user transactions' })
  @ApiResponse({ type: TransactionDto, isArray: true })
  async fetchUserTransactions(
    @User() user: IdDto,
    @Query() query: TransactionQueryDto,
  ) {
    return new GenericStatus({
      data: await this.transactionsService.fetchUserTransactions(
        user.id,
        query,
      ),
      description: 'User transactions retrieved successfully',
    });
  }

  @Get('banks')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get list of banks' })
  @ApiResponse({ type: BankDto, isArray: true })
  async getBanks() {
    return new GenericStatus({
      data: await this.transactionsService.getBanks(),
      description: 'Banks retrieved successfully',
    });
  }

  @Post('deposit/initiate')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Initiate deposit transaction' })
  @ApiResponse({ type: InitiateDepositResponseDto })
  async initiateDepositTransaction(
    @User() user: IdDto,
    @Body() body: InitiateDepositDto,
  ) {
    return new GenericStatus({
      data: await this.transactionsService.initiateDepositTransaction(
        user.id,
        body,
      ),
      description: 'Deposit transaction initiated successfully',
    });
  }

  @Post('deposit/verify/:provider/:reference')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify deposit transaction' })
  @ApiResponse({ type: GenericStatus })
  async verifyTransaction(
    @User() user: IdDto,
    @Param('provider') provider: PaymentProvider,
    @Param('reference') reference: string,
  ) {
    return new GenericStatus({
      data: await this.transactionsService.verifyTransaction(
        user.id,
        provider,
        reference,
      ),
      description: 'Transaction verification completed',
    });
  }

  @Post('deposit/cancel/:reference')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel deposit transaction' })
  @ApiResponse({ type: GenericStatus })
  async cancelDepositTransaction(@Param('reference') reference: string) {
    return new GenericStatus({
      data: await this.transactionsService.cancelDepositTransaction(reference),
      description: 'Deposit transaction cancelled successfully',
    });
  }

  @Post('account/validate')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Validate bank account' })
  @ApiResponse({ type: AccountVerificationDto })
  async validateAccount(
    @Body() body: { bankCode: string; accountNumber: string },
  ) {
    return new GenericStatus({
      data: await this.transactionsService.validateAccount(body),
      description: 'Account validated successfully',
    });
  }

  @Post('withdrawal/initiate')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Initiate withdrawal request' })
  @ApiResponse({ type: WithdrawalRequestDto })
  async initiateWithdrawalRequest(
    @User() user: IdDto,
    @Body() body: InitiateWithdrawalDto,
  ) {
    return new GenericStatus({
      data: await this.transactionsService.initiateWithdrawalRequest(
        user.id,
        body,
      ),
      description: 'Withdrawal request initiated successfully',
    });
  }

  @Get('withdrawal-requests')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all withdrawal requests (Admin only)' })
  @ApiResponse({ type: WithdrawalRequestDto, isArray: true })
  async fetchAllWithdrawalRequests(@Query() query: WithdrawalRequestQueryDto) {
    return new GenericStatus({
      data: await this.transactionsService.fetchAllWithdrawalRequests(query),
      description: 'Withdrawal requests retrieved successfully',
    });
  }

  @Get('withdrawal-requests/user')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user withdrawal requests' })
  @ApiResponse({ type: WithdrawalRequestDto, isArray: true })
  async fetchUserWithdrawalRequests(
    @User() user: IdDto,
    @Query() query: WithdrawalRequestQueryDto,
  ) {
    return new GenericStatus({
      data: await this.transactionsService.fetchUserWithdrawalRequests(
        user.id,
        query,
      ),
      description: 'User withdrawal requests retrieved successfully',
    });
  }

  @Put('withdrawal-requests/:id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a withdrawal request (Admin only)' })
  @ApiResponse({ type: WithdrawalRequestDto })
  async approveWithdrawalRequest(
    @Param('id') id: string,
    @User() admin: IdDto,
  ) {
    return new GenericStatus({
      data: await this.transactionsService.approveWithdrawalRequestAsyncPaystack(
        id,
        admin.id,
      ),
      description: 'Withdrawal request approved successfully',
    });
  }

  @Put('withdrawal-requests/:id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a withdrawal request (Admin only)' })
  @ApiResponse({ type: WithdrawalRequestDto })
  async rejectWithdrawalRequest(@Param('id') id: string, @User() admin: IdDto) {
    return new GenericStatus({
      data: await this.transactionsService.rejectWithdrawalRequest(
        id,
        admin.id,
      ),
      description: 'Withdrawal request rejected successfully',
    });
  }

  @Post('convert')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({ type: ConvertCurrencyDto })
  async convertCurrency(@User() user: IdDto, @Body() body: ConvertCurrencyDto) {
    return new GenericStatus({
      data: await this.transactionsService.convertCurrency(user.id, body),
      description: `Convert ${body.baseCurrency} to ${body.targetCurrency}`,
    });
  }

  @Post('fx/rates')
  @Roles(UserRole.USER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({ type: FxRateDto })
  async getFxRates(@User() user: IdDto, @Body() body: FxRateDto) {
    return new GenericStatus({
      data: await this.transactionsService.getFxRate(user.id, body),
      description: `Get rate for ${body.baseCurrency}/${body.targetCurrency}`,
    });
  }
}
