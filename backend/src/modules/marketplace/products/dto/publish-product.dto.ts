import { IsBoolean } from 'class-validator';

export class PublishProductDto {
  @IsBoolean()
  publish: boolean; // true = PUBLISH, false = ARCHIVE
}
