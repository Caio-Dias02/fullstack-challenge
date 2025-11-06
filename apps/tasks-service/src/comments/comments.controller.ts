import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from '@fullstack-challenge/types';

@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async create(@Param('taskId') taskId: string, @Body() dto: CreateCommentDto) {
    const comment = await this.commentsService.create({ ...dto, taskId });
    return await (this.commentsService as any).enrichCommentWithAuthorData(comment);
  }

  @Get()
  async findByTask(@Param('taskId') taskId: string) {
    const comments = await this.commentsService.findByTask(taskId);
    return await this.commentsService.enrichComments(comments);
  }

  // Message patterns pra API Gateway (RabbitMQ)
  @MessagePattern({ cmd: 'create_comment' })
  async createComment(@Payload() dto: CreateCommentDto) {
    const comment = await this.commentsService.create(dto);
    return await (this.commentsService as any).enrichCommentWithAuthorData(comment);
  }

  @MessagePattern({ cmd: 'get_comments' })
  async getComments(@Payload() data: { taskId: string }) {
    const comments = await this.commentsService.findByTask(data.taskId);
    return await this.commentsService.enrichComments(comments);
  }
}
