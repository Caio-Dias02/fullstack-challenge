import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskHistory } from './entities/task-history.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskHistoryService } from './task-history.service';
import { TaskHistoryController } from './task-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskHistory, Task])],
  controllers: [TaskHistoryController],
  providers: [TaskHistoryService],
  exports: [TaskHistoryService],
})
export class TaskHistoryModule {}
