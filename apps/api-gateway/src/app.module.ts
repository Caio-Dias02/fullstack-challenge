import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksController } from './tasks/tasks.controller';
import { AuthController } from './auth/auth.controller';

@Module({
  imports: [
    HttpModule,
    ClientsModule.register([
      {
        name: 'TASKS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: process.env.RABBITMQ_TASKS_QUEUE || 'tasks_queue',
          queueOptions: { durable: false },
        },
      },
    ]),
  ],
  controllers: [AppController, TasksController, AuthController],
  providers: [AppService],
})
export class AppModule {}
