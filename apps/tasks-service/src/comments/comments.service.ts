import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Task } from '../tasks/entities/task.entity';
import { CreateCommentDto, UpdateCommentDto } from '@fullstack-challenge/types/comments/dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  /**
   * Cria um novo comentário vinculado a uma task
   */
  async create(dto: CreateCommentDto) {
    const task = await this.taskRepo.findOne({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    return this.commentRepo.save(this.commentRepo.create(dto));
  }

  /**
   * Lista todos os comentários de uma task específica
   */
  async findByTask(taskId: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    return this.commentRepo.find({
      where: { task: { id: taskId } },
      relations: ['task'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Atualiza o conteúdo de um comentário
   */
  async update(id: string, dto: UpdateCommentDto) {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    Object.assign(comment, dto);
    return this.commentRepo.save(comment);
  }

  /**
   * Remove um comentário
   */
  async remove(id: string) {
    const comment = await this.commentRepo.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.commentRepo.remove(comment);
  }
}
