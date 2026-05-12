import { IsString, IsOptional, IsEnum, MinLength, MaxLength, IsInt, Min, IsBoolean } from 'class-validator';
import { LessonType } from '@prisma/client';

export class UpsertLessonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @IsEnum(LessonType)
  type: LessonType;

  @IsInt()
  @Min(0)
  position: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSec?: number;

  // Conteúdo Markdown se type=TEXT
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  content?: string;

  // Storage key (R2) se type=VIDEO ou PDF — preenchido após upload
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storageKey?: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}
