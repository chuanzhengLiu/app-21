import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wall } from '../entities/wall.entity';
import { WallService } from './wall.service';
import { WallController } from './wall.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wall])],
  controllers: [WallController],
  providers: [WallService],
  exports: [WallService],
})
export class WallModule {}
