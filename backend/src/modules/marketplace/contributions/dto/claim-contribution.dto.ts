import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class ClaimContributionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  txReference?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(500)
  proofUrl?: string;
}
