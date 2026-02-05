import { Column, Entity } from 'typeorm';
import { Base } from '../utils/base.entity';
import { WithdrawalStatus } from '../utils/enums';

@Entity({ name: 'withdrawal_requests' })
export class WithdrawalRequest extends Base {
  @Column({ type: 'uuid' })
  user: string;

  @Column({ type: 'uuid' })
  transaction: string;

  @Column({ type: 'uuid' })
  wallet: string;

  @Column({ type: 'boolean', default: false })
  isAutoWithdrawn: boolean;

  @Column({
    type: 'varchar',
    nullable: false,
    default: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @Column({ type: 'uuid', nullable: true })
  processedBy: string;

  @Column({ type: 'varchar', nullable: true })
  dateProcessed: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', nullable: false })
  dateInitiated: Date;
}
