import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CreateTaskDto, UpdateTaskDto } from '@fullstack-challenge/types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController implements OnModuleInit {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
        queue: process.env.RABBITMQ_TASKS_QUEUE || 'task_commands',
        queueOptions: { durable: true },
      },
    });
  }

  async onModuleInit() {
    await this.client.connect();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all tasks for authenticated user' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Req() req: any) {
    const userId = req.user.sub;
    return await this.client.send({ cmd: 'get_tasks' }, { userId }).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a single task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string) {
    return await this.client.send({ cmd: 'get_task' }, { id }).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateTaskDto, @Req() req: any) {
    dto.creatorId = req.user.sub;
    return await this.client.send({ cmd: 'create_task' }, dto).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not authorized to update' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: any) {
    const userId = req.user.sub;
    return await this.client.send({ cmd: 'update_task' }, { id, dto, userId }).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (creator only)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - only creator can delete' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub;
    return await this.client.send({ cmd: 'delete_task' }, { id, userId }).toPromise();
  }
}
