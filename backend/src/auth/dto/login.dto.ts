import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsString()
  @MinLength(1)
  password: string;
}
