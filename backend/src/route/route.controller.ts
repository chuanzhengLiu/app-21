import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { RouteService } from './route.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { UpdateRouteStatusDto } from './dto/update-route-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { RouteType, RouteStatus } from '../entities/route.entity';
import { Repository } from 'typeorm';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get('walls/:wallId/routes')
  findAllByWall(
    @Param('wallId', ParseIntPipe) wallId: number,
    @Query('type') type?: RouteType,
    @Query('grade') grade?: string,
    @Query('status') status?: RouteStatus,
  ) {
    return this.routeService.findAllByWall(wallId, { type, grade, status });
  }

  @Get('routes/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.routeService.findOne(id);
  }

  @Post('walls/:wallId/routes')
  @Roles(UserRole.SETTER)
  create(
    @Param('wallId', ParseIntPipe) wallId: number,
    @Body() createRouteDto: CreateRouteDto,
  ) {
    return this.routeService.create(wallId, createRouteDto);
  }

  @Put('routes/:id')
  @Roles(UserRole.SETTER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRouteDto: UpdateRouteDto,
  ) {
    return this.routeService.update(id, updateRouteDto);
  }

  @Delete('routes/:id')
  @Roles(UserRole.GYM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.routeService.remove(id);
  }

  @Patch('routes/:id/status')
  @Roles(UserRole.GYM_ADMIN, UserRole.SETTER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRouteStatusDto: UpdateRouteStatusDto,
  ) {
    return this.routeService.updateStatus(id, updateRouteStatusDto.status);
  }
}
