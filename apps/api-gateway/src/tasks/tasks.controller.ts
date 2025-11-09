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
    try {
      await this.client.connect();
      console.log('✅ TasksController: RabbitMQ connected');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('⚠️ TasksController: Failed to connect to RabbitMQ -', error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'List user tasks',
    description: 'Retrieve all tasks created by or assigned to the authenticated user. Includes enriched user data (creator and assignees).'
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks list retrieved',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          creatorId: { type: 'string', format: 'uuid' },
          assignees: { type: 'array', items: { type: 'string', format: 'uuid' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async findAll(@Req() req: any) {
    const userId = req.user.sub;
    return await this.client.send({ cmd: 'get_tasks' }, { userId }).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get task details', description: 'Retrieve a specific task with full details including creator and assignees information' })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        creatorId: { type: 'string', format: 'uuid' },
        assignees: { type: 'array', items: { type: 'string', format: 'uuid' } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Task not found or user has no access' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async findOne(@Param('id') id: string) {
    return await this.client.send({ cmd: 'get_task' }, { id }).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Create new task',
    description: 'Create a new task. Title is required. Creator is automatically set to authenticated user. If assignees not specified, task is assigned to creator.'
  })
  @ApiBody({
    type: CreateTaskDto,
    description: 'Task creation data',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200, example: 'Implement new feature' },
        description: { type: 'string', maxLength: 2000, nullable: true, example: 'Add user profile editing' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], example: 'HIGH' },
        dueDate: { type: 'string', format: 'date-time', nullable: true, example: '2025-12-31T23:59:59Z' },
        assignees: { type: 'array', items: { type: 'string', format: 'uuid' }, nullable: true },
      },
      required: ['title'],
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Task created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        status: { type: 'string', example: 'TODO' },
        priority: { type: 'string', example: 'MEDIUM' },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        creatorId: { type: 'string', format: 'uuid' },
        assignees: { type: 'array', items: { type: 'string', format: 'uuid' } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - invalid fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async create(@Body() dto: CreateTaskDto, @Req() req: any) {
    dto.creatorId = req.user.sub;
    return await this.client.send({ cmd: 'create_task' }, dto).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update task',
    description: 'Update task fields. Only creator or assignees can modify. All fields are optional but at least one must be provided.'
  })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({
    type: UpdateTaskDto,
    description: 'Task update data (all fields optional)',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 2000, nullable: true },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        assignees: { type: 'array', items: { type: 'string', format: 'uuid' } },
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - not task creator or assignee' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req: any) {
    const userId = req.user.sub;
    return await this.client.send({ cmd: 'update_task' }, { id, dto, userId }).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete task',
    description: 'Delete a task permanently. Only the task creator can delete. Deletes all associated comments.'
  })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Task deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Task deleted successfully' },
        id: { type: 'string', format: 'uuid' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - only creator can delete task' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub;
    return await this.client.send({ cmd: 'delete_task' }, { id, userId }).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/history')
  @ApiOperation({
    summary: 'Get task audit log',
    description: 'Retrieve the change history for a task. Shows all modifications with timestamps and user who made them.'
  })
  @ApiParam({ name: 'id', description: 'Task ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Task history retrieved',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          taskId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          fieldChanged: { type: 'string' },
          oldValue: { type: 'string', nullable: true },
          newValue: { type: 'string' },
          changedAt: { type: 'string', format: 'date-time' },
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async getHistory(@Param('id') id: string) {
    return await this.client.send({ cmd: 'get_task_history' }, { id }).toPromise();
  }
}
