import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { OTP, User, Wallet, WalletBalance } from '@app/typeorm/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './services/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt.guard';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { GmailService } from '@app/core/services/gmail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OTP, Wallet, WalletBalance]),
    JwtModule.register({
      secret: process.env.SECRET || 'secret',
      signOptions: { expiresIn: '6h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GmailService,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtGuard,
  ],
  exports: [AuthService, JwtAuthGuard, OptionalJwtGuard],
})
export class AuthModule {}
