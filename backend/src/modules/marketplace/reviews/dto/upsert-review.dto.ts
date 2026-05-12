import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
