import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hold } from '../entities/hold.entity';
import { HoldService } from './hold.service';
import { HoldController } from './hold.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Hold])],
  controllers: [HoldController],
  providers: [HoldService],
  exports: [HoldService],
})
export class HoldModule {}
