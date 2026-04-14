import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';

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
}
