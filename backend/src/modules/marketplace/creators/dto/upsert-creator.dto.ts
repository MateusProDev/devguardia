import { IsString, IsOptional, MinLength, MaxLength, Matches, IsBoolean, IsUrl } from 'class-validator';

export class UpsertCreatorDto {
  @IsString()
  @MinLength(3, { message: 'Slug deve ter no mínimo 3 caracteres' })
  @MaxLength(40)
  @Matches(/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/, {
    message: 'Slug pode conter apenas letras minúsculas, números, hífen e underline',
  })
  slug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] }, { message: 'avatarUrl deve ser HTTPS' })
  @MaxLength(500)
  avatarUrl?: string;

  @IsBoolean()
  acceptedMarketplaceTerms: boolean;
}
