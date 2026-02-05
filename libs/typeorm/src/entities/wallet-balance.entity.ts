import { Column, Entity } from 'typeorm';
import { Base } from '../utils/base.entity';
import { Currency } from '../utils/enums';

@Entity({ name: 'wallet-balances' })
export class WalletBalance extends Base {
  @Column({ type: 'uuid' })
  wallet: string;

  @Column({ type: 'varchar', nullable: false, default: Currency.NGN })
  currency: Currency;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  ledgerBalance: number;
}
