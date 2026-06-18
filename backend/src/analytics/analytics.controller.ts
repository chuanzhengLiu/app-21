import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { AnalyticsService, RouteHeat, ColdRoute, SetterWorkload } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('gyms/:gymId/stats/route-heat')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  getRouteHeat(@Param('gymId', ParseIntPipe) gymId: number): Promise<RouteHeat[]> {
    return this.analyticsService.getRouteHeat(gymId);
  }

  @Get('gyms/:gymId/stats/cold-routes')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  getColdRoutes(@Param('gymId', ParseIntPipe) gymId: number): Promise<ColdRoute[]> {
    return this.analyticsService.getColdRoutes(gymId);
  }

  @Get('gyms/:gymId/stats/setter-work')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  getSetterWorkload(
    @Param('gymId', ParseIntPipe) gymId: number,
    @Query('month') month: string,
  ): Promise<SetterWorkload[]> {
    return this.analyticsService.getSetterWorkload(gymId, month);
  }

  @Get('gyms/:gymId/stats/active-users')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  getActiveUsers(@Param('gymId', ParseIntPipe) gymId: number): Promise<{
    weekly_active_users: number;
    total_members: number;
    avg_routes_per_user: number;
  }> {
    return this.analyticsService.getActiveUsers(gymId);
  }

  @Get('analytics/pyramid')
  getPyramid(@Request() req: any): Promise<Record<string, number>> {
    return this.analyticsService.getPyramid(req.user.id);
  }

  @Get('analytics/progress')
  getProgress(@Request() req: any): Promise<{ date: string; count: number }[]> {
    return this.analyticsService.getProgress(req.user.id);
  }

  @Get('analytics/style')
  getStyleAnalysis(@Request() req: any): Promise<Record<string, number>> {
    return this.analyticsService.getStyleAnalysis(req.user.id);
  }
}
