import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { FirebaseAdminService } from './firebase-admin.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class AuthModule {}