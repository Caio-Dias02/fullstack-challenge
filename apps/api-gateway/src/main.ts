import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:5173', 'http://web:5173'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    })
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Fullstack Challenge API')
    .setDescription('Task Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get<ConfigService>(ConfigService);
  const PORT = configService.get('PORT', { infer: true }) || 3000;

  await app.listen(PORT);
  console.log(`🚀 API Gateway listening on port ${PORT}`);
}

bootstrap().catch((err: unknown) => {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('❌ Bootstrap error:', error.message);
  process.exit(1);
});
