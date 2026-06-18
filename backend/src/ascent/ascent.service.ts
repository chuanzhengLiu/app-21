import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { Ascent, AscentType } from '../entities/ascent.entity';
import { UserRole } from '../entities/user.entity';
import { CreateAscentDto } from './dto/create-ascent.dto';
import { UpdateAscentDto } from './dto/update-ascent.dto';

@Injectable()
export class AscentService {
  constructor(
    @InjectRepository(Ascent)
    private ascentRepository: Repository<Ascent>,
  ) {}

  async create(userId: number, createAscentDto: CreateAscentDto): Promise<Ascent> {
    const ascent = this.ascentRepository.create({
      ...createAscentDto,
      user_id: userId,
    });
    return this.ascentRepository.save(ascent);
  }

  async findAll(filters?: {
    route_id?: number;
    user_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<any[]> {
    const options: FindManyOptions<Ascent> = {
      where: {},
      order: { created_at: 'DESC' },
      relations: ['route', 'user'],
    };

    if (filters?.route_id) {
      (options.where as any).route_id = filters.route_id;
    }
    if (filters?.user_id) {
      (options.where as any).user_id = filters.user_id;
    }
    if (filters?.start_date && filters?.end_date) {
      (options.where as any).created_at = Between(
        new Date(filters.start_date),
        new Date(filters.end_date + ' 23:59:59'),
      );
    }

    const ascents = await this.ascentRepository.find(options);
    return ascents.map((ascent) => ({
      ...ascent,
      route_name: ascent.route?.name,
      route_grade: ascent.route?.grade,
      user_name: ascent.user?.name,
    }));
  }

  findOne(id: number): Promise<Ascent | null> {
    return this.ascentRepository.findOne({ where: { id } });
  }

  async findOneFlattened(id: number): Promise<any> {
    const ascent = await this.ascentRepository.findOne({
      where: { id },
      relations: ['route', 'user'],
    });
    if (!ascent) return null;
    return {
      ...ascent,
      route_name: ascent.route?.name,
      route_grade: ascent.route?.grade,
      user_name: ascent.user?.name,
    };
  }

  async update(
    id: number,
    userId: number,
    userRole: UserRole,
    updateAscentDto: UpdateAscentDto,
  ): Promise<Ascent> {
    const ascent = await this.findOne(id);
    if (!ascent) {
      throw new NotFoundException(`Ascent with id ${id} not found`);
    }

    if (ascent.user_id !== userId && userRole !== UserRole.GYM_ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('You can only update your own ascents');
    }

    Object.assign(ascent, updateAscentDto);
    return this.ascentRepository.save(ascent);
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const ascent = await this.findOne(id);
    if (!ascent) {
      throw new NotFoundException(`Ascent with id ${id} not found`);
    }

    if (ascent.user_id !== userId && userRole !== UserRole.GYM_ADMIN && userRole !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('You can only delete your own ascents');
    }

    await this.ascentRepository.delete(id);
  }

  async getAscentCalendar(userId: number, month: string): Promise<Record<string, { total: number; sent: number }>> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const ascents = await this.ascentRepository.find({
      where: {
        user_id: userId,
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'ASC' },
    });

    const calendar: Record<string, { total: number; sent: number }> = {};

    const sentTypes = [AscentType.FLASH, AscentType.ONSIGHT, AscentType.REDPOINT];

    for (const ascent of ascents) {
      const dateStr = ascent.created_at.toISOString().split('T')[0];
      if (!calendar[dateStr]) {
        calendar[dateStr] = { total: 0, sent: 0 };
      }
      calendar[dateStr].total += 1;
      if (sentTypes.includes(ascent.ascent_type)) {
        calendar[dateStr].sent += 1;
      }
    }

    return calendar;
  }
}
