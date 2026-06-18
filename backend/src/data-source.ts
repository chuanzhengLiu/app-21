import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Gym } from './entities/gym.entity';
import { Wall } from './entities/wall.entity';
import { Route } from './entities/route.entity';
import { Hold } from './entities/hold.entity';
import { Ascent } from './entities/ascent.entity';
import { GradeVote } from './entities/grade-vote.entity';
import { UserProfile } from './entities/user-profile.entity';
import { OperationLog } from './entities/operation-log.entity';

export default new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'climberoot',
  database: 'climbing_db',
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
  migrations: ['src/migrations/*.ts'],
});
