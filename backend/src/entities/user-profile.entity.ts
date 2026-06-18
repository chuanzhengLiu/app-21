import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_profile')
@Index('idx_profile_user', ['user_id'])
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id', unique: true })
  user_id: number;

  @Column({ type: 'int', name: 'climbing_since', nullable: true })
  climbing_since: number;

  @Column({ type: 'varchar', length: 100, name: 'preferred_style', nullable: true })
  preferred_style: string;

  @Column({ type: 'float', nullable: true })
  height: number;

  @Column({ type: 'float', name: 'ape_index', nullable: true })
  ape_index: number;

  @Column({ type: 'varchar', length: 20, name: 'target_grade', nullable: true })
  target_grade: string;

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
