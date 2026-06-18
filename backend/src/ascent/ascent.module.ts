import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ascent } from '../entities/ascent.entity';
import { AscentService } from './ascent.service';
import { AscentController } from './ascent.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ascent])],
  controllers: [AscentController],
  providers: [AscentService],
  exports: [AscentService],
})
export class AscentModule {}
