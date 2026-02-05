import { Module } from '@nestjs/common';
import { MonnifyService } from './services/monnify.service';
import { PaystackService } from './services/paystack.service';

@Module({
  providers: [MonnifyService, PaystackService],
  exports: [MonnifyService, PaystackService],
})
export class CoreModule {}
