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
import { HoldService } from './hold.service';
import { CreateHoldDto } from './dto/create-hold.dto';
import { UpdateHoldDto } from './dto/update-hold.dto';
import { BatchCreateHoldDto } from './dto/batch-create-hold.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class HoldController {
  constructor(private readonly holdService: HoldService) {}

  @Get('routes/:routeId/holds')
  findAllByRoute(@Param('routeId', ParseIntPipe) routeId: number) {
    return this.holdService.findAllByRoute(routeId);
  }

  @Post('routes/:routeId/holds')
  @Roles(UserRole.SETTER)
  batchCreate(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Body() batchCreateHoldDto: BatchCreateHoldDto,
  ) {
    return this.holdService.batchCreate(routeId, batchCreateHoldDto.holds);
  }

  @Put('holds/:id')
  @Roles(UserRole.SETTER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHoldDto: UpdateHoldDto,
  ) {
    return this.holdService.update(id, updateHoldDto);
  }

  @Delete('holds/:id')
  @Roles(UserRole.SETTER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.holdService.remove(id);
  }
}
