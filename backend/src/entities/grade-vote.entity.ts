import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route } from './route.entity';
import { User } from './user.entity';

@Entity('grade_vote')
@Index('idx_vote_route', ['route_id'])
export class GradeVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'route_id' })
  route_id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @Column({ type: 'varchar', length: 20, name: 'suggested_grade' })
  suggested_grade: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Route, (route) => route.gradeVotes)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(() => User, (user) => user.gradeVotes)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
