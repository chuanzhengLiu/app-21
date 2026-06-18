import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { VoteService } from './vote.service';
import { VoteDto } from './dto/vote.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post('routes/:routeId/vote')
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  vote(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Body() voteDto: VoteDto,
    @Request() req: any,
  ) {
    return this.voteService.vote(routeId, req.user.id, voteDto);
  }

  @Get('routes/:routeId/votes')
  getVotes(@Param('routeId', ParseIntPipe) routeId: number) {
    return this.voteService.getVotes(routeId);
  }

  @Get('users/:userId/calibration')
  getCalibration(@Param('userId', ParseIntPipe) userId: number) {
    return this.voteService.getCalibration(userId);
  }
}
