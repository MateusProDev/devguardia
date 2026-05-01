import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../modules/auth/firebase-admin.service';
import { UsersService } from '../../modules/users/users.service';
import { LocalCacheService } from '../cache/local-cache.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 segundos em milissegundos

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly usersService: UsersService,
    private readonly cache: LocalCacheService,
  ) {}

  private getCacheKey(uid: string): string {
    return `auth:user:${uid}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = await this.firebaseAdmin.verifyToken(token);

      // Tentar buscar do cache local
      const cacheKey = this.getCacheKey(decoded.uid);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        request.user = cached;
        return true;
      }

      const user = await this.usersService.findOrCreate({
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        displayName: decoded.name || null,
      });
      
      // Salvar no cache local
      this.cache.set(cacheKey, user, this.CACHE_TTL_MS);
      
      request.user = user;
      return true;
    } catch (err) {
      console.error('[Auth Guard] Token verification failed:', err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
