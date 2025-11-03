import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateCommentDto } from '@fullstack-challenge/types/comments/dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async create(dto: CreateCommentDto) {
    const task = await this.taskRepo.findOne({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const comment = this.commentRepo.create({
      body: dto.body,
      authorId: dto.authorId,
      task,
    });

    return this.commentRepo.save(comment);
  }

  async findByTask(taskId: string) {
    return this.commentRepo.find({
      where: { task: { id: taskId } },
      order: { createdAt: 'DESC' },
    });
  }
}
