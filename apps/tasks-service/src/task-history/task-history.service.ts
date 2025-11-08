import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHistory } from './entities/task-history.entity';
import { Task } from '../tasks/entities/task.entity';
import { UsersService } from '../tasks/users.service';

@Injectable()
export class TaskHistoryService {
  constructor(
    @InjectRepository(TaskHistory)
    private readonly historyRepo: Repository<TaskHistory>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async registerChange(taskId: string, changedBy: string, field: string, oldValue: string, newValue: string) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) return;

    const history = this.historyRepo.create({
      task,
      changedBy,
      field,
      oldValue,
      newValue,
    });

    await this.historyRepo.save(history);
  }

  async findByTask(taskId: string) {
    const history = await this.historyRepo.find({
      where: { task: { id: taskId } },
      order: { createdAt: 'DESC' },
    });
    return await this.enrichHistory(history);
  }

  private async enrichHistory(history: TaskHistory[]): Promise<any[]> {
    return Promise.all(
      history.map(async (entry) => {
        const enriched = { ...entry };

        // Enrich changedBy with user data
        const userMap = await this.usersService.getUsersByIds([entry.changedBy]);
        const changedByUser = userMap.get(entry.changedBy);
        if (changedByUser) {
          enriched.changedByData = {
            username: changedByUser.username,
            email: changedByUser.email,
          };
        }

        // If field is assignees, convert IDs to usernames
        if (entry.field === 'assignees') {
          enriched.oldValue = await this.convertIdsToUsernames(entry.oldValue);
          enriched.newValue = await this.convertIdsToUsernames(entry.newValue);
        }

        return enriched;
      })
    );
  }

  private async convertIdsToUsernames(value: string): Promise<string> {
    if (!value) return '';

    try {
      // Try to parse as JSON array
      const ids = JSON.parse(value);
      if (!Array.isArray(ids)) {
        return value;
      }

      if (ids.length === 0) {
        return '(No assignees)';
      }

      // Fetch all user data
      const userMap = await this.usersService.getUsersByIds(ids);
      console.log(`📋 Fetched users for IDs [${ids.join(', ')}]:`, userMap);

      // Map IDs to user info
      const usernames = ids
        .map((id) => {
          const user = userMap.get(id);
          if (user && user.username && user.email) {
            return `${user.username} (${user.email})`;
          }
          console.warn(`⚠️ User not fully loaded for ID: ${id}`);
          return id; // Fallback to ID
        })
        .filter(Boolean)
        .join(', ');

      return usernames || '(Unknown users)';
    } catch (error) {
      console.error('❌ Error parsing assignees:', error, 'value:', value);
      return value;
    }
  }
}
