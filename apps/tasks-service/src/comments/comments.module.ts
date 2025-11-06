import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from './entities/comment.entity';
import { Task } from '../tasks/entities/task.entity';
import { EventsModule } from '../events/events.module';
import { UsersService } from '../tasks/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Task]), EventsModule, HttpModule],
  controllers: [CommentsController],
  providers: [CommentsService, UsersService],
  exports: [CommentsService],
})
export class CommentsModule {}
