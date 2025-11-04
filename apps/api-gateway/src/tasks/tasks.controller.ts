import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CreateTaskDto, UpdateTaskDto } from '@fullstack-challenge/types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('tasks')
export class TasksController {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
        queue: process.env.RABBITMQ_TASKS_QUEUE || 'tasks_queue',
        queueOptions: { durable: false },
      },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    console.log('Usuário autenticado:', req.user);
    return this.client.send({ cmd: 'get_tasks' }, {});
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateTaskDto, @Req() req) {
    const authorId = req.user.sub; // 👈 extraído do token
    return this.client.send({ cmd: 'create_task' }, { ...dto, authorId });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req) {
    const userId = req.user.sub;
    return this.client.send({ cmd: 'update_task' }, { id, dto, userId });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    const userId = req.user.sub;
    return this.client.send({ cmd: 'delete_task' }, { id, userId });
  }
}
