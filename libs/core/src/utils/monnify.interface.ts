export interface MonnifyResponse<T> {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode: string;
  responseBody: T;
}

export interface MonnifyAuthResponse {
  accessToken: string;
  expiresIn: number;
}

export type MonnifyPaymentStatus = 'PAID' | 'UNPAID' | 'PARTIALLY_PAID';

export interface MonnifyTransactionResponse {
  transactionReference: string;
  paymentReference: string;
  amountPaid: string;
  totalPayable: string;
  settlementAmount: string;
  paidOn: string;
  paymentStatus: MonnifyPaymentStatus;
  paymentDescription: string;
  currency: string;
  paymentMethod: string;
  product: {
    type: string;
    reference: string;
  };
  cardDetails?: {
    cardType: string;
    last4: string;
    expMonth: string;
    expYear: string;
    bin: string;
    bankCode: string;
    bankName: string;
    reusable: boolean;
    countryCode: string;
    cardToken: string;
    supportsTokenization: boolean;
    maskedPan: string;
  };
  accountDetails: any;
  accountPayments: any[];
  customer: {
    email: string;
    name: string;
  };
  metaData: any;
}

export interface MonnifyBank {
  name: string;
  code: string;
  ussdTemplate: string | null;
  baseUssdCode: string | null;
  bankId: string | null;
  nipBankCode: string;
}

export interface MonnifySingleDisbursementPayload {
  amount: number;
  reference: string;
  narration: string;
  destinationBankCode: string;
  destinationAccountNumber: string;
}

export interface MonnifySingleDisbursementResponse {
  amount: number;
  reference: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  dateCreated: string;
  totalFee: number;
  destinationBankName: string;
  destinationAccountNumber: string;
  destinationBankCode: string;
  comment: string;
}

export interface MonnifyAccountVerificationResponse {
  accountName: string | null;
  accountNumber: string | null;
  bankCode: string | null;
}

export interface MonnifyWebhookPayload {
  eventType:
    | 'SUCCESSFUL_TRANSACTION'
    | 'SUCCESSFUL_DISBURSEMENT'
    | 'FAILED_DISBURSEMENT'
    | 'REVERSED_DISBURSEMENT';
  eventData: any;
}

export interface MonnifySuccessfulTransactionEventData {
  transactionReference: string;
  paymentReference: string;
  paidOn: string;
  paymentDescription: string;
  metaData: Record<string, any>;
  paymentSourceInformation: {
    bankCode: string;
    amountPaid: number;
    accountName: string;
    sessionId: string;
    accountNumber: string;
  }[];
  destinationAccountInformation: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
  };
  amountPaid: number;
  totalPayable: number;
  cardDetails: Record<string, any>;
  paymentMethod: string;
  currency: string;
  settlementAmount: number;
  paymentStatus: MonnifyPaymentStatus;
  customer: {
    name: string;
    email: string;
  };
}

export interface MonnifyDisbursementWebhookPayload {
  amount: number;
  transactionReference: string;
  fee: number;
  transactionDescription: string;
  destinationAccountNumber: string;
  sessionId: string;
  createdOn: string;
  destinationAccountName: string;
  reference: string;
  destinationBankCode: string;
  completedOn: string;
  narration: string;
  currency: string;
  destinationBankName: string;
  status: 'SUCCESS' | 'FAILED' | 'REVERSED';
}
