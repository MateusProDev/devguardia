import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  OnModuleDestroy,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../modules/auth/firebase-admin.service';
import { UsersService } from '../../modules/users/users.service';
import Redis from 'ioredis';

// Singleton Redis connection para evitar vazamento
let redisSingleton: Redis | null = null;

function getRedisConnection(): Redis {
  if (redisSingleton) return redisSingleton;
  
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisSingleton = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(redisUrl.startsWith('rediss://') ? { tls: { rejectUnauthorized: true } } : {}),
    });
  } else {
    redisSingleton = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
  }
  
  redisSingleton.on('error', (err) => console.error('[Redis Auth Guard] Error:', err.message));
  return redisSingleton;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate, OnModuleDestroy {
  private readonly CACHE_TTL = 60; // segundos
  private readonly redis: Redis;

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {
    this.redis = getRedisConnection();
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
    } catch (err) {
      console.error('[Auth Guard] Token verification failed:', err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async onModuleDestroy() {
    // Não fechar conexão singleton - compartilhada entre instâncias
  }
}
