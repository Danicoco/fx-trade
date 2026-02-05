import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { IExchangeRateResponse } from '../utils/exchange-rate.interface';

@Injectable()
export class ExchangeRateService {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor() {
    this.baseUrl = 'https://v6.exchangerate-api.com';
    this.secretKey = process.env.EXCHANGE_RATE_KEY || '';
  }

  async getPairRate(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<IExchangeRateResponse | null> {
    try {
      const response = await this.makeRequest(
        `/v6/${this.secretKey}pair/${baseCurrency}/${targetCurrency}`,
        'GET',
      );
      return response || null
    } catch (error: any) {
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST',
    data?: any,
  ) {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await axios.request({
      url,
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      data,
    });

    if (response.data?.result === 'success') {
      return response.data;
    } else {
      throw new Error(response.data.message || 'Request failed');
    }
  }
}
