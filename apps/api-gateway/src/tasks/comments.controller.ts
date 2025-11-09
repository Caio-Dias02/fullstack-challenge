import { Controller, Get, Post, Body, Param, UseGuards, Req, OnModuleInit } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CreateCommentDto } from '@fullstack-challenge/types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('tasks/:taskId/comments')
export class CommentsController implements OnModuleInit {
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
      console.log('✅ CommentsController: RabbitMQ connected');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('⚠️ CommentsController: Failed to connect to RabbitMQ -', error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Create comment on task',
    description: 'Add a new comment to a task. Comment author is set to authenticated user. Only task assignees can comment.'
  })
  @ApiParam({ name: 'taskId', description: 'Task ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({
    type: CreateCommentDto,
    description: 'Comment data',
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string', minLength: 1, maxLength: 1000, example: 'Great progress on this task!' },
      },
      required: ['body']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        body: { type: 'string' },
        authorId: { type: 'string', format: 'uuid' },
        taskId: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation error - empty body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any
  ) {
    const authorId = req.user.sub;
    return await this.client.send(
      { cmd: 'create_comment' },
      { ...dto, taskId, authorId }
    ).toPromise();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'List task comments',
    description: 'Retrieve all comments on a task in chronological order (oldest first). Only task assignees can view comments.'
  })
  @ApiParam({ name: 'taskId', description: 'Task ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiResponse({
    status: 200,
    description: 'Comments list retrieved',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          body: { type: 'string' },
          authorId: { type: 'string', format: 'uuid' },
          taskId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async findByTask(@Param('taskId') taskId: string) {
    return await this.client.send({ cmd: 'get_comments' }, { taskId }).toPromise();
  }
}
