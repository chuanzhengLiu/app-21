import { IsNumber, IsEnum } from 'class-validator';
import { HoldType } from '../../entities/hold.entity';

export class CreateHoldDto {
  @IsNumber()
  position_x: number;

  @IsNumber()
  position_y: number;

  @IsEnum(HoldType)
  type: HoldType;
}
