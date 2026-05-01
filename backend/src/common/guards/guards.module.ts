import { Global, Module } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseAdminService } from '../../modules/auth/firebase-admin.service';
import { UsersModule } from '../../modules/users/users.module';
import { LocalCacheService } from '../cache/local-cache.service';

@Global()
@Module({
  imports: [UsersModule],
  providers: [FirebaseAdminService, FirebaseAuthGuard, LocalCacheService],
  exports: [FirebaseAdminService, FirebaseAuthGuard, LocalCacheService],
})
export class GuardsModule {}
