import { TaskHistory } from 'src/task-history/entities/task-history.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Comment } from 'src/comments/entities/comment.entity';


@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'pending' })
  status!: string;

  @Column({ default: 'medium' })
  priority!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Comment, (comment) => comment.task)
  comments: Comment[];

  @OneToMany(() => TaskHistory, (history) => history.task)
  history: TaskHistory[];
}
