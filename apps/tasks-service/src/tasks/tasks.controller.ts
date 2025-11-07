import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from '@fullstack-challenge/types';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    const task = await this.tasksService.create(dto);
    return await this.tasksService.enrichTaskWithAssigneeData(task);
  }

  @Get()
  async findAll() {
    const tasks = await this.tasksService.findAll();
    return await this.tasksService.enrichTasks(tasks);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await this.tasksService.findOne(id);
    return await this.tasksService.enrichTaskWithAssigneeData(task);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const { dto, userId } = body;
    const task = await this.tasksService.update(id, dto, userId);
    return await this.tasksService.enrichTaskWithAssigneeData(task);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() body: any) {
    const { userId } = body;
    return this.tasksService.remove(id, userId);
  }

  // Message patterns pra API Gateway (RabbitMQ)
  @MessagePattern({ cmd: 'create_task' })
  async createTask(@Payload() dto: CreateTaskDto) {
    const task = await this.tasksService.create(dto);
    return await this.tasksService.enrichTaskWithAssigneeData(task);
  }

  @MessagePattern({ cmd: 'get_tasks' })
  async getTasks(@Payload() data: { userId: string }) {
    const tasks = await this.tasksService.findAll(data.userId);
    return await this.tasksService.enrichTasks(tasks);
  }

  @MessagePattern({ cmd: 'get_task' })
  async getTask(@Payload() data: { id: string }) {
    const task = await this.tasksService.findOne(data.id);
    return await this.tasksService.enrichTaskWithAssigneeData(task);
  }

  @MessagePattern({ cmd: 'update_task' })
  async updateTask(@Payload() data: { id: string; dto: UpdateTaskDto; userId: string }) {
    const task = await this.tasksService.update(data.id, data.dto, data.userId);
    return await this.tasksService.enrichTaskWithAssigneeData(task);
  }

  @MessagePattern({ cmd: 'delete_task' })
  async deleteTask(@Payload() data: { id: string; userId: string }) {
    try {
      const result = await this.tasksService.remove(data.id, data.userId);
      console.log('✅ Delete task successful:', data.id);
      return result;
    } catch (error) {
      console.error('❌ Delete task failed:', error);
      throw error;
    }
  }
}
