import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateHoldDto } from './create-hold.dto';

export class BatchCreateHoldDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHoldDto)
  holds: CreateHoldDto[];
}
