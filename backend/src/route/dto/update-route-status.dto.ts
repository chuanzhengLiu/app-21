import { IsEnum } from 'class-validator';
import { RouteStatus } from '../../entities/route.entity';

export class UpdateRouteStatusDto {
  @IsEnum(RouteStatus)
  status: RouteStatus;
}
