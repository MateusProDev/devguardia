import { IsEnum, IsOptional, IsString, IsNotEmpty, Matches } from 'class-validator';

export enum PaymentType {
  SINGLE_SCAN = 'SINGLE_SCAN',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export class CreatePixPaymentDto {
  @IsEnum(PaymentType)
  type: PaymentType;

  @IsOptional()
  @IsString()
  scanId?: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' })
  cpf: string;
}
