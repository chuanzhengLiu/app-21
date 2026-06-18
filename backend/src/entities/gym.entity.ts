import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Wall } from './wall.entity';

@Entity('gym')
@Index('idx_gym_admin', ['admin_id'])
export class Gym {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string;

  @Column({ type: 'float', nullable: true })
  area_sqm: number;

  @Column({ type: 'int', name: 'admin_id' })
  admin_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @OneToMany(() => Wall, (wall) => wall.gym)
  walls: Wall[];

  @OneToMany(() => User, (user) => user.gym)
  users: User[];
}
