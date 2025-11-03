import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from '@fullstack-challenge/types';

@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Param('taskId') taskId: string, @Body() dto: CreateCommentDto) {
    return this.commentsService.create({ ...dto, taskId });
  }

  @Get()
  findByTask(@Param('taskId') taskId: string) {
    return this.commentsService.findByTask(taskId);
  }
}
