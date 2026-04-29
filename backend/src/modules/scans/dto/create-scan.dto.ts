import { IsUrl, IsNotEmpty, MaxLength, IsBoolean, Matches } from 'class-validator';

export class CreateScanDto {
  @IsUrl({ 
    require_protocol: true,
    protocols: ['http', 'https'],
  }, { message: 'URL inválida. Informe uma URL completa com http:// ou https://' })
  @IsNotEmpty()
  @MaxLength(2048)
  @Matches(/^[^<>{}\\]*$/, { message: 'URL contém caracteres inválidos' })
  url: string;

  @IsBoolean({ message: 'É obrigatório aceitar os termos de responsabilidade.' })
  @IsNotEmpty({ message: 'É obrigatório aceitar os termos de responsabilidade.' })
  acceptedTerms: boolean;
}
