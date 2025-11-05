import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as amqp from 'amqplib';
import { Task } from '../tasks/entities/task.entity';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private connection: any;
  private channel: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async onModuleInit() {
    try {
      const rabbitmqUrl = this.configService.get('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange('tasks.events', 'topic', { durable: true });
      console.log('✅ RabbitMQ publisher initialized');
    } catch (error) {
      console.error('❌ Failed to initialize RabbitMQ publisher:', error);
      throw error;
    }
  }

  async publishTaskCreated(task: any) {
    try {
      const payload = {
        event: 'task:created',
        taskId: task.id,
        title: task.title,
        assignees: task.assignees || [],
        createdBy: task.creatorId,
        timestamp: new Date().toISOString(),
      };
      console.log('📤 Publishing task.created event:', payload);
      await this.channel.publish(
        'tasks.events',
        'task.created',
        Buffer.from(JSON.stringify(payload))
      );
    } catch (error) {
      console.error('❌ Failed to publish task.created event:', error);
    }
  }

  async publishTaskUpdated(taskId: string, changes: any, userId: string) {
    try {
      const task = await this.taskRepo.findOne({ where: { id: taskId } });
      const payload = {
        event: 'task:updated',
        taskId,
        changes,
        updatedBy: userId,
        assignees: task?.assignees || [],
        creatorId: task?.creatorId,
        timestamp: new Date().toISOString(),
      };
      console.log('📤 Publishing task.updated event:', payload);
      await this.channel.publish(
        'tasks.events',
        'task.updated',
        Buffer.from(JSON.stringify(payload))
      );
    } catch (error) {
      console.error('❌ Failed to publish task.updated event:', error);
    }
  }

  async publishCommentNew(comment: any, taskId: string) {
    try {
      const task = await this.taskRepo.findOne({ where: { id: taskId } });
      const payload = {
        event: 'comment:new',
        commentId: comment.id,
        taskId,
        authorId: comment.authorId,
        body: comment.body,
        assignees: task?.assignees || [],
        timestamp: new Date().toISOString(),
      };
      console.log('📤 Publishing comment.new event:', payload);
      await this.channel.publish(
        'tasks.events',
        'comment.new',
        Buffer.from(JSON.stringify(payload))
      );
    } catch (error) {
      console.error('❌ Failed to publish comment.new event:', error);
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }
}
