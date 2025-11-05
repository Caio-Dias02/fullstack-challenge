import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from '@fullstack-challenge/types';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    const { dto, userId } = body;
    return this.tasksService.update(id, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() body: any) {
    const { userId } = body;
    return this.tasksService.remove(id, userId);
  }

  // Message patterns pra API Gateway (RabbitMQ)
  @MessagePattern({ cmd: 'create_task' })
  createTask(@Payload() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @MessagePattern({ cmd: 'get_tasks' })
  getTasks() {
    return this.tasksService.findAll();
  }

  @MessagePattern({ cmd: 'get_task' })
  getTask(@Payload() data: { id: string }) {
    return this.tasksService.findOne(data.id);
  }

  @MessagePattern({ cmd: 'update_task' })
  updateTask(@Payload() data: { id: string; dto: UpdateTaskDto; userId: string }) {
    return this.tasksService.update(data.id, data.dto, data.userId);
  }

  @MessagePattern({ cmd: 'delete_task' })
  async deleteTask(@Payload() data: { id: string; userId: string }) {
    return await this.tasksService.remove(data.id, data.userId);
  }
}
