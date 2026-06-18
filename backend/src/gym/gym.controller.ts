import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { GymService } from './gym.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('gyms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GymController {
  constructor(private readonly gymService: GymService) {}

  @Get()
  findAll() {
    return this.gymService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gymService.findOne(id);
  }

  @Post()
  @Roles(UserRole.PLATFORM_ADMIN)
  create(@Body() createGymDto: CreateGymDto) {
    return this.gymService.create(createGymDto);
  }

  @Put(':id')
  @Roles(UserRole.GYM_ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGymDto: UpdateGymDto,
  ) {
    return this.gymService.update(id, updateGymDto);
  }
}
