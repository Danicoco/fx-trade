import { Column, Entity } from 'typeorm';
import { Base } from '../utils/base.entity';

@Entity({ name: 'logs' })
export class Log extends Base {
  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'jsonb' })
  wallet: {
    balance: number;
    user: string;
    lastTransactionId?: string;
    promoBalance: number;
  };
}
