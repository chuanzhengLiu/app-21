import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThan } from 'typeorm';
import { Route, RouteStatus } from '../entities/route.entity';
import { Ascent, AscentType } from '../entities/ascent.entity';
import { User, UserRole } from '../entities/user.entity';
import { Wall } from '../entities/wall.entity';

export interface RouteHeat {
  route_id: number;
  route_name: string;
  grade: string;
  total_ascents: number;
  sent_count: number;
  send_rate: number;
}

export interface ColdRoute {
  route_id: number;
  route_name: string;
  grade: string;
  days_since_last_ascent: number;
  open_date: Date | null;
}

export interface SetterWorkload {
  setter_id: number;
  setter_name: string;
  routes_set: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Ascent)
    private ascentRepository: Repository<Ascent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
  ) {}

  async getRouteHeat(gymId: number): Promise<RouteHeat[]> {
    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    if (wallIds.length === 0) {
      return [];
    }

    const routes = await this.routeRepository.find({
      where: { wall_id: In(wallIds), status: RouteStatus.OPEN },
      select: ['id', 'name', 'grade'],
    });

    const result: RouteHeat[] = [];
    const sentTypes = [AscentType.FLASH, AscentType.ONSIGHT, AscentType.REDPOINT];

    for (const route of routes) {
      const allAscents = await this.ascentRepository.count({
        where: { route_id: route.id },
      });

      const sentAscents = await this.ascentRepository
        .createQueryBuilder('ascent')
        .where('ascent.route_id = :routeId', { routeId: route.id })
        .andWhere('ascent.ascent_type IN (:...types)', { types: sentTypes })
        .getCount();

      result.push({
        route_id: route.id,
        route_name: route.name,
        grade: route.grade,
        total_ascents: allAscents,
        sent_count: sentAscents,
        send_rate: allAscents > 0 ? Number(((sentAscents / allAscents) * 100).toFixed(2)) : 0,
      });
    }

    return result.sort((a, b) => b.total_ascents - a.total_ascents);
  }

  async getColdRoutes(gymId: number): Promise<ColdRoute[]> {
    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    if (wallIds.length === 0) {
      return [];
    }

    const routes = await this.routeRepository.find({
      where: { wall_id: In(wallIds), status: RouteStatus.OPEN },
      select: ['id', 'name', 'grade', 'open_date'],
    });

    const result: ColdRoute[] = [];

    for (const route of routes) {
      const lastAscent = await this.ascentRepository.findOne({
        where: { route_id: route.id },
        order: { created_at: 'DESC' },
        select: ['created_at'],
      });

      let daysSinceLastAscent: number;
      if (lastAscent) {
        const diffTime = Date.now() - lastAscent.created_at.getTime();
        daysSinceLastAscent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else if (route.open_date) {
        const diffTime = Date.now() - new Date(route.open_date).getTime();
        daysSinceLastAscent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        daysSinceLastAscent = 999;
      }

      if (daysSinceLastAscent >= 7) {
        result.push({
          route_id: route.id,
          route_name: route.name,
          grade: route.grade,
          days_since_last_ascent: daysSinceLastAscent,
          open_date: route.open_date,
        });
      }
    }

    return result.sort((a, b) => b.days_since_last_ascent - a.days_since_last_ascent);
  }

  async getSetterWorkload(gymId: number, month: string): Promise<SetterWorkload[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);
    endDate.setHours(23, 59, 59, 999);

    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    if (wallIds.length === 0) {
      return [];
    }

    const setters = await this.userRepository.find({
      where: { gym_id: gymId, role: UserRole.SETTER },
      select: ['id', 'name'],
    });

    const result: SetterWorkload[] = [];

    for (const setter of setters) {
      const routesCount = await this.routeRepository.count({
        where: {
          wall_id: In(wallIds),
          setter_id: setter.id,
          created_at: Between(startDate, endDate),
        },
      });

      result.push({
        setter_id: setter.id,
        setter_name: setter.name,
        routes_set: routesCount,
      });
    }

    return result.sort((a, b) => b.routes_set - a.routes_set);
  }

  async getActiveUsers(gymId: number): Promise<{
    weekly_active_users: number;
    total_members: number;
    avg_routes_per_user: number;
  }> {
    const totalMembers = await this.userRepository.count({
      where: { gym_id: gymId },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    let weeklyActiveUsers = 0;
    let totalRoutesClimbed = 0;

    if (wallIds.length > 0) {
      const routes = await this.routeRepository.find({
        where: { wall_id: In(wallIds) },
        select: ['id'],
      });
      const routeIds = routes.map((r) => r.id);

      if (routeIds.length > 0) {
        const recentAscents = await this.ascentRepository.find({
          where: {
            route_id: In(routeIds),
            created_at: MoreThan(sevenDaysAgo),
          },
          select: ['user_id', 'route_id'],
        });

        const uniqueUsers = new Set<number>();
        const userRouteMap = new Map<number, Set<number>>();

        for (const ascent of recentAscents) {
          uniqueUsers.add(ascent.user_id);
          if (!userRouteMap.has(ascent.user_id)) {
            userRouteMap.set(ascent.user_id, new Set());
          }
          userRouteMap.get(ascent.user_id)!.add(ascent.route_id);
        }

        weeklyActiveUsers = uniqueUsers.size;

        let totalRoutes = 0;
        for (const routeSet of userRouteMap.values()) {
          totalRoutes += routeSet.size;
        }
        totalRoutesClimbed = totalRoutes;
      }
    }

    const avgRoutesPerUser = weeklyActiveUsers > 0
      ? Number((totalRoutesClimbed / weeklyActiveUsers).toFixed(2))
      : 0;

    return {
      weekly_active_users: weeklyActiveUsers,
      total_members: totalMembers,
      avg_routes_per_user: avgRoutesPerUser,
    };
  }

  async getPyramid(userId: number): Promise<Record<string, number>> {
    const ascents = await this.ascentRepository.find({
      where: { user_id: userId },
      relations: ['route'],
    });

    const pyramid: Record<string, number> = {};
    const sentTypes = [AscentType.FLASH, AscentType.ONSIGHT, AscentType.REDPOINT];

    for (const ascent of ascents) {
      if (sentTypes.includes(ascent.ascent_type) && ascent.route) {
        pyramid[ascent.route.grade] = (pyramid[ascent.route.grade] || 0) + 1;
      }
    }

    return pyramid;
  }

  async getProgress(userId: number): Promise<{ date: string; count: number }[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ascents = await this.ascentRepository.find({
      where: {
        user_id: userId,
        created_at: MoreThan(thirtyDaysAgo),
      },
      order: { created_at: 'ASC' },
    });

    const dailyCount: Record<string, number> = {};
    for (const ascent of ascents) {
      const dateStr = ascent.created_at.toISOString().split('T')[0];
      dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1;
    }

    const result = Object.entries(dailyCount).map(([date, count]) => ({
      date,
      count,
    }));

    return result;
  }

  async getStyleAnalysis(userId: number): Promise<Record<string, number>> {
    const ascents = await this.ascentRepository.find({
      where: { user_id: userId },
    });

    const styleCount: Record<string, number> = {};
    for (const ascent of ascents) {
      styleCount[ascent.ascent_type] = (styleCount[ascent.ascent_type] || 0) + 1;
    }

    return styleCount;
  }
}
