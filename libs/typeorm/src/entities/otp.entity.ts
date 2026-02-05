import { Column, Entity } from 'typeorm';
import { Base } from '../utils/base.entity';

@Entity({ name: 'otps' })
export class OTP extends Base {
  @Column({ type: 'varchar' })
  otp: string;

  @Column({ type: 'uuid' })
  user: string;
}
