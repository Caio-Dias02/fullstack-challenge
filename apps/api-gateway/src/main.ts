import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:3001', // ou a URL do front
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 API Gateway running on http://localhost:${process.env.PORT || 3000}`);
}
bootstrap();
