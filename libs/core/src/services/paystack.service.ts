import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  InitializeTransaction,
  InitializeTransactionResponse,
  PaystackAccountVerificationResponse,
  PaystackBank,
  PaystackResponse,
  PaystackSingleDisbursementPayload,
  PaystackSingleDisbursementResponse,
  PaystackTransactionResponse,
  PaystackTransferRecipient,
  PaystackTransferRecipientResponse,
} from '../utils/paystack.interface';

@Injectable()
export class PaystackService {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = process.env.PAYSTACK_BASEURL || 'https://api.paystack.co';
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
  }

  async getTransaction(
    reference: string,
  ): Promise<PaystackTransactionResponse | null> {
    try {
      const response = await this.makeRequest<PaystackTransactionResponse>(
        `/transaction/verify/${reference}`,
        'GET',
      );
      if (response.data) {
        return {
          ...response.data,
          amount: response.data.amount / 100,
        };
      } else {
        return null;
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.log(
        'error getting transaction from paystack',
        error.response?.data,
      );
      throw error;
    }
  }

  async getBanks(): Promise<PaystackBank[]> {
    try {
      const response = await this.makeRequest<{ data: PaystackBank[] }>(
        `/bank?country=nigeria`,
        'GET',
      );
      return response.data.data || [];
    } catch (error: any) {
      console.log('error getting banks from paystack', error.response?.data);
      return [];
    }
  }

  async singleDisbursement(
    payload: PaystackSingleDisbursementPayload,
  ): Promise<PaystackSingleDisbursementResponse> {
    try {
      // First, create or get transfer recipient
      const recipient = await this.createTransferRecipient({
        type: 'nuban',
        name: payload.recipientName || 'Recipient',
        account_number: payload.destinationAccountNumber,
        bank_code: payload.destinationBankCode,
        currency: 'NGN',
      });

      // Then initiate the transfer
      const response =
        await this.makeRequest<PaystackSingleDisbursementResponse>(
          `/transfer`,
          'POST',
          {
            source: 'balance',
            amount: payload.amount * 100, // Paystack amounts are in kobo (multiply by 100)
            recipient: recipient.recipient_code,
            reason: payload.narration,
            reference: payload.reference,
          },
        );

      console.log('single disbursement response', response.data);
      return response.data;
    } catch (error: any) {
      console.log(
        'error triggering single disbursement from paystack',
        error.response?.data,
      );
      throw error;
    }
  }

  async verifyAccount(payload: {
    bankCode: string;
    accountNumber: string;
  }): Promise<PaystackAccountVerificationResponse> {
    try {
      const response =
        await this.makeRequest<PaystackAccountVerificationResponse>(
          `/bank/resolve?account_number=${payload.accountNumber}&bank_code=${payload.bankCode}`,
          'GET',
        );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          account_name: null,
          account_number: null,
          bank_id: null,
        };
      }
      console.log(
        'error verifying account from paystack',
        error.response?.data,
      );
      throw error;
    }
  }

  async initializeTransaction(
    payload: InitializeTransaction,
  ): Promise<InitializeTransactionResponse> {
    try {
      const response = await this.makeRequest<InitializeTransactionResponse>(
        `/transaction/initialize`,
        'POST',
        {
          email: payload.email,
          amount: payload.amount * 100,
        },
      );
      return response.data;
    } catch (error: any) {
      console.log(
        'error initializing transaction from paystack',
        error.response?.data,
      );
      throw error;
    }
  }

  private async createTransferRecipient(
    payload: PaystackTransferRecipient,
  ): Promise<PaystackTransferRecipientResponse> {
    try {
      const response =
        await this.makeRequest<PaystackTransferRecipientResponse>(
          `/transferrecipient`,
          'POST',
          payload,
        );
      return response.data;
    } catch (error: any) {
      // If recipient already exists, try to get it
      if (error.response?.status === 400) {
        // Paystack might return existing recipient in error, or we need to handle this differently
        console.log('recipient might already exist', error.response?.data);
        throw error;
      }
      throw error;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: any,
  ): Promise<PaystackResponse<T>> {
    const cleanedEndpoint = endpoint[0] !== '/' ? `/${endpoint}` : endpoint;
    const url = `${this.baseUrl}${cleanedEndpoint}`;

    try {
      const response = await axios.request<PaystackResponse<T>>({
        url,
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        data,
      });

      if (response.data?.status) {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Request failed');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Paystack secret key');
      }
      throw error;
    }
  }
}
