import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { WallService } from './wall.service';
import { CreateWallDto } from './dto/create-wall.dto';
import { UpdateWallDto } from './dto/update-wall.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WallController {
  constructor(private readonly wallService: WallService) {}

  @Get('gyms/:gymId/walls')
  findAllByGym(@Param('gymId', ParseIntPipe) gymId: number) {
    return this.wallService.findAllByGym(gymId);
  }

  @Get('walls/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.wallService.findOne(id);
  }

  @Post('gyms/:gymId/walls')
  @Roles(UserRole.GYM_ADMIN, UserRole.SETTER)
  create(
    @Param('gymId', ParseIntPipe) gymId: number,
    @Body() createWallDto: CreateWallDto,
  ) {
    return this.wallService.create(gymId, createWallDto);
  }

  @Put('walls/:id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SETTER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWallDto: UpdateWallDto,
  ) {
    return this.wallService.update(id, updateWallDto);
  }

  @Delete('walls/:id')
  @Roles(UserRole.GYM_ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.wallService.remove(id);
  }
}
