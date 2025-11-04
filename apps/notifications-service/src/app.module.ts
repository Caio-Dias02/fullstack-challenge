import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsGateway } from './notifications/notifications.gateway';
import { EventsHandler } from './events/events.handler';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [NotificationsGateway, EventsHandler],
})
export class AppModule {}
