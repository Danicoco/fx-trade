import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  MonnifyAccountVerificationResponse,
  MonnifyAuthResponse,
  MonnifyBank,
  MonnifyResponse,
  MonnifySingleDisbursementPayload,
  MonnifySingleDisbursementResponse,
  MonnifyTransactionResponse,
} from '../utils/monnify.interface';

@Injectable()
export class MonnifyService {
  private token: string = '';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly walletAccountNumber: string;

  constructor() {
    this.baseUrl = process.env.MONNIFY_BASEURL || 'https://sandbox.monnify.com';
    this.apiKey = process.env.MONNIFY_API_KEY || '';
    this.secretKey = process.env.MONNIFY_SECRET_KEY || '';
    this.walletAccountNumber = process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || '';
  }

  async getTransaction(
    reference: string,
  ): Promise<MonnifyTransactionResponse | null> {
    try {
      return (
        await this.makeRequest<MonnifyTransactionResponse>(
          `/api/v2/merchant/transactions/query?paymentReference=${reference}`,
          'GET',
        )
      ).responseBody;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.log(
        'error getting transaction from monnify',
        error.response?.data,
      );
      throw error;
    }
  }

  async getBanks(): Promise<MonnifyBank[]> {
    try {
      return (await this.makeRequest<MonnifyBank[]>(`/api/v1/banks`, 'GET'))
        .responseBody;
    } catch (error: any) {
      console.log('error getting banks from monnify', error.response?.data);
      return [];
    }
  }

  async singleDisbursement(
    payload: MonnifySingleDisbursementPayload,
  ): Promise<MonnifySingleDisbursementResponse> {
    try {
      const response =
        await this.makeRequest<MonnifySingleDisbursementResponse>(
          `/api/v2/disbursements/single`,
          'POST',
          {
            ...payload,
            currency: 'NGN',
            sourceAccountNumber: this.walletAccountNumber,
            async: true,
          },
        );
      console.log('single disbursement response', response.responseBody);
      return response.responseBody;
    } catch (error: any) {
      console.log(
        'error triggering single disbursement from monnify',
        error.response?.data,
      );
      throw error;
    }
  }

  async verifyAccount(payload: {
    bankCode: string;
    accountNumber: string;
  }): Promise<MonnifyAccountVerificationResponse> {
    try {
      return (
        await this.makeRequest<MonnifyAccountVerificationResponse>(
          `/api/v1/disbursements/account/validate?accountNumber=${payload.accountNumber}&bankCode=${payload.bankCode}`,
          'GET',
        )
      ).responseBody;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          accountName: null,
          accountNumber: null,
          bankCode: null,
        };
      }
      console.log('error verifying account from monnify', error.response?.data);
      throw error;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: any,
  ): Promise<MonnifyResponse<T>> {
    const cleanedEndpoint = endpoint[0] !== '/' ? `/${endpoint}` : endpoint;
    const url = `${this.baseUrl}${cleanedEndpoint}`;

    if (!this.token) {
      await this.getToken();
    }

    try {
      const response = await axios.request<MonnifyResponse<T>>({
        url,
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        data,
      });

      if (response.data?.requestSuccessful) {
        return response.data;
      } else {
        throw new Error(response.data.responseMessage);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.getToken();
        return this.makeRequest(endpoint, method, data);
      }
      throw error;
    }
  }

  private async getToken(): Promise<string> {
    try {
      const response = await axios.post<MonnifyResponse<MonnifyAuthResponse>>(
        `${this.baseUrl}/api/v1/auth/login`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(
              `${this.apiKey}:${this.secretKey}`,
            ).toString('base64')}`,
          },
        },
      );

      if (response.data?.requestSuccessful) {
        this.token = response.data.responseBody.accessToken;
        return response.data.responseBody.accessToken;
      } else {
        throw new Error(response.data.responseMessage);
      }
    } catch (error: any) {
      console.log('error', error.response?.data);
      throw error;
    }
  }
}
