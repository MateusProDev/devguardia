import { Global, Module } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseAdminService } from '../../modules/auth/firebase-admin.service';
import { UsersModule } from '../../modules/users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [FirebaseAdminService, FirebaseAuthGuard],
  exports: [FirebaseAdminService, FirebaseAuthGuard],
})
export class GuardsModule {}
