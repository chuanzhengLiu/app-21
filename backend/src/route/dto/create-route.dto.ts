import {
  IsString,
  IsOptional,
  Length,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { RouteType, RouteStatus } from '../../entities/route.entity';

export class CreateRouteDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsEnum(RouteType)
  type: RouteType;

  @IsOptional()
  @IsObject()
  path_coords?: object;

  @IsString()
  @Length(1, 20)
  grade: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  color?: string;

  @IsOptional()
  @IsNumber()
  setter_id?: number;

  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsDateString()
  open_date?: string;

  @IsOptional()
  @IsDateString()
  planned_remove_date?: string;
}
