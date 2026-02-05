/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction } from '@app/typeorm/entities/transaction.entity';
import { User } from '@app/typeorm/entities/user.entity';
import { Wallet } from '@app/typeorm/entities/wallet.entity';
import { WithdrawalRequest } from '@app/typeorm/entities/withdrawal-request.entity';
import { MonnifyService } from '@app/core/services/monnify.service';
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
import { PaginatedResponse } from '@app/core/dto/paginated-response.dto';
import {
  TransactionStatus,
  TransactionType,
  Currency,
  TransactionDescription,
  WithdrawalStatus,
  WithdrawalFeeType,
  PaymentProvider,
} from '@app/typeorm/utils/enums';
import { createReference } from '@app/core/utils/helpers';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  MonnifyDisbursementWebhookPayload,
  MonnifySuccessfulTransactionEventData,
  MonnifyWebhookPayload,
} from '@app/core/utils/monnify.interface';
import { formatCurrency } from '../utils/helpers';
import { PaystackService } from '@app/core/services/paystack.service';
import { PaystackWebhookPayload } from '@app/core/utils/paystack.interface';
import { WalletBalance } from '@app/typeorm/entities';
import { ExchangeRateService } from '@app/core/services/exchange-rate.service';
import { IExchangeRateResponse } from '@app/core/utils/exchange-rate.interface';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,

    @InjectRepository(WalletBalance)
    private readonly walletBalanceRepository: Repository<WalletBalance>,

    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRequestRepository: Repository<WithdrawalRequest>,

    private readonly monnifyService: MonnifyService,
    private readonly paystackService: PaystackService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly dataSource: DataSource,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async fetchAll(
    query: TransactionQueryDto,
  ): Promise<PaginatedResponse<TransactionDto>> {
    const {
      page,
      pageSize,
      skip,
      user,
      amount,
      wallet,
      status,
      type,
      currency,
      reference,
      startDate,
      endDate,
    } = query;

    const queryBuilder =
      this.transactionRepository.createQueryBuilder('transaction');

    if (user) {
      queryBuilder.andWhere('transaction.user = :user', { user });
    }

    if (amount) {
      queryBuilder.andWhere('transaction.amount = :amount', { amount });
    }

    if (wallet) {
      queryBuilder.andWhere('transaction.wallet = :wallet', { wallet });
    }

    if (status) {
      queryBuilder.andWhere('transaction.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }

    if (currency) {
      queryBuilder.andWhere('transaction.currency = :currency', { currency });
    }

    if (reference) {
      queryBuilder.andWhere('transaction.reference = :reference', {
        reference,
      });
    }

    if (startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
    }

    queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('transaction.createdAt', 'DESC');

    const [transactions, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponse(
      transactions.map((transaction) => this.mapToDto(transaction)),
      total,
      page ?? 1,
      pageSize ?? 10,
    );
  }

  async fetchUserTransactions(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<PaginatedResponse<TransactionDto>> {
    const modifiedQuery = { ...query, user: userId, skip: query.skip };
    return this.fetchAll(modifiedQuery);
  }

  async getBanks(): Promise<BankDto[]> {
    return await this.monnifyService.getBanks();
  }

  async initiateDepositTransaction(
    userId: string,
    data: InitiateDepositDto,
  ): Promise<InitiateDepositResponseDto> {
    console.log('initiateDepositTransaction', data);
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletRepository.findOne({
      where: { user: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const reference = createReference();
    let accessCode: string = '';

    if (data.provider === PaymentProvider.PAYSTACK) {
      try {
        const result = await this.paystackService.initializeTransaction({
          email: user.email,
          amount: data.amount,
        });
        if (!result) {
          throw new BadRequestException(
            'Failed to initialize transaction from paystack',
          );
        }
        accessCode = result.access_code;
      } catch (error) {
        console.error('Error initializing transaction from paystack', error);
        throw error;
      }
    }

    await this.transactionRepository.save({
      user: userId,
      amount: data.amount,
      reference,
      type: TransactionType.CREDIT,
      currency: Currency.NGN,
      fee: 0,
      wallet: wallet.id,
      status: TransactionStatus.PENDING,
      dateInitiated: new Date(),
      description: TransactionDescription.WALLET_TOPUP,
      provider: data.provider,
    });

    return {
      amount: data.amount,
      reference,
      customerFullName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      provider: data.provider,
      accessCode,
    };
  }

  async verifyTransaction(
    userId: string,
    provider: PaymentProvider,
    reference: string,
  ): Promise<{ status: string; transaction?: TransactionDto }> {
    if (provider === PaymentProvider.MONNIFY) {
      return this.verifyTransactionMonnify(userId, reference);
    }
    if (provider === PaymentProvider.PAYSTACK) {
      return this.verifyTransactionPaystack(userId, reference);
    }

    throw new BadRequestException('Invalid provider');
  }

  async verifyTransactionMonnify(
    userId: string,
    reference: string,
  ): Promise<{ status: string; transaction?: TransactionDto }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const monnifyTransaction =
      await this.monnifyService.getTransaction(reference);

    if (!monnifyTransaction) {
      throw new NotFoundException('Transaction reference not found');
    }

    if (monnifyTransaction.customer.email !== user.email) {
      throw new BadRequestException('Transaction does not belong to user');
    }

    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (transaction?.status === TransactionStatus.SUCCESSFUL) {
      return {
        status: 'already verified',
        transaction: this.mapToDto(transaction),
      };
    }

    if (!transaction) {
      // Create transaction from monnify transaction
      const wallet = await this.walletRepository.findOne({
        where: { user: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const walletBalances = await this.walletBalanceRepository.findOne({
        where: {
          wallet: wallet.id,
          currency: Currency.NGN,
        },
      });

      if (!walletBalances) {
        throw new NotFoundException('Wallet not found');
      }

      try {
        const result = await this.dataSource.transaction(async (manager) => {
          const newTransaction = await manager.save(Transaction, {
            user: userId,
            amount: +monnifyTransaction.amountPaid,
            wallet: wallet.id,
            status: TransactionStatus.SUCCESSFUL,
            type: TransactionType.CREDIT,
            reference,
            currency: monnifyTransaction.currency as Currency,
            fee: 0,
            dateInitiated: new Date(),
            dateCompleted: new Date(),
            description: TransactionDescription.WALLET_TOPUP,
            provider: PaymentProvider.MONNIFY,
          });

          const newBalance =
            Number(walletBalances.balance) +
            Number(monnifyTransaction.amountPaid);

          await this.walletBalanceRepository.update(
            { id: walletBalances.id },
            {
              balance: newBalance,
            },
          );

          return { newTransaction, newBalance };
        });

        return {
          status: 'successful',
          transaction: this.mapToDto(result.newTransaction),
        };
      } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
      }
    }

    if (monnifyTransaction.paymentStatus === 'PAID') {
      // Update transaction status and wallet balance
      const wallet = await this.walletRepository.findOne({
        where: { user: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      try {
        await this.dataSource.transaction(async (manager) => {
          await manager.update(Transaction, transaction.id, {
            status: TransactionStatus.SUCCESSFUL,
            amount: +monnifyTransaction.amountPaid,
            dateCompleted: new Date(),
          });

          return { newBalance: 0 };
        });

        return {
          status: 'successful',
          transaction: this.mapToDto(transaction),
        };
      } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
      }
    }

    return {
      status: 'pending',
      transaction: this.mapToDto(transaction),
    };
  }

  async verifyTransactionPaystack(
    userId: string,
    reference: string,
  ): Promise<{ status: string; transaction?: TransactionDto }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const paystackTransaction =
      await this.paystackService.getTransaction(reference);

    if (!paystackTransaction) {
      throw new NotFoundException('Transaction reference not found');
    }

    if (paystackTransaction.customer.email !== user.email) {
      throw new BadRequestException('Transaction does not belong to user');
    }

    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (transaction?.status === TransactionStatus.SUCCESSFUL) {
      return {
        status: 'already verified',
        transaction: this.mapToDto(transaction),
      };
    }

    if (!transaction) {
      // Create transaction from monnify transaction
      const wallet = await this.walletRepository.findOne({
        where: { user: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const walletBalances = await this.walletBalanceRepository.findOne({
        where: { wallet: wallet.id, currency: Currency.NGN },
      });

      if (!walletBalances) {
        throw new NotFoundException('Wallet not found');
      }

      try {
        const result = await this.dataSource.transaction(async (manager) => {
          const newTransaction = await manager.save(Transaction, {
            user: userId,
            amount: +paystackTransaction.amount,
            wallet: wallet.id,
            status: TransactionStatus.SUCCESSFUL,
            type: TransactionType.CREDIT,
            reference,
            currency: paystackTransaction.currency as Currency,
            fee: 0,
            dateInitiated: new Date(),
            dateCompleted: new Date(),
            description: TransactionDescription.WALLET_TOPUP,
            provider: PaymentProvider.PAYSTACK,
          });

          const newBalance =
            Number(walletBalances.balance) + Number(paystackTransaction.amount);

          await this.walletBalanceRepository.update(
            { id: walletBalances.id },
            {
              balance: newBalance,
            },
          );

          return { newTransaction, newBalance };
        });

        return {
          status: 'successful',
          transaction: this.mapToDto(result.newTransaction),
        };
      } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
      }
    }

    if (paystackTransaction.status === 'success') {
      // Update transaction status and wallet balance
      const wallet = await this.walletRepository.findOne({
        where: { user: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      try {
        await this.dataSource.transaction(async (manager) => {
          await manager.update(Transaction, transaction.id, {
            status: TransactionStatus.SUCCESSFUL,
            amount: +paystackTransaction.amount,
            dateCompleted: new Date(),
          });

          return { newBalance: 0 };
        });

        return {
          status: 'successful',
          transaction: this.mapToDto(transaction),
        };
      } catch (error) {
        console.error('Transaction failed:', error);
        throw error;
      }
    }

    return {
      status: 'pending',
      transaction: this.mapToDto(transaction),
    };
  }

  async cancelDepositTransaction(
    reference: string,
  ): Promise<{ status: string }> {
    const transaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === TransactionStatus.SUCCESSFUL) {
      throw new BadRequestException('Transaction already successful');
    }

    await this.transactionRepository.update(transaction.id, {
      status: TransactionStatus.FAILED,
    });

    return {
      status: 'cancelled',
    };
  }

  async validateAccount(data: {
    bankCode: string;
    accountNumber: string;
  }): Promise<AccountVerificationDto> {
    const verification = await this.monnifyService.verifyAccount(data);

    if (!verification?.accountName) {
      throw new BadRequestException('Invalid account details');
    }

    return verification;
  }

  async monnifyWebhook(data: MonnifyWebhookPayload): Promise<void> {
    console.log('monnifyWebhook received', data);
    const { eventType, eventData } = data;

    switch (eventType) {
      case 'SUCCESSFUL_TRANSACTION':
        return this.handleSuccessfulTransactionMonnify(
          eventData as MonnifySuccessfulTransactionEventData,
        );
        break;
      case 'SUCCESSFUL_DISBURSEMENT':
        return this.handleSuccessfulDisbursementMonnify(
          eventData as MonnifyDisbursementWebhookPayload,
        );
      case 'FAILED_DISBURSEMENT':
        return this.handleFailedDisbursementMonnify(
          eventData as MonnifyDisbursementWebhookPayload,
        );
      case 'REVERSED_DISBURSEMENT':
        return this.handleReversedDisbursementMonnify(
          eventData as MonnifyDisbursementWebhookPayload,
        );
      default:
        throw new BadRequestException('Invalid event type');
    }
  }

  async paystackWebhook(data: PaystackWebhookPayload): Promise<void> {
    console.log('paystackWebhook received', data);
    const { event } = data;

    switch (event) {
      case 'transfer.success':
        return this.handleSuccessfulDisbursementPaystack(data);
      case 'transfer.failed':
      case 'transfer.reversed':
        return this.handleFailedDisbursementPaystack(data);
      default:
        throw new BadRequestException('Invalid event type');
    }
  }

  async initiateWithdrawalRequest(
    userId: string,
    data: InitiateWithdrawalDto,
  ): Promise<WithdrawalRequestDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletRepository.findOne({
      where: { user: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Validate amount
    if (+data.amount < 12) {
      throw new BadRequestException(
        `Amount must be at least ${formatCurrency(12)}`,
      );
    }

    if (+data.amount > +12) {
      throw new BadRequestException(
        `Amount must not exceed ${formatCurrency(12)}`,
      );
    }

    // Validate account
    const accountVerification = await this.validateAccount({
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
    });

    if (!accountVerification.accountName) {
      throw new BadRequestException('Invalid account details');
    }

    // Calculate fee
    const fee = this.calculateWithdrawalFee(
      data.amount,
      WithdrawalFeeType.FIXED,
      12,
    );

    const totalAmount = +data.amount + +fee;

    const reference = createReference();

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        // Create transaction
        const transaction = await manager.save(Transaction, {
          user: userId,
          amount: data.amount,
          fee,
          wallet: wallet.id,
          status: TransactionStatus.PENDING,
          type: TransactionType.DEBIT,
          reference,
          currency: Currency.NGN,
          dateInitiated: new Date(),
          description: TransactionDescription.WITHDRAWAL,
          meta: {
            bankCode: data.bankCode,
            accountNumber: data.accountNumber,
            accountName: accountVerification.accountName,
          },
        });

        // Create withdrawal request
        const withdrawalRequest = await manager.save(WithdrawalRequest, {
          user: userId,
          transaction: transaction.id,
          wallet: wallet.id,
          amount: data.amount,
          status: WithdrawalStatus.PENDING,
          dateInitiated: new Date(),
        });

        await manager.save(User, user);

        return { transaction, withdrawalRequest };
      });

      // Auto-process if amount is less than max auto withdrawable
      if (data.amount <= 12) {
        await this.processAutoWithdrawalAsyncPaystack(
          result.withdrawalRequest.id,
        );
      }

      return this.mapWithdrawalRequestToDto(result.withdrawalRequest);
    } catch (error) {
      console.error('Withdrawal request failed:', error);
      throw error;
    }
  }

  async fetchAllWithdrawalRequests(
    query: WithdrawalRequestQueryDto,
  ): Promise<PaginatedResponse<WithdrawalRequestDto>> {
    const { page, pageSize, skip, user, status, startDate, endDate } = query;

    const queryBuilder = this.withdrawalRequestRepository
      .createQueryBuilder('withdrawalRequest')
      .select([
        'withdrawalRequest.id as id',
        'withdrawalRequest.user as user',
        'withdrawalRequest.transaction as transaction',
        'withdrawalRequest.wallet as wallet',
        'withdrawalRequest.status as status',
        'withdrawalRequest.processedBy as "processedBy"',
        'withdrawalRequest.dateProcessed as "dateProcessed"',
        'withdrawalRequest.amount as amount',
        'withdrawalRequest.dateInitiated as "dateInitiated"',
        'withdrawalRequest.createdAt as "createdAt"',
        'withdrawalRequest.updatedAt as "updatedAt"',
        'withdrawalRequest.isAutoWithdrawn as "isAutoWithdrawn"',
      ])
      .addSelect(
        `JSON_BUILD_OBJECT(
          'id', "user"."id",
          'firstName', "user"."firstName",
          'lastName', "user"."lastName",
          'email', "user"."email",
          'username', "user"."username"
        )`,
        'userInfo',
      )
      .leftJoin(User, 'user', 'user.id = withdrawalRequest.user');

    if (user) {
      queryBuilder.andWhere('withdrawalRequest.user = :user', { user });
    }

    if (status) {
      queryBuilder.andWhere('withdrawalRequest.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('withdrawalRequest.createdAt >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('withdrawalRequest.createdAt <= :endDate', {
        endDate,
      });
    }

    queryBuilder
      .skip(skip)
      .take(pageSize)
      .orderBy('withdrawalRequest.createdAt', 'DESC');

    const [requests, total] = await Promise.all([
      queryBuilder.getRawMany(),
      queryBuilder.getCount(),
    ]);

    return new PaginatedResponse(
      requests.map((request) => this.mapWithdrawalRequestToDto(request)),
      total,
      page ?? 1,
      pageSize ?? 10,
    );
  }

  async fetchUserWithdrawalRequests(
    userId: string,
    query: WithdrawalRequestQueryDto,
  ): Promise<PaginatedResponse<WithdrawalRequestDto>> {
    const modifiedQuery = { ...query, user: userId, skip: query.skip };
    return this.fetchAllWithdrawalRequests(modifiedQuery);
  }

  async approveWithdrawalRequestAsyncMonnify(
    withdrawalRequestId: string,
    adminId: string,
  ): Promise<WithdrawalRequestDto> {
    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { id: withdrawalRequestId },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Withdrawal request is already ${withdrawalRequest.status}`,
      );
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: withdrawalRequest.transaction },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.meta) {
      throw new BadRequestException('Transaction metadata missing');
    }

    try {
      // Process withdrawal via Monnify
      const disbursementResult = await this.monnifyService.singleDisbursement({
        amount: withdrawalRequest.amount,
        reference: transaction.reference,
        narration: `Withdrawal - ${transaction.reference}`,
        destinationBankCode: transaction.meta.bankCode,
        destinationAccountNumber: transaction.meta.accountNumber,
      });

      console.log('disbursement result', disbursementResult);

      // Update transaction and withdrawal request status
      if (
        disbursementResult.status === 'SUCCESS' ||
        disbursementResult.status === 'PENDING'
      ) {
        await this.dataSource.transaction(async (manager) => {
          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.PROCESSING,
            processedBy: adminId,
          });
        });

        // Refresh the withdrawal request to get updated data
        const updatedRequest = await this.withdrawalRequestRepository.findOne({
          where: { id: withdrawalRequestId },
        });

        return this.mapWithdrawalRequestToDto(updatedRequest!);
      } else {
        throw new BadRequestException(
          'Withdrawal disbursement failed. Please try again or contact support.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Withdrawal approval processing failed:', error);
      throw new BadRequestException(
        'Failed to process withdrawal. Please try again or contact support.',
      );
    }
  }

  async approveWithdrawalRequestAsyncPaystack(
    withdrawalRequestId: string,
    adminId: string,
  ): Promise<WithdrawalRequestDto> {
    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { id: withdrawalRequestId },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Withdrawal request is already ${withdrawalRequest.status}`,
      );
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: withdrawalRequest.transaction },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (!transaction.meta) {
      throw new BadRequestException('Transaction metadata missing');
    }

    try {
      // Process withdrawal via Monnify
      const disbursementResult = await this.paystackService.singleDisbursement({
        amount: withdrawalRequest.amount,
        reference: transaction.reference,
        narration: `Withdrawal - ${transaction.reference}`,
        destinationBankCode: transaction.meta.bankCode,
        destinationAccountNumber: transaction.meta.accountNumber,
      });

      console.log('disbursement result', disbursementResult);

      // Update transaction and withdrawal request status
      if (
        disbursementResult.status === 'success' ||
        disbursementResult.status === 'pending' ||
        disbursementResult.status === 'processing'
      ) {
        await this.dataSource.transaction(async (manager) => {
          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.PROCESSING,
            processedBy: adminId,
          });
        });

        // Refresh the withdrawal request to get updated data
        const updatedRequest = await this.withdrawalRequestRepository.findOne({
          where: { id: withdrawalRequestId },
        });

        return this.mapWithdrawalRequestToDto(updatedRequest!);
      } else {
        throw new BadRequestException(
          'Withdrawal disbursement failed. Please try again or contact support.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Withdrawal approval processing failed:', error);
      throw new BadRequestException(
        'Failed to process withdrawal. Please try again or contact support.',
      );
    }
  }

  async rejectWithdrawalRequest(
    withdrawalRequestId: string,
    adminId: string,
  ): Promise<WithdrawalRequestDto> {
    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { id: withdrawalRequestId },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException('Withdrawal request not found');
    }

    if (withdrawalRequest.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        `Withdrawal request is already ${withdrawalRequest.status}`,
      );
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: withdrawalRequest.transaction },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // Update transaction status to failed
        await manager.update(Transaction, transaction.id, {
          status: TransactionStatus.FAILED,
        });

        // Update withdrawal request status to declined
        await manager.update(WithdrawalRequest, withdrawalRequest.id, {
          status: WithdrawalStatus.DECLINED,
          processedBy: adminId,
          dateProcessed: new Date(),
        });

        // Refund wallet (amount + fee)
        const wallet = await manager.getRepository(Wallet).findOneBy({
          id: withdrawalRequest.wallet,
        });
      });

      // Refresh the withdrawal request to get updated data
      const updatedRequest = await this.withdrawalRequestRepository.findOne({
        where: { id: withdrawalRequestId },
      });

      return this.mapWithdrawalRequestToDto(updatedRequest!);
    } catch (error) {
      console.error('Withdrawal rejection processing failed:', error);
      throw new BadRequestException(
        'Failed to reject withdrawal. Please try again or contact support.',
      );
    }
  }

  private calculateWithdrawalFee(
    amount: number,
    feeType: WithdrawalFeeType,
    feeValue: number,
  ): number {
    if (feeType === WithdrawalFeeType.PERCENTAGE) {
      return (+amount * +feeValue) / 100;
    }
    return Number(feeValue);
  }

  private mapWithdrawalRequestToDto(
    request: WithdrawalRequest & {
      userInfo?: { fullName: string; email: string; username: string };
    },
  ): WithdrawalRequestDto {
    return {
      id: request.id,
      user: request.user,
      userInfo: request.userInfo
        ? {
            fullName: request.userInfo?.fullName,
            email: request.userInfo.email,
            username: request.userInfo.username,
          }
        : undefined,
      transaction: request.transaction,
      wallet: request.wallet,
      status: request.status,
      processedBy: request.processedBy,
      dateProcessed: request.dateProcessed,
      amount: request.amount,
      dateInitiated: request.dateInitiated,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      isAutoWithdrawn: request.isAutoWithdrawn,
    };
  }

  private async processAutoWithdrawal(
    withdrawalRequestId: string,
  ): Promise<void> {
    console.log(
      'processing auto withdrawal for withdrawal request',
      withdrawalRequestId,
    );
    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { id: withdrawalRequestId },
    });

    if (!withdrawalRequest) {
      return;
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: withdrawalRequest.transaction },
    });

    if (!transaction || !transaction.meta) {
      return;
    }

    try {
      const disbursementResult = await this.monnifyService.singleDisbursement({
        amount: +withdrawalRequest.amount,
        reference: transaction.reference,
        narration: `Withdrawal - ${transaction.reference}`,
        destinationBankCode: transaction.meta.bankCode,
        destinationAccountNumber: transaction.meta.accountNumber,
      });

      // Update transaction and withdrawal request status
      if (disbursementResult.status === 'SUCCESS') {
        await this.dataSource.transaction(async (manager) => {
          await manager.update(Transaction, transaction.id, {
            status: TransactionStatus.SUCCESSFUL,
            dateCompleted: new Date(),
          });

          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.APPROVED,
            dateProcessed: new Date(),
            isAutoWithdrawn: true,
          });
        });
      } else if (disbursementResult.status === 'FAILED') {
        // Handle failed disbursement
        await this.dataSource.transaction(async (manager) => {
          await manager.update(Transaction, transaction.id, {
            status: TransactionStatus.FAILED,
          });

          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.DECLINED,
            dateProcessed: new Date(),
            isAutoWithdrawn: false,
          });

          // Refund wallet
          const wallet = await manager.findOne(Wallet, {
            where: { id: withdrawalRequest.wallet },
          });

          if (wallet) {
            const totalAmount = +withdrawalRequest.amount + +transaction.fee;
          }
        });
      } else {
        console.log('auto withdrawal pending', disbursementResult);
        await this.dataSource.transaction(async (manager) => {
          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            isAutoWithdrawn: true,
          });
        });
      }
    } catch (error) {
      console.error('Auto withdrawal processing failed:', error);
      // Transaction remains pending, can be processed manually later
    }
  }

  private async processAutoWithdrawalAsyncMonnify(
    withdrawalRequestId: string,
  ): Promise<void> {
    console.log(
      'processing auto withdrawal for withdrawal request async monnify',
      withdrawalRequestId,
    );
    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { id: withdrawalRequestId },
    });

    if (!withdrawalRequest) {
      return;
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: withdrawalRequest.transaction },
    });

    if (!transaction || !transaction.meta) {
      return;
    }

    try {
      const disbursementResult = await this.monnifyService.singleDisbursement({
        amount: +withdrawalRequest.amount,
        reference: transaction.reference,
        narration: `Withdrawal - ${transaction.reference}`,
        destinationBankCode: transaction.meta.bankCode,
        destinationAccountNumber: transaction.meta.accountNumber,
      });

      // Update transaction and withdrawal request status
      if (
        disbursementResult.status === 'SUCCESS' ||
        disbursementResult.status === 'PENDING'
      ) {
        await this.dataSource.transaction(async (manager) => {
          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.PROCESSING,
            isAutoWithdrawn: true,
          });
        });
      } else if (disbursementResult.status === 'FAILED') {
        // Handle failed disbursement
        await this.dataSource.transaction(async (manager) => {
          await manager.update(Transaction, transaction.id, {
            status: TransactionStatus.FAILED,
          });

          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.DECLINED,
            dateProcessed: new Date(),
            isAutoWithdrawn: false,
          });

          // Refund wallet
          const wallet = await manager.findOne(Wallet, {
            where: { id: withdrawalRequest.wallet },
          });

          if (wallet) {
            const totalAmount = +withdrawalRequest.amount + +transaction.fee;
          }
        });

        throw new BadRequestException(
          'Withdrawal disbursement failed, please try again or contact support.',
        );
      }
    } catch (error) {
      console.error('Auto withdrawal processing failed:', error);
      // Transaction remains pending, can be processed manually later
      throw new BadRequestException(
        'Failed to process withdrawal. Please try again or contact support.',
      );
    }
  }

  private async processAutoWithdrawalAsyncPaystack(
    withdrawalRequestId: string,
  ): Promise<void> {
    console.log(
      'processing auto withdrawal for withdrawal request async paystack',
      withdrawalRequestId,
    );
    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { id: withdrawalRequestId },
    });

    if (!withdrawalRequest) {
      return;
    }

    const transaction = await this.transactionRepository.findOne({
      where: { id: withdrawalRequest.transaction },
    });

    if (!transaction || !transaction.meta) {
      return;
    }

    try {
      const disbursementResult = await this.paystackService.singleDisbursement({
        amount: +withdrawalRequest.amount,
        reference: transaction.reference,
        narration: `Withdrawal - ${transaction.reference}`,
        destinationBankCode: transaction.meta.bankCode,
        destinationAccountNumber: transaction.meta.accountNumber,
      });

      console.log('disbursement result', disbursementResult);

      // Update transaction and withdrawal request status
      if (
        disbursementResult.status === 'success' ||
        disbursementResult.status === 'pending' ||
        disbursementResult.status === 'processing'
      ) {
        await this.dataSource.transaction(async (manager) => {
          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.PROCESSING,
            isAutoWithdrawn: true,
          });
        });
      } else if (disbursementResult.status === 'failed') {
        // Handle failed disbursement
        await this.dataSource.transaction(async (manager) => {
          await manager.update(Transaction, transaction.id, {
            status: TransactionStatus.FAILED,
          });

          await manager.update(WithdrawalRequest, withdrawalRequest.id, {
            status: WithdrawalStatus.DECLINED,
            dateProcessed: new Date(),
            isAutoWithdrawn: false,
          });

          // Refund wallet
          const wallet = await manager.findOne(Wallet, {
            where: { id: withdrawalRequest.wallet },
          });

          if (wallet) {
            const totalAmount = +withdrawalRequest.amount + +transaction.fee;
          }
        });

        throw new BadRequestException(
          'Withdrawal disbursement failed, please try again or contact support.',
        );
      }
    } catch (error) {
      console.error('Auto withdrawal processing failed:', error);
      // Transaction remains pending, can be processed manually later
      throw new BadRequestException(
        'Failed to process withdrawal. Please try again or contact support.',
      );
    }
  }

  private mapToDto(transaction: Transaction): TransactionDto {
    return {
      id: transaction.id,
      user: transaction.user,
      amount: transaction.amount,
      fee: transaction.fee,
      wallet: transaction.wallet,
      status: transaction.status,
      type: transaction.type,
      currency: transaction.currency,
      reference: transaction.reference,
      wasRefunded: transaction.wasRefunded,
      wasReverted: transaction.wasReverted,
      dateCompleted: transaction.dateCompleted,
      dateInitiated: transaction.dateInitiated,
      dateRefunded: transaction.dateRefunded,
      dateReverted: transaction.dateReverted,
      meta: transaction.meta,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  /**Monnify webhook handlers */
  private async handleSuccessfulTransactionMonnify(
    eventData: MonnifySuccessfulTransactionEventData,
  ) {
    const user = await this.userRepository.findOne({
      where: { email: eventData.customer.email },
    });

    if (!user) {
      return;
    }

    const existingTransaction = await this.transactionRepository.findOne({
      where: {
        reference: eventData.paymentReference,
      },
    });

    if (existingTransaction?.status !== TransactionStatus.PENDING) {
      console.log('Transaction not pending');
      return;
    }

    const userWallet = await this.walletRepository.findOne({
      where: { user: user.id },
    });

    if (!userWallet) {
      return;
    }

    existingTransaction.status = TransactionStatus.SUCCESSFUL;
    existingTransaction.dateCompleted = new Date();
    await this.transactionRepository.save(existingTransaction);

    await this.cacheManager.set(user.id, {
      ...user,
    });

    return;
  }

  private async handleSuccessfulDisbursementMonnify(
    eventData: MonnifyDisbursementWebhookPayload,
  ) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference: eventData.reference },
    });

    if (!transaction) {
      return;
    }

    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { transaction: transaction.id },
    });

    if (!withdrawalRequest) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Transaction, transaction.id, {
        status: TransactionStatus.SUCCESSFUL,
        dateCompleted: new Date(),
      });

      await manager.update(WithdrawalRequest, withdrawalRequest.id, {
        status: WithdrawalStatus.APPROVED,
        dateProcessed: new Date(),
      });
    });
  }

  private async handleFailedDisbursementMonnify(
    eventData: MonnifyDisbursementWebhookPayload,
  ) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference: eventData.reference },
    });

    if (!transaction) {
      return;
    }

    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { transaction: transaction.id },
    });

    if (!withdrawalRequest) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Transaction, transaction.id, {
        status: TransactionStatus.FAILED,
      });

      await manager.update(WithdrawalRequest, withdrawalRequest.id, {
        status: WithdrawalStatus.DECLINED,
        dateProcessed: new Date(),
      });

      // Refund wallet
      const wallet = await manager.getRepository(Wallet).findOneBy({
        id: withdrawalRequest.wallet,
      });
    });
  }

  private async handleReversedDisbursementMonnify(
    eventData: MonnifyDisbursementWebhookPayload,
  ) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference: eventData.reference },
    });

    if (!transaction) {
      return;
    }

    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { transaction: transaction.id },
    });

    if (!withdrawalRequest) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Transaction, transaction.id, {
        status: TransactionStatus.FAILED,
        wasReverted: true,
        dateReverted: new Date(),
      });

      await manager.update(WithdrawalRequest, withdrawalRequest.id, {
        status: WithdrawalStatus.DECLINED,
        dateProcessed: new Date(),
      });

      // Refund wallet
      const wallet = await manager.getRepository(Wallet).findOneBy({
        id: withdrawalRequest.wallet,
      });
    });
  }

  /** Paystack webhook handlers */
  private async handleSuccessfulDisbursementPaystack(
    eventData: PaystackWebhookPayload,
  ) {
    const { data } = eventData;
    const transaction = await this.transactionRepository.findOne({
      where: { reference: data.reference },
    });

    if (!transaction) {
      return;
    }

    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { transaction: transaction.id },
    });

    if (!withdrawalRequest) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Transaction, transaction.id, {
        status: TransactionStatus.SUCCESSFUL,
        dateCompleted: new Date(),
      });

      await manager.update(WithdrawalRequest, withdrawalRequest.id, {
        status: WithdrawalStatus.APPROVED,
        dateProcessed: new Date(),
      });
    });
  }

  private async handleFailedDisbursementPaystack(
    eventData: PaystackWebhookPayload,
  ) {
    const transaction = await this.transactionRepository.findOne({
      where: { reference: eventData.data.reference },
    });

    if (!transaction) {
      return;
    }

    const withdrawalRequest = await this.withdrawalRequestRepository.findOne({
      where: { transaction: transaction.id },
    });

    if (!withdrawalRequest) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Transaction, transaction.id, {
        status: TransactionStatus.FAILED,
      });

      await manager.update(WithdrawalRequest, withdrawalRequest.id, {
        status: WithdrawalStatus.DECLINED,
        dateProcessed: new Date(),
      });

      // Refund wallet
      const wallet = await manager.getRepository(Wallet).findOneBy({
        id: withdrawalRequest.wallet,
      });
    });
  }

  async getTargetCurrency(walletId: string, currency: Currency) {
    let targetWallet = await this.walletBalanceRepository.findOne({
      where: { wallet: walletId, currency: currency }
    })

    if (!targetWallet) {
      targetWallet = await this.walletBalanceRepository.save({
        balance: 0,
        ledgerBalance: 0,
        wallet: walletId,
        currency
      })
    }

    return targetWallet;
  }

  async convertCurrency(
    userId: string,
    data: ConvertCurrencyDto,
  ): Promise<Transaction> {
    const wallet = await this.walletRepository.findOne({
      where: { user: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const rate = await this.exchangeRateService.getPairRate(data.baseCurrency, data.targetCurrency);
    if (!rate) throw new NotFoundException('There is an error processing your request. Please try again');
    const targetAmount = Number(data.amount) * Number(rate.conversion_rate);

    // Debit from base currency
    const baseWallet = await this.walletBalanceRepository.findOne({
      where: { wallet: wallet.id, currency: data.baseCurrency as Currency }
    })

    if (!baseWallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (targetAmount > baseWallet.balance) {
      throw new NotFoundException('Insufficient Balance');
    }

    // Get target currency
    const targetWallet = await this.getTargetCurrency(wallet.id, data.targetCurrency as Currency);

    if (!targetWallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Add fund  to target currency
    await this.walletBalanceRepository.update(
      { id: targetWallet.id },
      { balance: Number(targetWallet.balance) + targetAmount, ledgerBalance: Number(targetWallet.ledgerBalance) + targetAmount  }
    )

    // Debit fund from base currency
    await this.walletBalanceRepository.update(
      { id: baseWallet.id },
      { balance: Number(baseWallet.balance) - Number(data.amount), ledgerBalance: Number(baseWallet.ledgerBalance) - Number(data.amount) }
    )

    await this.transactionRepository.save({
      user: userId,
      amount: data.amount,
      reference: createReference(),
      type: TransactionType.DEBIT,
      currency: data.baseCurrency as Currency,
      fee: 0,
      wallet: wallet.id,
      status: TransactionStatus.SUCCESSFUL,
      dateInitiated: new Date(),
      description: TransactionDescription.FX_EXCHANGE,
    });

    const result = await this.transactionRepository.save({
      user: userId,
      amount: targetAmount,
      reference: createReference(),
      type: TransactionType.CREDIT,
      currency: data.targetCurrency as Currency,
      fee: 0,
      wallet: wallet.id,
      status: TransactionStatus.SUCCESSFUL,
      dateInitiated: new Date(),
      description: TransactionDescription.FX_EXCHANGE,
    });

    return result
  }

  async getFxRate(
    userId: string,
    data: FxRateDto,
  ): Promise<IExchangeRateResponse> {
    const rate = await this.exchangeRateService.getPairRate(data.baseCurrency, data.targetCurrency);
    if (!rate) throw new NotFoundException('There is an error processing your request. Please try again');
    
    return rate
  }
}
