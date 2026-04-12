import { Module } from '@nestjs/common';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Module({
  providers: [VulnerabilitiesService],
  exports: [VulnerabilitiesService],
})
export class VulnerabilitiesModule {}
