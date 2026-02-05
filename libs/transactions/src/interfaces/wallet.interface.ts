import { Currency } from '@app/typeorm/utils/enums';

export interface ILoadOrUnloadWallet {
  userId: string;
  amount: number;
  type: 'load' | 'unload';
  meta: Record<string, any>;
  currency: Currency;
  reference?: string;
  fee?: number;
}
