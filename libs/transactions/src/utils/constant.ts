import { WithdrawalFeeType } from '@app/typeorm/utils/enums';

export const DEFAULT_WITHDRAWAL_CONFIG = {
  minimumWithdrawal: 1000,
  maximumWithdrawal: 1000000,
  maximumAutoWithdrawalableAmount: 50000,
  withdrawalFeeType: WithdrawalFeeType.FIXED,
  withdrawalFeeValue: 0,
};
