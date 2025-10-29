import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
  } from 'typeorm';
  import { Task } from '../../tasks/entities/task.entity';
  
  @Entity('comments')
  export class Comment {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    body: string;
  
    @Column()
    authorId: string;
  
    @ManyToOne(() => Task, (task) => task.id, {
      onDelete: 'CASCADE', // se deletar a task, remove os comentários também
    })
    task: Task;
  
    @CreateDateColumn()
    createdAt: Date;
  }
  