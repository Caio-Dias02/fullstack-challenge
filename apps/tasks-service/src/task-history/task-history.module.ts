import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TaskHistory } from './entities/task-history.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskHistoryService } from './task-history.service';
import { TaskHistoryController } from './task-history.controller';
import { UsersService } from '../tasks/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskHistory, Task]), HttpModule],
  controllers: [TaskHistoryController],
  providers: [TaskHistoryService, UsersService],
  exports: [TaskHistoryService],
})
export class TaskHistoryModule {}
