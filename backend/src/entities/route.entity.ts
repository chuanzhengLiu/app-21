import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wall } from './wall.entity';
import { User } from './user.entity';
import { Hold } from './hold.entity';
import { Ascent } from './ascent.entity';
import { GradeVote } from './grade-vote.entity';

export enum RouteType {
  LEAD = 'lead',
  TOP_ROPE = 'top_rope',
  BOULDER = 'boulder',
  SPEED = 'speed',
}

export enum RouteStatus {
  DRAFTING = 'drafting',
  OPEN = 'open',
  REMOVING = 'removing',
  REMOVED = 'removed',
}

@Entity('route')
@Index('idx_route_wall', ['wall_id'])
@Index('idx_route_status', ['status'])
@Index('idx_route_setter', ['setter_id'])
export class Route {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'wall_id' })
  wall_id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    type: 'enum',
    enum: RouteType,
  })
  type: RouteType;

  @Column({ type: 'json', name: 'path_coords', nullable: true })
  path_coords: object;

  @Column({ type: 'varchar', length: 20 })
  grade: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string;

  @Column({ type: 'int', name: 'setter_id', nullable: true })
  setter_id: number;

  @Column({
    type: 'enum',
    enum: RouteStatus,
    default: RouteStatus.DRAFTING,
  })
  status: RouteStatus;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ type: 'float', nullable: true })
  length: number;

  @Column({ type: 'date', name: 'open_date', nullable: true })
  open_date: Date;

  @Column({ type: 'date', name: 'planned_remove_date', nullable: true })
  planned_remove_date: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Wall, (wall) => wall.routes)
  @JoinColumn({ name: 'wall_id' })
  wall: Wall;

  @ManyToOne(() => User, (user) => user.routes)
  @JoinColumn({ name: 'setter_id' })
  setter: User;

  @OneToMany(() => Hold, (hold) => hold.route)
  holds: Hold[];

  @OneToMany(() => Ascent, (ascent) => ascent.route)
  ascents: Ascent[];

  @OneToMany(() => GradeVote, (vote) => vote.route)
  gradeVotes: GradeVote[];
}
