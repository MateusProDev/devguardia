import { IsEnum } from 'class-validator';
import { ContributionTier, PaymentMethod } from '@prisma/client';

export class CreateContributionDto {
  @IsEnum(ContributionTier)
  tier: ContributionTier;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
