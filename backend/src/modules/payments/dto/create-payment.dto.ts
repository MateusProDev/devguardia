import { IsEnum, IsOptional, IsString, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';

export enum PaymentType {
  SINGLE_SCAN = 'SINGLE_SCAN',
  SUBSCRIPTION_STARTER = 'SUBSCRIPTION_STARTER',
  SUBSCRIPTION_PRO = 'SUBSCRIPTION_PRO',
  SUBSCRIPTION_ENTERPRISE = 'SUBSCRIPTION_ENTERPRISE',
}

export class CreatePaymentDto {
  @IsEnum(PaymentType)
  type: PaymentType;

  @IsOptional()
  @IsString()
  scanId?: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  installments: number;

  @IsOptional()
  @IsString()
  issuerId?: string;
}
