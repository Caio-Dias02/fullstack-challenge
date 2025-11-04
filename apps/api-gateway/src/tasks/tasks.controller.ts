import { Controller, Get, Post, Patch, Delete, Body, Param, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('tasks')
export class TasksController {
  constructor(
    @Inject('TASKS_SERVICE') private readonly tasksClient: ClientProxy
  ) {}

  @Post()
  async create(@Body() createTaskDto: any) {
    return firstValueFrom(
      this.tasksClient.send({ cmd: 'create_task' }, createTaskDto)
    );
  }

  @Get()
  async findAll() {
    return firstValueFrom(
      this.tasksClient.send({ cmd: 'get_tasks' }, {})
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.tasksClient.send({ cmd: 'get_task_by_id' }, { id })
    );
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: any) {
    return firstValueFrom(
      this.tasksClient.send({ cmd: 'update_task' }, { id, dto: updateTaskDto })
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.tasksClient.send({ cmd: 'delete_task' }, { id })
    );
  }
}
