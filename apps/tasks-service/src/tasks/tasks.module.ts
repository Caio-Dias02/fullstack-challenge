import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TaskHistoryModule } from '../task-history/task-history.module';
import { TasksMessageHandler } from './tasks.message-handler';
import { EventsModule } from '../events/events.module';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    forwardRef(() => TaskHistoryModule),
    EventsModule,
    HttpModule,
  ],
  controllers: [TasksController, TasksMessageHandler],
  providers: [TasksService, UsersService],
  exports: [TasksService, UsersService],
})
export class TasksModule {}

