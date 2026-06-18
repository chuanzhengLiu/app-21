import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hold } from '../entities/hold.entity';
import { CreateHoldDto } from './dto/create-hold.dto';
import { UpdateHoldDto } from './dto/update-hold.dto';

@Injectable()
export class HoldService {
  constructor(
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
  ) {}

  create(routeId: number, createHoldDto: CreateHoldDto): Promise<Hold> {
    const hold = this.holdRepository.create({
      ...createHoldDto,
      route_id: routeId,
    });
    return this.holdRepository.save(hold);
  }

  async batchCreate(routeId: number, createHoldDtos: CreateHoldDto[]): Promise<Hold[]> {
    const holds = createHoldDtos.map((dto) =>
      this.holdRepository.create({
        ...dto,
        route_id: routeId,
      }),
    );
    return this.holdRepository.save(holds);
  }

  findAllByRoute(routeId: number): Promise<Hold[]> {
    return this.holdRepository.find({ where: { route_id: routeId } });
  }

  findOne(id: number): Promise<Hold | null> {
    return this.holdRepository.findOne({ where: { id } });
  }

  async update(id: number, updateHoldDto: UpdateHoldDto): Promise<Hold> {
    const hold = await this.findOne(id);
    if (!hold) {
      throw new NotFoundException(`Hold with id ${id} not found`);
    }
    Object.assign(hold, updateHoldDto);
    return this.holdRepository.save(hold);
  }

  async remove(id: number): Promise<void> {
    const result = await this.holdRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Hold with id ${id} not found`);
    }
  }
}
