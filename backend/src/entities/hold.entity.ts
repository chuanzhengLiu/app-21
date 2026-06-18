import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route } from './route.entity';

export enum HoldType {
  HAND = 'hand',
  FOOT = 'foot',
  START = 'start',
  END = 'end',
}

@Entity('hold')
@Index('idx_hold_route', ['route_id'])
export class Hold {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'route_id' })
  route_id: number;

  @Column({ type: 'float', name: 'position_x' })
  position_x: number;

  @Column({ type: 'float', name: 'position_y' })
  position_y: number;

  @Column({
    type: 'enum',
    enum: HoldType,
  })
  type: HoldType;

  @ManyToOne(() => Route, (route) => route.holds)
  @JoinColumn({ name: 'route_id' })
  route: Route;
}
