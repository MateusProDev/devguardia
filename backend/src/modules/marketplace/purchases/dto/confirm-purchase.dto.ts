import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmPurchaseDto {
  /** Nota interna do vendedor (txid recebido, número da transação no banco, etc.) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
