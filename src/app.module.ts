import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getTypeOrmModule } from '@app/typeorm/orm-config.module';
import { CacheModule } from '@nestjs/cache-manager';
import { WinstonModule } from 'nest-winston';
import { UsersModule } from '@app/users/users.module';
import { AuthModule } from '@app/auth/auth.module';
import { CoreModule } from '@app/core/core.module';
import { TransactionsModule } from '@app/transactions/transactions.module';
import { format, transports } from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { LoggerMiddleware } from '../libs/core/src/middleware/logger.middleware';

@Module({
  imports: [
    WinstonModule.forRoot({
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        nestWinstonModuleUtilities.format.nestLike(),
      ),
      transports: [new transports.Console({ level: 'silly' })],
    }),
    getTypeOrmModule(),
    CacheModule.register({
      isGlobal: true,
      ttl: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
    }),
    AuthModule,
    CoreModule,
    TransactionsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
