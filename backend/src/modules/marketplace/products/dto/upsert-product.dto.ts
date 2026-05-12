import {
  IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches,
  IsInt, Min, Max, IsBoolean, IsUrl,
} from 'class-validator';
import { ProductType } from '@prisma/client';

export class UpsertProductDto {
  @IsEnum(ProductType)
  type: ProductType;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
    message: 'Slug pode conter apenas letras minúsculas, números e hífen',
  })
  slug: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  shortDescription?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(20000)
  description: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  coverImageUrl?: string;

  // Preço em piconero (1 XMR = 1e12). Como BigInt não passa pelo JSON nativo,
  // vem como string do client. Validação numérica feita no service.
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,20}$/, { message: 'priceXmrPiconero deve ser número inteiro positivo' })
  priceXmrPiconero?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99_999_999) // R$ 999_999,99
  pricePixBrlCents?: number;

  @IsBoolean()
  acceptsXmr: boolean;

  @IsBoolean()
  acceptsPix: boolean;
}
