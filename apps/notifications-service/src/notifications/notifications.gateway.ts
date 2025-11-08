import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
  allowEIO3: true,
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server = new Server();

  // Map de userId -> socket connection
  private userSockets = new Map<string, Set<Socket>>();

  afterInit(server: Server) {
    console.log('🔗 WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    console.log(`✅ Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove cliente de todos os user maps
    for (const sockets of this.userSockets.values()) {
      sockets.delete(client);
    }
    console.log(`❌ Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    console.log('📥 Subscribe received:', data, 'Type:', typeof data);

    // Parse se vier como string
    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        parsedData = data;
      }
    }

    console.log('📥 Parsed data:', parsedData);

    if (!parsedData || !parsedData.userId) {
      console.log('❌ Missing data or userId');
      client.emit('error', { message: 'userId é obrigatório' });
      return;
    }

    // Registra socket para este usuário
    if (!this.userSockets.has(parsedData.userId)) {
      this.userSockets.set(parsedData.userId, new Set());
    }
    this.userSockets.get(parsedData.userId)?.add(client);

    console.log(`📌 User ${parsedData.userId} subscribed (socket: ${client.id})`);
    client.emit('subscribed', { userId: parsedData.userId });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    if (this.userSockets.has(data.userId)) {
      this.userSockets.get(data.userId)?.delete(client);
    }
    console.log(`📌 User ${data.userId} unsubscribed (socket: ${client.id})`);
  }

  // Método público para publicar eventos
  broadcastEvent(event: string, data: any, userIds: string[]) {
    console.log(
      `📡 Broadcasting ${event} to users:`,
      userIds,
      'Data:',
      data
    );

    userIds.forEach((userId) => {
      const sockets = this.userSockets.get(userId);
      if (sockets && sockets.size > 0) {
        sockets.forEach((socket) => {
          socket.emit(event, data);
        });
        console.log(`  ✅ Sent to user ${userId} (${sockets.size} sockets)`);
      } else {
        console.log(`  ⚠️ No connected sockets for user ${userId}`);
      }
    });
  }

  // Broadcast para todos os clients
  broadcastToAll(event: string, data: any) {
    console.log(`📢 Broadcasting ${event} to all clients`);
    this.server.emit(event, data);
  }
}
