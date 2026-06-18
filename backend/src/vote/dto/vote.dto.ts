import { IsString, Length } from 'class-validator';

export class VoteDto {
  @IsString()
  @Length(1, 20)
  suggested_grade: string;
}
