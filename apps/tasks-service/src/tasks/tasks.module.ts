import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TaskHistoryModule } from '../task-history/task-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    TaskHistoryModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

