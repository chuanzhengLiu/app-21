import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AscentService } from './ascent.service';
import { CreateAscentDto } from './dto/create-ascent.dto';
import { UpdateAscentDto } from './dto/update-ascent.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AscentController {
  constructor(private readonly ascentService: AscentService) {}

  private isAdmin(role: UserRole): boolean {
    return role === UserRole.GYM_ADMIN || role === UserRole.PLATFORM_ADMIN;
  }

  @Get('ascents')
  findAll(
    @Query('route_id') route_id?: string,
    @Query('user_id') user_id?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Request() req?: any,
  ) {
    const parsedRouteId = route_id ? parseInt(route_id, 10) : undefined;
    const parsedUserId = user_id ? parseInt(user_id, 10) : undefined;
    const currentUserId: number = req.user.id;
    const currentUserRole: UserRole = req.user.role;

    let effectiveUserId: number | undefined = parsedUserId;
    if (!this.isAdmin(currentUserRole)) {
      if (parsedUserId !== undefined && parsedUserId !== currentUserId) {
        throw new ForbiddenException('You can only view your own ascents');
      }
      if (parsedRouteId === undefined && parsedUserId === undefined) {
        effectiveUserId = currentUserId;
      }
    }

    return this.ascentService.findAll({
      route_id: parsedRouteId,
      user_id: effectiveUserId,
      start_date,
      end_date,
    });
  }

  @Get('ascents/:id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const ascent = await this.ascentService.findOne(id);
    if (!ascent) {
      throw new NotFoundException(`Ascent with id ${id} not found`);
    }
    if (!this.isAdmin(req.user.role) && ascent.user_id !== req.user.id) {
      throw new ForbiddenException('You can only view your own ascents');
    }
    return this.ascentService.findOneFlattened(id);
  }

  @Post('ascents')
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  create(@Body() createAscentDto: CreateAscentDto, @Request() req: any) {
    return this.ascentService.create(req.user.id, createAscentDto);
  }

  @Put('ascents/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAscentDto: UpdateAscentDto,
    @Request() req: any,
  ) {
    return this.ascentService.update(id, req.user.id, req.user.role, updateAscentDto);
  }

  @Delete('ascents/:id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.ascentService.remove(id, req.user.id, req.user.role);
  }

  @Get('users/:userId/ascent-calendar')
  getAscentCalendar(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('month') month: string,
    @Request() req: any,
  ) {
    if (!this.isAdmin(req.user.role) && userId !== req.user.id) {
      throw new ForbiddenException('You can only view your own ascent calendar');
    }
    return this.ascentService.getAscentCalendar(userId, month);
  }
}
