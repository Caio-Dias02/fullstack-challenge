import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private connection: any;
  private channel: any;

  constructor(private configService: ConfigService) {}

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
    const payload = {
      event: 'task:created',
      taskId: task.id,
      title: task.title,
      assignees: task.assignees || [],
      createdBy: task.creatorId,
      timestamp: new Date().toISOString(),
    };
    console.log('📤 Publishing task.created event:', payload);
    this.channel.publish(
      'tasks.events',
      'task.created',
      Buffer.from(JSON.stringify(payload))
    );
  }

  async publishTaskUpdated(taskId: string, changes: any, userId: string) {
    const payload = {
      event: 'task:updated',
      taskId,
      changes,
      updatedBy: userId,
      timestamp: new Date().toISOString(),
    };
    console.log('📤 Publishing task.updated event:', payload);
    this.channel.publish(
      'tasks.events',
      'task.updated',
      Buffer.from(JSON.stringify(payload))
    );
  }

  async publishCommentNew(comment: any, taskId: string) {
    const payload = {
      event: 'comment:new',
      commentId: comment.id,
      taskId,
      authorId: comment.authorId,
      body: comment.body,
      timestamp: new Date().toISOString(),
    };
    console.log('📤 Publishing comment.new event:', payload);
    this.channel.publish(
      'tasks.events',
      'comment.new',
      Buffer.from(JSON.stringify(payload))
    );
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
