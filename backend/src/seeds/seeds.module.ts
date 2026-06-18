import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedsService } from './seeds.service';
import { User } from '../entities/user.entity';
import { Gym } from '../entities/gym.entity';
import { Wall } from '../entities/wall.entity';
import { Route } from '../entities/route.entity';
import { Hold } from '../entities/hold.entity';
import { Ascent } from '../entities/ascent.entity';
import { GradeVote } from '../entities/grade-vote.entity';
import { UserProfile } from '../entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Gym,
      Wall,
      Route,
      Hold,
      Ascent,
      GradeVote,
      UserProfile,
    ]),
  ],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedsModule implements OnModuleInit {
  private readonly logger = new Logger(SeedsModule.name);

  constructor(private readonly seedsService: SeedsService) {}

  async onModuleInit() {
    try {
      this.logger.log('Checking and running seed data...');
      await this.seedsService.run();
      this.logger.log('Seed data initialization complete.');
    } catch (error) {
      this.logger.error('Failed to run seed data', error);
    }
  }
}
