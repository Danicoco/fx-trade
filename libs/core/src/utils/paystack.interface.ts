export interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface PaystackTransactionResponse {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string | null;
  metadata: Record<string, any> | null;
  log: any | null;
  fees: number | null;
  fees_split: any | null;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
    receiver_bank: string | null;
    receiver_bank_account_number: string | null;
  } | null;
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: Record<string, any> | null;
    risk_action: string;
    international_format_phone: string | null;
  };
  plan: any | null;
  split: any | null;
  order_id: number | null;
  paidAt: string | null;
  createdAt: string;
  requested_amount: number;
  pos_transaction_data: any | null;
  source: any | null;
  fees_breakdown: any | null;
}

export interface PaystackSingleDisbursementPayload {
  amount: number;
  reference: string;
  narration: string;
  destinationBankCode: string;
  destinationAccountNumber: string;
  recipientName?: string;
}

export interface PaystackTransferRecipient {
  type: string;
  name: string;
  account_number: string;
  bank_code: string;
  currency: string;
}

export interface PaystackTransferRecipientResponse {
  active: boolean;
  createdAt: string;
  currency: string;
  domain: string;
  id: number;
  integration: number;
  name: string;
  recipient_code: string;
  type: string;
  updatedAt: string;
  is_deleted: boolean;
  details: {
    authorization_code: string | null;
    account_number: string;
    account_name: string | null;
    bank_code: string;
    bank_name: string;
  };
}

export interface PaystackSingleDisbursementResponse {
  amount: number;
  currency: string;
  domain: string;
  failures: any | null;
  id: number;
  integration: {
    id: number;
    is_live: boolean;
    business_name: string;
  };
  reason: string;
  reference: string;
  source: string;
  source_details: any | null;
  status: 'success' | 'failed' | 'pending' | 'reversed' | 'processing';
  titan_code: string | null;
  transfer_code: string;
  transferred_at: string | null;
  recipient: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string | null;
      bank_code: string;
      bank_name: string;
    };
  };
  session: {
    provider: string | null;
    id: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface PaystackAccountVerificationResponse {
  account_number: string | null;
  account_name: string | null;
  bank_id: number | null;
}

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string | null;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface InitializeTransaction {
  email: string;
  amount: number;
}

export interface InitializeTransactionResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackWebhookPayload {
  event:
    | 'charge.success'
    | 'charge.failed'
    | 'charge.reversed'
    | 'transfer.success'
    | 'transfer.failed'
    | 'transfer.reversed';
  data: {
    amount: number;
    createdAt: string;
    currency: string;
    domain: string;
    failures: any | null;
    id: number;
    integration: {
      id: number;
      is_live: boolean;
      business_name: string;
      logo_path: string;
    };
    reason: string;
    reference: string;
    source: string;
    source_details: any | null;
    status: 'success';
    titan_code: string | null;
    transfer_code: string;
    transferred_at: string | null;
    updatedAt: string;
    recipient: {
      active: boolean;
      createdAt: string;
      currency: string;
      description: string;
      domain: string;
      email: string | null;
      id: number;
      integration: number;
      metadata: any | null;
      name: string;
      recipient_code: string;
      type: string;
      updatedAt: string;
      is_deleted: boolean;
      details: {
        authorization_code: string | null;
        account_number: string;
        account_name: string | null;
        bank_code: string;
        bank_name: string;
      };
    };
    session: {
      provider: string | null;
      id: string | null;
    };
    fee_charged: number;
    gateway_response: string | null;
  };
}
