import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para o front (ou API Gateway)
  app.enableCors({
    origin: 'http://localhost:3000', // ou o endereço do gateway
    credentials: true,
  });

  await app.listen(process.env.PORT || 3002);
  console.log(`🚀 Tasks service running on http://localhost:${process.env.PORT || 3002}`);
}
bootstrap();
