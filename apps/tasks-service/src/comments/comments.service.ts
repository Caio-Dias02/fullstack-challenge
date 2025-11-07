import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateCommentDto } from '@fullstack-challenge/types/comments/dto/create-comment.dto';
import { EventsService } from '../events/events.service';
import { UsersService } from '../tasks/users.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,

    private readonly eventsService: EventsService,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateCommentDto) {
    const task = await this.taskRepo.findOne({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // Validar autorização: só creator e assignees podem comentar
    const isCreator = task.creatorId === dto.authorId;
    const isAssignee = task.assignees?.includes(dto.authorId);
    if (!isCreator && !isAssignee) {
      throw new NotFoundException('Task not found or unauthorized');
    }

    const comment = this.commentRepo.create({
      body: dto.body,
      authorId: dto.authorId,
      task,
    });

    const saved = await this.commentRepo.save(comment);

    // Publish event (fire and forget)
    try {
      this.eventsService.publishCommentNew(saved, dto.taskId);
    } catch (error) {
      console.error('⚠️ Failed to publish comment new event:', error);
    }

    return saved;
  }

  async findByTask(taskId: string) {
    return this.commentRepo.find({
      where: { task: { id: taskId } },
      order: { createdAt: 'DESC' },
    });
  }

  private async enrichCommentWithAuthorData(comment: Comment): Promise<any> {
    const enriched: any = { ...comment, authorData: null };

    if (comment.authorId) {
      const authorMap = await this.usersService.getUsersByIds([comment.authorId]);
      const author = authorMap.get(comment.authorId);
      if (author) {
        enriched.authorData = author;
      }
    }

    return enriched;
  }

  async enrichComments(comments: Comment[]): Promise<any[]> {
    return Promise.all(comments.map((comment) => this.enrichCommentWithAuthorData(comment)));
  }
}
