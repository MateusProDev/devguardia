import { IsUrl, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateScanDto {
  @IsUrl({ require_protocol: true }, { message: 'URL inválida. Informe uma URL completa com https://' })
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}
