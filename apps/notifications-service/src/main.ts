import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for HTTP and WebSocket
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Use Socket.IO adapter with CORS
  const ioAdapter = new IoAdapter(app);
  ioAdapter.connectionsCount = 0;
  app.useWebSocketAdapter(ioAdapter);

  const port = process.env.PORT || 3003;

  try {
    await app.listen(port);
    console.log(`✅ HTTP server listening on port ${port}`);
    console.log(`🚀 Notifications service running on http://localhost:${port}`);
    console.log(`📡 WebSocket available at ws://localhost:${port}`);
    console.log(`🔐 CORS enabled for localhost:5173 and localhost:3000`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
