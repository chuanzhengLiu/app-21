import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PassportModule } from '@nestjs/passport';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GymModule } from './gym/gym.module';
import { WallModule } from './wall/wall.module';
import { RouteModule } from './route/route.module';
import { HoldModule } from './hold/hold.module';
import { AscentModule } from './ascent/ascent.module';
import { VoteModule } from './vote/vote.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UserModule } from './user/user.module';
import { UploadModule } from './upload/upload.module';
import { SeedsModule } from './seeds/seeds.module';
import { User } from './entities/user.entity';
import { Gym } from './entities/gym.entity';
import { Wall } from './entities/wall.entity';
import { Route } from './entities/route.entity';
import { Hold } from './entities/hold.entity';
import { Ascent } from './entities/ascent.entity';
import { GradeVote } from './entities/grade-vote.entity';
import { UserProfile } from './entities/user-profile.entity';
import { OperationLog } from './entities/operation-log.entity';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'climbing',
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
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/static',
      serveStaticOptions: {
        index: false,
      },
    }),
    AuthModule,
    GymModule,
    WallModule,
    RouteModule,
    HoldModule,
    AscentModule,
    VoteModule,
    AnalyticsModule,
    UserModule,
    UploadModule,
    SeedsModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class AppModule {}
