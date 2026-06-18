import { IsString, IsNumber, IsOptional, IsEnum, Length, Min } from 'class-validator';
import { AscentType } from '../../entities/ascent.entity';

export class CreateAscentDto {
  @IsNumber()
  route_id: number;

  @IsEnum(AscentType)
  ascent_type: AscentType;

  @IsNumber()
  @Min(1)
  attempts: number;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  felt_grade?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  video_url?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
