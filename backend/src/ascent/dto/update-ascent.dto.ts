import { PartialType } from '@nestjs/mapped-types';
import { CreateAscentDto } from './create-ascent.dto';

export class UpdateAscentDto extends PartialType(CreateAscentDto) {}
