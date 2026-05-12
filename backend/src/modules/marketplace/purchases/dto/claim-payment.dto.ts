import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class ClaimPaymentDto {
  /**
   * TX hash do pagamento (XMR) ou ID/comprovante PIX.
   * Opcional — comprador pode só clicar "paguei" sem fornecer prova.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  txReference?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  proofUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
