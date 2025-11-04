import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TaskHistoryModule } from '../task-history/task-history.module';
import { TasksMessageHandler } from './tasks.message-handler';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    TaskHistoryModule,
    EventsModule,
  ],
  controllers: [TasksController, TasksMessageHandler],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

