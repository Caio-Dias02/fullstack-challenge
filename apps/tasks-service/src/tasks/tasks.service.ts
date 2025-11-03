import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Task } from "./entities/task.entity";
import { CreateTaskDto, UpdateTaskDto } from "@fullstack-challenge/types";
import { TaskHistoryService } from "src/task-history/task-history.service";

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly taskHistoryService: TaskHistoryService
  ) {}

  create(dto: CreateTaskDto) {
    const task = this.taskRepo.create(dto);
    return this.taskRepo.save(task);
  }

  findAll() {
    return this.taskRepo.find();
  }

  async findOne(id: string) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const task = await this.findOne(id);
    const before = { ...task };

    Object.assign(task, dto);
    const updated = await this.taskRepo.save(task);

    // gera histórico das mudanças
    for (const key of Object.keys(dto)) {
      if (before[key] !== dto[key]) {
        await this.taskHistoryService.registerChange(
          task.id,
          "system",
          key,
          before[key],
          dto[key]
        );
      }
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
