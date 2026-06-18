import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeVote } from '../entities/grade-vote.entity';
import { Route } from '../entities/route.entity';
import { VoteService } from './vote.service';
import { VoteController } from './vote.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GradeVote, Route])],
  controllers: [VoteController],
  providers: [VoteService],
  exports: [VoteService],
})
export class VoteModule {}
