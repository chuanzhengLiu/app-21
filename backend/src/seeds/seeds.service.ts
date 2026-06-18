import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { Gym } from '../entities/gym.entity';
import { Wall } from '../entities/wall.entity';
import { Route, RouteType, RouteStatus } from '../entities/route.entity';
import { Hold, HoldType } from '../entities/hold.entity';
import { Ascent, AscentType, AscentVisibility } from '../entities/ascent.entity';
import { GradeVote } from '../entities/grade-vote.entity';
import { UserProfile } from '../entities/user-profile.entity';

@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
    @InjectRepository(Ascent)
    private ascentRepository: Repository<Ascent>,
    @InjectRepository(GradeVote)
    private gradeVoteRepository: Repository<GradeVote>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  async run() {
    this.logger.log('开始播种种子数据...');

    try {
      const admin = await this.createPlatformAdmin();
      this.logger.log('平台管理员创建完成');

      const gymAdmin = await this.createGymAdmin();
      this.logger.log('岩馆馆长创建完成');

      const setters = await this.createSetters();
      this.logger.log('定线员创建完成');

      const climbers = await this.createClimbers();
      this.logger.log('认证攀岩者创建完成');

      const gym = await this.createGym(gymAdmin.id);
      this.logger.log('岩馆创建完成');

      const walls = await this.createWalls(gym.id);
      this.logger.log('岩壁创建完成');

      const routes = await this.createRoutes(walls, setters);
      this.logger.log('线路创建完成');

      await this.createHolds(routes);
      this.logger.log('手点创建完成');

      await this.createAscents(climbers, routes);
      this.logger.log('攀爬记录创建完成');

      await this.createGradeVotes(climbers, routes);
      this.logger.log('难度投票创建完成');

      this.logger.log('种子数据播种完成！');
    } catch (error) {
      this.logger.error('种子数据播种失败', error);
      throw error;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async createPlatformAdmin(): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: 'admin@test.com' },
    });
    if (existing) return existing;

    const user = new User();
    user.email = 'admin@test.com';
    user.password_hash = await this.hashPassword('admin123456');
    user.name = '平台管理员';
    user.role = UserRole.PLATFORM_ADMIN;
    user.verified_at = new Date();

    const saved = await this.userRepository.save(user);
    await this.createUserProfile(saved.id);
    return saved;
  }

  private async createGymAdmin(): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: 'admin@gym1.com' },
    });
    if (existing) return existing;

    const user = new User();
    user.email = 'admin@gym1.com';
    user.password_hash = await this.hashPassword('admin123456');
    user.name = '岩馆馆长';
    user.role = UserRole.GYM_ADMIN;
    user.verified_at = new Date();

    const saved = await this.userRepository.save(user);
    await this.createUserProfile(saved.id);
    return saved;
  }

  private async createSetters(): Promise<User[]> {
    const setters: User[] = [];
    for (let i = 1; i <= 2; i++) {
      const email = `setter${i}@test.com`;
      const existing = await this.userRepository.findOne({ where: { email } });
      if (existing) {
        setters.push(existing);
        continue;
      }

      const user = new User();
      user.email = email;
      user.password_hash = await this.hashPassword('test123456');
      user.name = `定线员${i}`;
      user.role = UserRole.SETTER;
      user.verified_at = new Date();

      const saved = await this.userRepository.save(user);
      await this.createUserProfile(saved.id);
      setters.push(saved);
    }
    return setters;
  }

  private async createClimbers(): Promise<User[]> {
    const climbers: User[] = [];
    for (let i = 1; i <= 5; i++) {
      const email = `climber${i}@test.com`;
      const existing = await this.userRepository.findOne({ where: { email } });
      if (existing) {
        climbers.push(existing);
        continue;
      }

      const user = new User();
      user.email = email;
      user.password_hash = await this.hashPassword('test123456');
      user.name = `攀岩者${i}`;
      user.role = UserRole.VERIFIED_CLIMBER;
      user.verified_at = new Date();

      const saved = await this.userRepository.save(user);
      await this.createUserProfile(saved.id);
      climbers.push(saved);
    }
    return climbers;
  }

  private async createUserProfile(userId: number): Promise<void> {
    const existing = await this.userProfileRepository.findOne({
      where: { user_id: userId },
    });
    if (existing) return;

    const profile = new UserProfile();
    profile.user_id = userId;
    profile.climbing_since = 2018 + Math.floor(Math.random() * 5);
    profile.preferred_style = ['lead', 'boulder', 'top_rope'][Math.floor(Math.random() * 3)];
    profile.height = 160 + Math.floor(Math.random() * 30);
    profile.ape_index = -2 + Math.random() * 6;
    profile.target_grade = ['5.10a', '5.11a', '5.12a', 'V3', 'V5'][Math.floor(Math.random() * 5)];

    await this.userProfileRepository.save(profile);
  }

  private async createGym(adminId: number): Promise<Gym> {
    const existing = await this.gymRepository.findOne({
      where: { name: '磐石攀岩馆' },
    });
    if (existing) return existing;

    const gym = new Gym();
    gym.name = '磐石攀岩馆';
    gym.address = '北京市朝阳区攀岩路88号';
    gym.area_sqm = 800;
    gym.admin_id = adminId;

    return this.gymRepository.save(gym);
  }

  private async createWalls(gymId: number): Promise<Wall[]> {
    const wallNames = ['先锋墙', '抱石墙', '速度墙'];
    const walls: Wall[] = [];

    for (const name of wallNames) {
      const existing = await this.wallRepository.findOne({
        where: { gym_id: gymId, name },
      });
      if (existing) {
        walls.push(existing);
        continue;
      }

      const wall = new Wall();
      wall.gym_id = gymId;
      wall.name = name;
      wall.polygon_coords = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 200 },
        { x: 0, y: 200 },
      ];

      walls.push(await this.wallRepository.save(wall));
    }

    return walls;
  }

  private async createRoutes(walls: Wall[], setters: User[]): Promise<Route[]> {
    const routeTypes = [RouteType.LEAD, RouteType.BOULDER, RouteType.TOP_ROPE, RouteType.SPEED];
    const grades = ['5.9', '5.10a', '5.10b', '5.10c', '5.10d', '5.11a', '5.11b', '5.11c', '5.11d', '5.12a', 'V1', 'V2', 'V3', 'V4', 'V5'];
    const colors = ['红色', '蓝色', '绿色', '黄色', '黑色', '白色', '粉色', '紫色', '橙色'];
    const routes: Route[] = [];

    for (let i = 1; i <= 15; i++) {
      const wallIndex = (i - 1) % walls.length;
      const wall = walls[wallIndex];
      const setter = setters[i % setters.length];

      const routeName = `线路${i}`;
      const existing = await this.routeRepository.findOne({
        where: { wall_id: wall.id, name: routeName },
      });
      if (existing) {
        routes.push(existing);
        continue;
      }

      const route = new Route();
      route.wall_id = wall.id;
      route.name = routeName;
      route.type = routeTypes[i % routeTypes.length];
      route.grade = grades[i % grades.length];
      route.color = colors[i % colors.length];
      route.setter_id = setter.id;
      route.status = RouteStatus.OPEN;
      route.tags = ['新手友好', '技术线', '力量线', '平衡线', '耐力线'].slice(0, (i % 3) + 1);
      route.length = 10 + Math.floor(Math.random() * 20);
      route.open_date = new Date();

      const saved = await this.routeRepository.save(route);
      routes.push(saved);
    }

    return routes;
  }

  private async createHolds(routes: Route[]): Promise<void> {
    for (const route of routes) {
      const existingCount = await this.holdRepository.count({
        where: { route_id: route.id },
      });
      if (existingCount > 0) continue;

      const holdCount = 5 + Math.floor(Math.random() * 10);
      const holds: Hold[] = [];

      for (let i = 0; i < holdCount; i++) {
        const hold = new Hold();
        hold.route_id = route.id;
        hold.position_x = 10 + Math.random() * 80;
        hold.position_y = 10 + (i / holdCount) * 80 + Math.random() * 10;
        
        if (i === 0) {
          hold.type = HoldType.START;
        } else if (i === holdCount - 1) {
          hold.type = HoldType.END;
        } else {
          hold.type = Math.random() > 0.7 ? HoldType.FOOT : HoldType.HAND;
        }

        holds.push(hold);
      }

      await this.holdRepository.save(holds);
    }
  }

  private async createAscents(climbers: User[], routes: Route[]): Promise<void> {
    const ascentTypes = [AscentType.FLASH, AscentType.REDPOINT, AscentType.ONSIGHT, AscentType.HIGH_POINT, AscentType.FALL];

    for (const climber of climbers) {
      const existingCount = await this.ascentRepository.count({
        where: { user_id: climber.id },
      });
      if (existingCount > 0) continue;

      const ascentCount = 3 + Math.floor(Math.random() * 8);
      const selectedRoutes = this.shuffleArray([...routes]).slice(0, ascentCount);

      for (let i = 0; i < selectedRoutes.length; i++) {
        const route = selectedRoutes[i];
        const ascent = new Ascent();
        ascent.route_id = route.id;
        ascent.user_id = climber.id;
        ascent.ascent_type = ascentTypes[Math.floor(Math.random() * ascentTypes.length)];
        ascent.attempts = 1 + Math.floor(Math.random() * 5);
        ascent.felt_grade = route.grade;
        ascent.visibility = i % 2 === 0 ? AscentVisibility.PUBLIC : AscentVisibility.PRIVATE;
        if (i % 3 === 0) {
          ascent.notes = '很棒的线路！';
        }

        await this.ascentRepository.save(ascent);
      }
    }
  }

  private async createGradeVotes(climbers: User[], routes: Route[]): Promise<void> {
    const gradeVariations = ['+', '', '-'];

    for (const route of routes) {
      const existingCount = await this.gradeVoteRepository.count({
        where: { route_id: route.id },
      });
      if (existingCount > 0) continue;

      const voteCount = 2 + Math.floor(Math.random() * 4);
      const selectedClimbers = this.shuffleArray([...climbers]).slice(0, voteCount);

      for (const climber of selectedClimbers) {
        const vote = new GradeVote();
        vote.route_id = route.id;
        vote.user_id = climber.id;
        const variation = gradeVariations[Math.floor(Math.random() * gradeVariations.length)];
        vote.suggested_grade = route.grade + variation;

        await this.gradeVoteRepository.save(vote);
      }
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
