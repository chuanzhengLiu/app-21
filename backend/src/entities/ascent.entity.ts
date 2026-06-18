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

export enum AscentType {
  FLASH = 'flash',
  REDPOINT = 'redpoint',
  ONSIGHT = 'onsight',
  HIGH_POINT = 'high_point',
  FALL = 'fall',
}

export enum AscentVisibility {
  PRIVATE = 'private',
  FRIENDS = 'friends',
  PUBLIC = 'public',
}

@Entity('ascent')
@Index('idx_ascent_route', ['route_id'])
@Index('idx_ascent_user', ['user_id'])
@Index('idx_ascent_date', ['created_at'])
export class Ascent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'route_id' })
  route_id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @Column({
    type: 'enum',
    enum: AscentType,
    name: 'ascent_type',
  })
  ascent_type: AscentType;

  @Column({ type: 'int', default: 1 })
  attempts: number;

  @Column({ type: 'varchar', length: 20, name: 'felt_grade', nullable: true })
  felt_grade: string;

  @Column({ type: 'varchar', length: 500, name: 'video_url', nullable: true })
  video_url: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: AscentVisibility,
    default: AscentVisibility.PRIVATE,
  })
  visibility: AscentVisibility;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Route, (route) => route.ascents)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(() => User, (user) => user.ascents)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
