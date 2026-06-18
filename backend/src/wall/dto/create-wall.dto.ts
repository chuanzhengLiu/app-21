import { IsString, IsOptional, Length, IsObject } from 'class-validator';

export class CreateWallDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  photo_url?: string;

  @IsOptional()
  @IsObject()
  polygon_coords?: object;
}
