import { IsUrl, IsNotEmpty, MaxLength, IsBoolean } from 'class-validator';

export class CreateScanDto {
  @IsUrl({ require_protocol: true }, { message: 'URL inválida. Informe uma URL completa com https://' })
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;

  @IsBoolean({ message: 'É obrigatório aceitar os termos de responsabilidade.' })
  @IsNotEmpty({ message: 'É obrigatório aceitar os termos de responsabilidade.' })
  acceptedTerms: boolean;
}
