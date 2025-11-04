import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class EventsService implements OnModuleInit {
  private client: ClientProxy;

  onModuleInit() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
        exchange: 'tasks.events',
        exchangeType: 'topic',
        queue: 'tasks_events_queue',
        queueOptions: { durable: true },
        persistent: true,
      },
    });
  }

  publishTaskCreated(task: any) {
    const payload = {
      event: 'task:created',
      taskId: task.id,
      title: task.title,
      assignees: task.assignees || [],
      createdBy: task.creatorId,
      timestamp: new Date().toISOString(),
    };
    console.log('📤 Publishing task.created event:', payload);
    this.client.emit('task.created', payload);
  }

  publishTaskUpdated(taskId: string, changes: any, userId: string) {
    const payload = {
      event: 'task:updated',
      taskId,
      changes,
      updatedBy: userId,
      timestamp: new Date().toISOString(),
    };
    console.log('📤 Publishing task.updated event:', payload);
    this.client.emit('task.updated', payload);
  }

  publishCommentNew(comment: any, taskId: string) {
    const payload = {
      event: 'comment:new',
      commentId: comment.id,
      taskId,
      authorId: comment.authorId,
      body: comment.body,
      timestamp: new Date().toISOString(),
    };
    console.log('📤 Publishing comment.new event:', payload);
    this.client.emit('comment.new', payload);
  }
}
