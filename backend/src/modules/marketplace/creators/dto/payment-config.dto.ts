import { IsString, IsOptional, IsEnum, MaxLength, Matches, IsUrl } from 'class-validator';
import { PixKeyType } from '@prisma/client';

/**
 * Configuração de pagamento do criador.
 * Todos os campos são opcionais individualmente, mas pelo menos
 * uma das duas configs (XMR ou PIX) deve estar completa para que
 * o criador consiga publicar produtos.
 */
export class PaymentConfigDto {
  // ─── Monero ───────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(110)
  // Endereços Monero mainnet têm 95 chars (4...). Subaddresses 8.../ 9...
  @Matches(/^(4|8|9|5)[1-9A-HJ-NP-Za-km-z]{94,105}$/, {
    message: 'Endereço Monero inválido',
  })
  moneroMainAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  // View key é hex de 64 chars
  @Matches(/^[0-9a-fA-F]{64}$/, {
    message: 'View key Monero deve ser uma string hexadecimal de 64 caracteres',
  })
  moneroViewKey?: string;

  // ─── PIX ──────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(200)
  pixKey?: string;

  @IsOptional()
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  pixHolderName?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  pixQrCodeUrl?: string;
}
