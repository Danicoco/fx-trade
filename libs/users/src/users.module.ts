import { Module } from '@nestjs/common';
import { UserService } from './services/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Wallet, WalletBalance } from '@app/typeorm/entities';
import { UserController } from './controllers/user.controller';
import { GmailService } from '@app/core/services/gmail.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Wallet, WalletBalance])],
  providers: [UserService, GmailService],
  exports: [UserService],
  controllers: [UserController],
})
export class UsersModule {}
