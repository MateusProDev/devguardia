import { Injectable, OnModuleInit, Logger, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);

  onModuleInit() {
    if (admin.apps.length === 0) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
          }),
        });
        this.logger.log('Firebase Admin initialized');
      } catch (err) {
        this.logger.error('Failed to initialize Firebase Admin', err);
        throw new Error('Firebase Admin initialization failed');
      }
    }
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decoded = await admin.auth().verifyIdToken(token, true); // true = check revoked
      return decoded;
    } catch (err: any) {
      this.logger.warn(`Token verification failed: ${err.code || err.message}`);
      if (err.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Token expirado');
      }
      if (err.code === 'auth/id-token-revoked') {
        throw new UnauthorizedException('Token revogado');
      }
      if (err.code === 'auth/invalid-id-token') {
        throw new UnauthorizedException('Token inválido');
      }
      throw new UnauthorizedException('Falha na autenticação');
    }
  }
}
