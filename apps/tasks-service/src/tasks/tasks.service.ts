import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task } from "./entities/task.entity";
import { CreateTaskDto, UpdateTaskDto } from "@fullstack-challenge/types";
import { TaskHistoryService } from "../task-history/task-history.service";
import { EventsService } from "../events/events.service";

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly taskHistoryService: TaskHistoryService,
    private readonly eventsService: EventsService
  ) {}

  async create(dto: CreateTaskDto) {
    const task = this.taskRepo.create(dto);
    const saved = await this.taskRepo.save(task);

    // Publish event
    this.eventsService.publishTaskCreated(saved);

    return saved;
  }

  findAll() {
    return this.taskRepo.find();
  }

  async findOne(id: string) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, userId?: string) {
    const task = await this.findOne(id);
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

    // Publish event only if there were changes
    if (Object.keys(changes).length > 0) {
      this.eventsService.publishTaskUpdated(id, changes, userId || "system");
    }

    return updated;
  }

  async remove(id: string) {
    const task = await this.findOne(id);
    if (!task) throw new NotFoundException("Task not found");
    await this.taskRepo.delete(task.id);
    return { message: "Task deleted successfully" };
  }
}
