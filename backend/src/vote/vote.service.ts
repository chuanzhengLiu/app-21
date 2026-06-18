import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Not } from 'typeorm';
import { GradeVote } from '../entities/grade-vote.entity';
import { Route } from '../entities/route.entity';
import { VoteDto } from './dto/vote.dto';

const GRADE_ORDER: string[] = [
  'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
  'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17',
  '5.8', '5.9', '5.10a', '5.10b', '5.10c', '5.10d',
  '5.11a', '5.11b', '5.11c', '5.11d',
  '5.12a', '5.12b', '5.12c', '5.12d',
  '5.13a', '5.13b', '5.13c', '5.13d',
  '5.14a', '5.14b', '5.14c', '5.14d',
  '5.15a', '5.15b', '5.15c', '5.15d',
];

function getGradeIndex(grade: string): number {
  const index = GRADE_ORDER.indexOf(grade);
  return index === -1 ? -1 : index;
}

function compareGrades(gradeA: string, gradeB: string): number {
  const indexA = getGradeIndex(gradeA);
  const indexB = getGradeIndex(gradeB);
  if (indexA === -1 || indexB === -1) return 0;
  return indexA - indexB;
}

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(GradeVote)
    private voteRepository: Repository<GradeVote>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
  ) {}

  async vote(routeId: number, userId: number, voteDto: VoteDto): Promise<GradeVote> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new BadRequestException('Route not found');
    }

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const existingVote = await this.voteRepository.findOne({
      where: {
        route_id: routeId,
        user_id: userId,
        created_at: MoreThan(twentyFourHoursAgo),
      },
    });

    if (existingVote) {
      throw new BadRequestException('You can only vote once per route every 24 hours');
    }

    const vote = this.voteRepository.create({
      route_id: routeId,
      user_id: userId,
      suggested_grade: voteDto.suggested_grade,
    });

    return this.voteRepository.save(vote);
  }

  async getVotes(routeId: number): Promise<{
    votes: GradeVote[];
    distribution: Record<string, number>;
    consensus_grade: string | null;
    is_controversial: boolean;
    total_votes: number;
  }> {
    const votes = await this.voteRepository.find({
      where: { route_id: routeId },
      order: { created_at: 'DESC' },
    });

    const distribution = this.getVoteDistribution(votes);
    const consensusGrade = this.getConsensusGrade(votes);
    const isControversial = await this.isControversial(routeId, votes);

    return {
      votes,
      distribution,
      consensus_grade: consensusGrade,
      is_controversial: isControversial,
      total_votes: votes.length,
    };
  }

  getVoteDistribution(votes: GradeVote[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const vote of votes) {
      distribution[vote.suggested_grade] = (distribution[vote.suggested_grade] || 0) + 1;
    }
    return distribution;
  }

  getConsensusGrade(votes: GradeVote[]): string | null {
    if (votes.length < 10) {
      return null;
    }

    const sortedGrades = [...votes]
      .sort((a, b) => compareGrades(a.suggested_grade, b.suggested_grade))
      .map((v) => v.suggested_grade);

    const mid = Math.floor(sortedGrades.length / 2);
    if (sortedGrades.length % 2 === 0) {
      return sortedGrades[mid - 1];
    }
    return sortedGrades[mid];
  }

  async isControversial(routeId: number, votes?: GradeVote[]): Promise<boolean> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      return false;
    }

    const voteList = votes || (await this.voteRepository.find({ where: { route_id: routeId } }));
    const consensusGrade = this.getConsensusGrade(voteList);

    if (!consensusGrade) {
      return false;
    }

    const diff = Math.abs(compareGrades(route.grade, consensusGrade));
    return diff > 1;
  }

  async getCalibration(userId: number): Promise<{
    total_votes: number;
    trend: 'tight' | 'loose' | 'accurate';
    avg_deviation: number;
  }> {
    const votes = await this.voteRepository.find({
      where: { user_id: userId },
      relations: ['route'],
    });

    if (votes.length === 0) {
      return {
        total_votes: 0,
        trend: 'accurate',
        avg_deviation: 0,
      };
    }

    let totalDeviation = 0;
    let validVotes = 0;

    for (const vote of votes) {
      if (vote.route) {
        const deviation = compareGrades(vote.suggested_grade, vote.route.grade);
        totalDeviation += deviation;
        validVotes += 1;
      }
    }

    if (validVotes === 0) {
      return {
        total_votes: votes.length,
        trend: 'accurate',
        avg_deviation: 0,
      };
    }

    const averageDeviation = totalDeviation / validVotes;

    let trend: 'tight' | 'loose' | 'accurate' = 'accurate';
    if (averageDeviation > 0.2) {
      trend = 'tight';
    } else if (averageDeviation < -0.2) {
      trend = 'loose';
    }

    return {
      total_votes: votes.length,
      trend,
      avg_deviation: Number(averageDeviation.toFixed(2)),
    };
  }
}
