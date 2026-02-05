import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '@app/typeorm/entities/transaction.entity';
import { User } from '@app/typeorm/entities/user.entity';
import { Wallet } from '@app/typeorm/entities/wallet.entity';
import { CoreModule } from '@app/core/core.module';
import { TransactionsService } from './services/transactions.service';
import { TransactionsController } from './controllers/transactions.controller';
import { MonnifyService } from '@app/core';
import { MonnifyGuard } from './guards/monnify.guard';
import { WebhooksController } from './controllers/webhooks.controller';
import { WalletBalance, WithdrawalRequest } from '@app/typeorm/entities';
import { WalletService } from './services/wallet.service';
import { ExchangeRateService } from '@app/core/services/exchange-rate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      User,
      Wallet,
      WithdrawalRequest,
      WalletBalance,
    ]),
    CoreModule,
  ],
  controllers: [TransactionsController, WebhooksController],
  providers: [
    TransactionsService,
    WalletService,
    MonnifyService,
    MonnifyGuard,
    ExchangeRateService,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
