import { PartialType } from '@nestjs/mapped-types';
import { CreateWallDto } from './create-wall.dto';

export class UpdateWallDto extends PartialType(CreateWallDto) {}
