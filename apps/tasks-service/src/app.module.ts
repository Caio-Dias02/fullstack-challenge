import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from './tasks/tasks.module';
import { TaskHistoryModule } from './task-history/task-history.module';
import { CommentsModule } from './comments/comments.module';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'tasks_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    EventsModule,
    TasksModule,
    TaskHistoryModule,
    CommentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
