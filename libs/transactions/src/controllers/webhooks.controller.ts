import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  MonnifyWebhookPayloadDto,
  PaystackWebhookPayloadDto,
} from '../dto/transactions.dto';
import { TransactionsService } from '../services/transactions.service';
import { GenericStatus } from '@app/core/dto/generic-status.dto';
import { MonnifyGuard } from '../guards/monnify.guard';
import { PaystackGuard } from '../guards/paystack.guard';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('monnify')
  @UseGuards(MonnifyGuard)
  async monnifyWebhook(@Body() body: MonnifyWebhookPayloadDto) {
    return new GenericStatus({
      data: await this.transactionsService.monnifyWebhook(body),
      description: 'Webhook received successfully',
    });
  }

  @Post('paystack')
  @UseGuards(PaystackGuard)
  async paystackWebhook(@Body() body: PaystackWebhookPayloadDto) {
    return new GenericStatus({
      data: await this.transactionsService.paystackWebhook(body),
      description: 'Webhook received successfully',
    });
  }
}
