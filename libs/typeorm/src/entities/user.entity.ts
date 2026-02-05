import { Column, Entity } from 'typeorm';
import { Base } from '../utils/base.entity';
import { UserRole } from '../utils/enums';

@Entity({ name: 'users' })
export class User extends Base {
  @Column({ type: 'varchar', nullable: false, default: '' })
  firstName: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  lastName: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  email: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  phoneNumber: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'uuid', nullable: true })
  referredBy: string;

  @Column({ type: 'varchar', nullable: false, default: UserRole.USER })
  role: UserRole;
}
