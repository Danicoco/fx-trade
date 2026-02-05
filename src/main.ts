import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as path from 'path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import * as dotenv from 'dotenv';

const dotenv_path = path.resolve(process.cwd(), '.env');
dotenv.config({ path: dotenv_path, override: true });

async function bootstrap() {
  const appName = 'app-service';
  const appDescription = 'App Service';
  const logger = new Logger('main.app-service.createApp');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.enableCors({
    credentials: true,
    origin: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors();

  const options = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('FXTrade App Service API')
    .setVersion('1.0')
    .addTag(appDescription)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'Bearer', // This name here is important for matching up with @ApiBearerAuth('Bearer') in your controller!
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  useContainer(app.select(AppModule), {
    fallbackOnErrors: true,
  });

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  logger.log(`${appName} is running on: http://localhost:${port}`);
}
bootstrap();
