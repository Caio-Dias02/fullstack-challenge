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
    await this.client.connect();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a comment on a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'List comments on a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByTask(@Param('taskId') taskId: string) {
    return await this.client.send({ cmd: 'get_comments' }, { taskId }).toPromise();
  }
}
