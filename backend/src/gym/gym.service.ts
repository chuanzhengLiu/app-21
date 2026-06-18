import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Gym } from '../entities/gym.entity';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';

@Injectable()
export class GymService {
  constructor(
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
  ) {}

  create(createGymDto: CreateGymDto): Promise<Gym> {
    const gym = this.gymRepository.create(createGymDto);
    return this.gymRepository.save(gym);
  }

  findAll(): Promise<Gym[]> {
    return this.gymRepository.find();
  }

  findOne(id: number): Promise<Gym | null> {
    return this.gymRepository.findOne({ where: { id } });
  }

  async update(id: number, updateGymDto: UpdateGymDto): Promise<Gym> {
    const gym = await this.findOne(id);
    if (!gym) {
      throw new NotFoundException(`Gym with id ${id} not found`);
    }
    Object.assign(gym, updateGymDto);
    return this.gymRepository.save(gym);
  }

  async remove(id: number): Promise<void> {
    const result = await this.gymRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Gym with id ${id} not found`);
    }
  }
}
