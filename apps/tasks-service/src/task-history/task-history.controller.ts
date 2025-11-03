import { Controller, Get, Param } from '@nestjs/common';
import { TaskHistoryService } from './task-history.service';

@Controller('tasks/:taskId/history')
export class TaskHistoryController {
  constructor(private readonly historyService: TaskHistoryService) {}

  @Get()
  findByTask(@Param('taskId') taskId: string) {
    return this.historyService.findByTask(taskId);
  }
}
