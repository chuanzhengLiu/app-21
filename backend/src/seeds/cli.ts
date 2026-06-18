import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
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
import { OperationLog } from '../entities/operation-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'climbing_db',
      entities: [
        User,
        Gym,
        Wall,
        Route,
        Hold,
        Ascent,
        GradeVote,
        UserProfile,
        OperationLog,
      ],
      synchronize: true,
    }),
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
})
class CliModule {}

async function bootstrap() {
  const logger = new Logger('SeederCLI');
  
  try {
    const app = await NestFactory.createApplicationContext(CliModule);
    const seedsService = app.get(SeedsService);
    
    logger.log('开始执行种子数据...');
    await seedsService.run();
    logger.log('种子数据执行成功！');
    
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('种子数据执行失败', error);
    process.exit(1);
  }
}

bootstrap();
