import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from '@fullstack-challenge/types';

@Controller()
export class TasksMessageHandler {
  constructor(private readonly tasksService: TasksService) {}

  @MessagePattern({ cmd: 'get_tasks' })
  async findAll() {
    return this.tasksService.findAll();
  }

  @MessagePattern({ cmd: 'get_task_by_id' })
  async findOne({ id }: { id: string }) {
    return this.tasksService.findOne(id);
  }

  @MessagePattern({ cmd: 'create_task' })
  async create(dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @MessagePattern({ cmd: 'update_task' })
  async update(data: { id: string; dto: UpdateTaskDto; userId?: string }) {
    return this.tasksService.update(data.id, data.dto, data.userId);
  }

  @MessagePattern({ cmd: 'delete_task' })
  async remove({ id }: { id: string }) {
    return this.tasksService.remove(id);
  }
}
