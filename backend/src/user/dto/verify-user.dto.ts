import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VerifyUserDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
