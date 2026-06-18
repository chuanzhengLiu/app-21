import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { VerifyUserDto } from './dto/verify-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('gyms/:gymId/users')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  findByGym(
    @Param('gymId', ParseIntPipe) gymId: number,
    @Query('role') role?: UserRole,
    @Query('verified') verified?: string,
    @Query('search') search?: string,
  ) {
    return this.userService.findByGym(gymId, {
      role,
      verified: verified !== undefined ? verified === 'true' : undefined,
      search,
    });
  }

  @Get('gyms/:gymId/pending-verifications')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  getPendingVerifications(@Param('gymId', ParseIntPipe) gymId: number) {
    return this.userService.getPendingVerifications(gymId);
  }

  @Patch('users/:id/verify')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  verifyUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() verifyUserDto: VerifyUserDto,
  ) {
    return this.userService.verifyUser(id, verifyUserDto.approved, verifyUserDto.reason);
  }

  @Patch('users/:id/role')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.userService.updateRole(id, updateRoleDto.role);
  }
}
