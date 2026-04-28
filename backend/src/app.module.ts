import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { GuardsModule } from './common/guards/guards.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ScansModule } from './modules/scans/scans.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { QueueModule } from './modules/queue/queue.module';
import { AiModule } from './modules/ai/ai.module';
import { VulnerabilitiesModule } from './modules/vulnerabilities/vulnerabilities.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 5 },
      { name: 'long', ttl: 60000, limit: 60 },
    ]),
    PrismaModule,
    GuardsModule,
    AuthModule,
    UsersModule,
    ScansModule,
    PaymentsModule,
    ReportsModule,
    QueueModule,
    AiModule,
    VulnerabilitiesModule,
    AdminModule,
    HealthModule,
    CleanupModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
