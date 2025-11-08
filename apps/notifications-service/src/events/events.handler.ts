import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class EventsHandler implements OnModuleInit, OnModuleDestroy {
  private connection: any;
  private channel: any;

  constructor(
    private configService: ConfigService,
    private notificationsGateway: NotificationsGateway
  ) {}

  async onModuleInit() {
    const maxRetries = 10;
    let retries = 0;
    const retryDelay = 2000; // 2 seconds

    const attemptConnection = async () => {
      try {
        const rabbitmqUrl = this.configService.get('RABBITMQ_URL') || 'amqp://admin:admin@rabbitmq:5672';
        this.connection = await amqp.connect(rabbitmqUrl);
        this.channel = await this.connection.createChannel();

        // Declara exchange
        await this.channel.assertExchange('tasks.events', 'topic', {
          durable: true,
        });

        // Declara queue
        await this.channel.assertQueue('notifications_queue', {
          durable: true,
        });

        // Bind queue ao exchange com routing keys
        await this.channel.bindQueue('notifications_queue', 'tasks.events', 'task.*');
        await this.channel.bindQueue('notifications_queue', 'tasks.events', 'comment.*');

        // Setup listeners
        await this.setupEventListeners();
        console.log('🎧 Event handler initialized - listening for events');
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          console.warn(`⚠️ Failed to connect to RabbitMQ (attempt ${retries}/${maxRetries}), retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptConnection();
        } else {
          console.error('❌ Failed to initialize event handler after max retries:', error);
          // Don't throw - allow app to continue without event handler
        }
      }
    };

    await attemptConnection();
  }

  private async setupEventListeners() {
    await this.channel.consume('notifications_queue', async (msg: any) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());
          console.log('📥 Received event:', event.event);

          if (event.event === 'task:created') {
            this.handleTaskCreated(event);
          } else if (event.event === 'task:updated') {
            this.handleTaskUpdated(event);
          } else if (event.event === 'task:deleted') {
            this.handleTaskDeleted(event);
          } else if (event.event === 'comment:new') {
            this.handleCommentNew(event);
          }

          // Acknowledge message
          this.channel.ack(msg);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          // Requeue message on error
          this.channel.nack(msg, false, true);
        }
      }
    });
  }

  private handleTaskCreated(event: any) {
    console.log('📥 task:created -', event.title);

    // Enviar notificação para todos os assignees
    const assignees = event.assignees || [];
    if (assignees.length > 0) {
      this.notificationsGateway.broadcastEvent('task:created', event, assignees);
    } else {
      // Se não há assignees, broadcast para todos
      this.notificationsGateway.broadcastToAll('task:created', event);
    }
  }

  private handleTaskUpdated(event: any) {
    console.log('📥 task:updated -', event.taskId);

    // Broadcast para TODOS (qualquer um conectado deve refetchá-lo)
    // Isso garante que novo assignee recebe a notificação
    this.notificationsGateway.broadcastToAll('task:updated', event);
  }

  private handleTaskDeleted(event: any) {
    console.log('📥 task:deleted -', event.taskId);

    // Broadcast to all (everyone should know about deletion)
    this.notificationsGateway.broadcastToAll('task:deleted', event);
  }

  private handleCommentNew(event: any) {
    console.log('📥 comment:new -', event.commentId);

    // Notificar assignees EXCETO o author
    const assignees = (event.assignees || []).filter((id: string) => id !== event.authorId);
    if (assignees.length > 0) {
      this.notificationsGateway.broadcastEvent('comment:new', event, assignees);
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
