import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.use(cookieParser());

    app.enableCors({
      origin: ['http://localhost:3001', 'http://localhost:5173'], // Frontend + Vite dev
      credentials: true,
    });

    // Swagger config
    const config = new DocumentBuilder()
      .setTitle('Fullstack Challenge API')
      .setDescription('Task Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(process.env.PORT || 3000);
    console.log(`🚀 API Gateway running on http://localhost:${process.env.PORT || 3000}`);
    console.log(`📚 Swagger docs at http://localhost:${process.env.PORT || 3000}/api/docs`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('❌ Failed to bootstrap API Gateway:', error.message);
    process.exit(1);
  }
}

bootstrap().catch((err: unknown) => {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('❌ Uncaught bootstrap error:', error.message);
  process.exit(1);
});
