import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gym } from '../entities/gym.entity';
import { GymService } from './gym.service';
import { GymController } from './gym.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Gym])],
  controllers: [GymController],
  providers: [GymService],
  exports: [GymService],
})
export class GymModule {}
