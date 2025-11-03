import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHistory } from './entities/task-history.entity';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class TaskHistoryService {
  constructor(
    @InjectRepository(TaskHistory)
    private readonly historyRepo: Repository<TaskHistory>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async registerChange(taskId: string, changedBy: string, field: string, oldValue: string, newValue: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return;

    const history = this.historyRepo.create({
      task,
      changedBy,
      field,
      oldValue,
      newValue,
    });

    await this.historyRepo.save(history);
  }
}
