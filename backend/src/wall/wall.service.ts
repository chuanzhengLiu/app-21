import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wall } from '../entities/wall.entity';
import { CreateWallDto } from './dto/create-wall.dto';
import { UpdateWallDto } from './dto/update-wall.dto';

@Injectable()
export class WallService {
  constructor(
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
  ) {}

  create(gymId: number, createWallDto: CreateWallDto): Promise<Wall> {
    const wall = this.wallRepository.create({
      ...createWallDto,
      gym_id: gymId,
    });
    return this.wallRepository.save(wall);
  }

  findAllByGym(gymId: number): Promise<Wall[]> {
    return this.wallRepository.find({ where: { gym_id: gymId } });
  }

  findOne(id: number): Promise<Wall | null> {
    return this.wallRepository.findOne({ where: { id } });
  }

  async update(id: number, updateWallDto: UpdateWallDto): Promise<Wall> {
    const wall = await this.findOne(id);
    if (!wall) {
      throw new NotFoundException(`Wall with id ${id} not found`);
    }
    Object.assign(wall, updateWallDto);
    return this.wallRepository.save(wall);
  }

  async remove(id: number): Promise<void> {
    const result = await this.wallRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Wall with id ${id} not found`);
    }
  }
}
