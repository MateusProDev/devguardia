import { IsString, MinLength, MaxLength, IsInt, Min } from 'class-validator';

export class UpsertModuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsInt()
  @Min(0)
  position: number;
}
