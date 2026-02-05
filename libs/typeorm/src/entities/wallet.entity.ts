import { Column, Entity } from 'typeorm';
import { Base } from '../utils/base.entity';
import { WalletStatus } from '../utils/enums';

@Entity({ name: 'wallets' })
export class Wallet extends Base {
  @Column({ type: 'uuid' })
  user: string;

  @Column({ type: 'varchar', nullable: false, default: WalletStatus.ACTIVE })
  status: WalletStatus;
}
