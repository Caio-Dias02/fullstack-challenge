import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskHistoryService } from './task-history.service';
import { TaskHistory } from './entities/task-history.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskHistory, Task])],
  providers: [TaskHistoryService],
  exports: [TaskHistoryService],
})
export class TaskHistoryModule {}
