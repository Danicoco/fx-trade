import { Column, Entity } from 'typeorm';
import { Base } from '../utils/base.entity';
import {
  Currency,
  PaymentProvider,
  TransactionDescription,
  TransactionStatus,
  TransactionType,
} from '../utils/enums';

@Entity({ name: 'transactions' })
export class Transaction extends Base {
  @Column({ type: 'uuid' })
  user: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'uuid' })
  wallet: string;

  @Column({
    type: 'varchar',
    nullable: false,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar', nullable: false, default: TransactionType.DEBIT })
  type: TransactionType;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  description: TransactionDescription;

  @Column({ type: 'varchar', nullable: false, default: Currency.NGN })
  currency: Currency;

  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'boolean', default: false })
  wasRefunded: boolean;

  @Column({ type: 'boolean', default: false })
  wasReverted: boolean;

  @Column({ type: 'date', nullable: true })
  dateCompleted: Date;

  @Column({ type: 'date' })
  dateInitiated: Date;

  @Column({ type: 'date', nullable: true })
  dateRefunded: Date;

  @Column({ type: 'date', nullable: true })
  dateReverted: Date;

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, any>;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  provider: PaymentProvider;
}
