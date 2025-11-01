import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto, UpdateTaskDto, TaskPriority, TaskStatus } from '@fullstack-challenge/types';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  /**
   * Criar nova task
   */
  async create(dto: CreateTaskDto, creatorId: string) {
    // Definir valores default
    const taskData = {
      ...dto,
      priority: dto.priority || TaskPriority.MEDIUM,
      status: dto.status || TaskStatus.TODO,
      assignees: dto.assignees?.length ? dto.assignees : [creatorId],
    };

    const task = this.taskRepo.create(taskData);
    return this.taskRepo.save(task);
  }

  /**
   * Listar todas as tasks do usuário
   */
  async findAll(userId: string, filters?: { status?: TaskStatus; priority?: TaskPriority; search?: string }) {
    const query = this.taskRepo.createQueryBuilder('task')
      .leftJoinAndSelect('task.comments', 'comments')
      .where(':userId = ANY(task.assignees)', { userId });

    if (filters?.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters?.search) {
      query.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return query.orderBy('task.createdAt', 'DESC').getMany();
  }

  /**
   * Buscar uma task por ID
   */
  async findOne(id: string) {
    const task = await this.taskRepo.findOne({
      where: { id },
      relations: ['comments'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  /**
   * Atualizar task
   */
  async update(id: string, dto: UpdateTaskDto) {
    const task = await this.findOne(id);

    // Atualizar apenas os campos fornecidos
    Object.assign(task, dto);

    return this.taskRepo.save(task);
  }

  /**
   * Deletar task
   */
  async remove(id: string) {
    const task = await this.findOne(id);
    await this.taskRepo.remove(task);
    return { message: 'Task deleted successfully' };
  }
}
