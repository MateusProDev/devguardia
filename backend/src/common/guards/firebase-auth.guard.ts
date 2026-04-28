import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../modules/auth/firebase-admin.service';
import { UsersService } from '../../modules/users/users.service';
import Redis from 'ioredis';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly CACHE_TTL = 60; // segundos
  private readonly redis: Redis;

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {
    // Inicializar Redis connection
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: true } } : {}),
      });
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null,
      });
    }
  }

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

      // Tentar buscar do cache Redis
      const cacheKey = this.getCacheKey(decoded.uid);
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          request.user = parsed;
          return true;
        } catch {
          // Cache corrompido, continuar com lookup normal
        }
      }

      const user = await this.usersService.findOrCreate({
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        displayName: decoded.name || null,
      });
      
      // Salvar no cache Redis
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(user));
      
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
