import { IsString, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePurchaseDto {
  @IsString()
  productId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
