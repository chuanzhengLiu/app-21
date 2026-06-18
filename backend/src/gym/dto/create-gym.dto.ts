import { IsString, IsNumber, IsOptional, Length } from 'class-validator';

export class CreateGymDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  address?: string;

  @IsOptional()
  @IsNumber()
  area_sqm?: number;

  @IsNumber()
  admin_id: number;
}
