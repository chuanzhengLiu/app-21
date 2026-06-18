import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('operation_log')
@Index('idx_log_user', ['user_id'])
@Index('idx_log_action', ['action'])
export class OperationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id', nullable: true })
  user_id: number;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 50, name: 'target_type', nullable: true })
  target_type: string;

  @Column({ type: 'int', name: 'target_id', nullable: true })
  target_id: number;

  @Column({ type: 'json', nullable: true })
  details: object;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ip_address: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.operationLogs)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
