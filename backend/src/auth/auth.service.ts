import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { phone, email, password, name } = registerDto;

    if (!phone && !email) {
      throw new BadRequestException('手机号或邮箱至少需要提供一个');
    }

    if (phone) {
      const existingUserByPhone = await this.userRepository.findOne({
        where: { phone },
      });
      if (existingUserByPhone) {
        throw new BadRequestException('手机号已被注册');
      }
    }

    if (email) {
      const existingUserByEmail = await this.userRepository.findOne({
        where: { email },
      });
      if (existingUserByEmail) {
        throw new BadRequestException('邮箱已被注册');
      }
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = new User();
    user.phone = (phone || null) as string;
    user.email = (email || null) as string;
    user.password_hash = passwordHash;
    user.name = name;
    user.role = UserRole.GUEST;

    const savedUser = await this.userRepository.save(user);

    const tokens = await this.generateTokens(savedUser.id);

    return {
      user: this.sanitizeUser(savedUser),
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { phone, email, password } = loginDto;

    if (!phone && !email) {
      throw new BadRequestException('手机号或邮箱至少需要提供一个');
    }

    let user: User | null = null;

    if (phone) {
      user = await this.userRepository.findOne({ where: { phone } });
    } else if (email) {
      user = await this.userRepository.findOne({ where: { email } });
    }

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const tokens = await this.generateTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET || 'default_secret_key',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      const tokens = await this.generateTokens(user.id);

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('无效的刷新令牌');
    }
  }

  async logout() {
    return { message: '登出成功' };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: number, updateData: Partial<User>) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const allowedFields = ['name', 'phone', 'email', 'avatar', 'bio'];
    for (const field of allowedFields) {
      if (updateData[field as keyof User] !== undefined) {
        (user as any)[field] = updateData[field as keyof User];
      }
    }

    const savedUser = await this.userRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  private async generateTokens(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, type: 'access', role: user?.role, gym_id: user?.gym_id },
        { expiresIn: '2h' },
      ),
      this.jwtService.signAsync(
        { sub: userId, type: 'refresh', role: user?.role, gym_id: user?.gym_id },
        { expiresIn: '7d' },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private sanitizeUser(user: User) {
    const { password_hash, ...result } = user;
    return result;
  }
}
