import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task } from "./entities/task.entity";
import { CreateTaskDto, UpdateTaskDto } from "@fullstack-challenge/types";
import { TaskHistoryService } from "../task-history/task-history.service";
import { EventsService } from "../events/events.service";
import { UsersService, UserData } from "./users.service";

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly taskHistoryService: TaskHistoryService,
    private readonly eventsService: EventsService,
    private readonly usersService: UsersService
  ) {}

  async create(dto: CreateTaskDto) {
    // Set default assignees to creator if not provided
    if (!dto.assignees || dto.assignees.length === 0) {
      dto.assignees = [dto.creatorId];
    }

    const task = this.taskRepo.create(dto);
    const saved = await this.taskRepo.save(task);

    // Publish event (fire and forget)
    try {
      this.eventsService.publishTaskCreated(saved);
    } catch (error) {
      console.error('⚠️ Failed to publish task created event:', error);
    }

    return saved;
  }

  async findAll(userId?: string) {
    try {
      if (!userId) {
        return await this.taskRepo.find();
      }

      // Filter tasks where user is creator OR in assignees
      const tasks = await this.taskRepo
        .createQueryBuilder('task')
        .where('task.creatorId = :userId', { userId })
        .orWhere(':userId = ANY(task.assignees)', { userId })
        .orderBy('task.createdAt', 'DESC')
        .getMany();

      console.log(`📋 Found ${tasks.length} tasks for user ${userId}`);
      return tasks;
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId?: string) {
    const task = await this.findOne(id);

    // Autorização: creator ou assignees podem editar
    const isCreator = task.creatorId === userId;
    const isAssignee = task.assignees?.includes(userId);
    if (!isCreator && !isAssignee) {
      throw new NotFoundException("Task not found or unauthorized");
    }

    const before = { ...task };

    Object.assign(task, dto);
    const updated = await this.taskRepo.save(task);

    // gera histórico das mudanças
    const changes: any = {};
    for (const key of Object.keys(dto)) {
      if (before[key] !== dto[key]) {
        changes[key] = { old: before[key], new: dto[key] };
        await this.taskHistoryService.registerChange(
          task.id,
          userId || "system",
          key,
          before[key],
          dto[key]
        );
      }
    }

    // Publish event only if there were changes (fire and forget)
    if (Object.keys(changes).length > 0) {
      try {
        await this.eventsService.publishTaskUpdated(id, changes, userId || "system");
      } catch (error) {
        console.error('⚠️ Failed to publish task updated event:', error);
      }
    }

    return updated;
  }

  async remove(id: string, userId?: string) {
    const task = await this.findOne(id);

    // Só creator pode deletar
    if (!userId || task.creatorId !== userId) {
      throw new NotFoundException("Task not found or unauthorized");
    }

    await this.taskRepo.delete(task.id);

    // Publish event (fire and forget - don't await)
    this.eventsService.publishTaskDeleted(id, userId);

    return { message: "Task deleted successfully", id: task.id };
  }

  async enrichTaskWithAssigneeData(task: Task): Promise<any> {
    const enriched: any = { ...task, assigneesData: [], creatorData: null };

    // Enrich assignees
    if (task.assignees && task.assignees.length > 0) {
      const userMap = await this.usersService.getUsersByIds(task.assignees);
      const assigneesData: UserData[] = [];

      for (const userId of task.assignees) {
        const userData = userMap.get(userId);
        if (userData) {
          assigneesData.push(userData);
        }
      }

      enriched.assigneesData = assigneesData;
    }

    // Enrich creator
    if (task.creatorId) {
      const creatorData = await this.usersService.getUsersByIds([task.creatorId]);
      const creator = creatorData.get(task.creatorId);
      if (creator) {
        enriched.creatorData = creator;
      }
    }

    return enriched;
  }

  async enrichTasks(tasks: Task[]): Promise<any[]> {
    return Promise.all(tasks.map((task) => this.enrichTaskWithAssigneeData(task)));
  }
}
