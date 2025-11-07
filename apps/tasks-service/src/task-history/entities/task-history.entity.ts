import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from '../../tasks/entities/task.entity';

export interface UserDataResponse {
  username: string;
  email: string;
}

@Entity('task_history')
export class TaskHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Task, (task) => task.history, { onDelete: 'CASCADE' })
  task: Task;

  @Column()
  changedBy: string;

  @Column()
  field: string;

  @Column({ nullable: true })
  oldValue?: string;

  @Column({ nullable: true })
  newValue?: string;

  @CreateDateColumn()
  createdAt: Date;

  // Enriched data (not stored in DB)
  changedByData?: UserDataResponse;
}
