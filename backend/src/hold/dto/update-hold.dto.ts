import { PartialType } from '@nestjs/mapped-types';
import { CreateHoldDto } from './create-hold.dto';

export class UpdateHoldDto extends PartialType(CreateHoldDto) {}
