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
import { Gym } from './gym.entity';
import { Route } from './route.entity';

@Entity('wall')
@Index('idx_wall_gym', ['gym_id'])
export class Wall {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'gym_id' })
  gym_id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, name: 'photo_url', nullable: true })
  photo_url: string;

  @Column({ type: 'json', name: 'polygon_coords', nullable: true })
  polygon_coords: object;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Gym, (gym) => gym.walls)
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @OneToMany(() => Route, (route) => route.wall)
  routes: Route[];
}
