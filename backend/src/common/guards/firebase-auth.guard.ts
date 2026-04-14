import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { FirebaseAdminService } from '../../modules/auth/firebase-admin.service';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private userCache = new Map<string, { user: any; expiresAt: number }>();
  private readonly CACHE_TTL = 60 * 1000;
  private readonly MAX_CACHE_SIZE = 5000;

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {}

  private cleanCache() {
    const now = Date.now();
    for (const [key, val] of this.userCache) {
      if (val.expiresAt < now) this.userCache.delete(key);
    }
    if (this.userCache.size > this.MAX_CACHE_SIZE) {
      const oldest = [...this.userCache.entries()]
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
        .slice(0, 1000);
      oldest.forEach(([k]) => this.userCache.delete(k));
    }
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

      const cached = this.userCache.get(decoded.uid);
      if (cached && cached.expiresAt > Date.now()) {
        request.user = cached.user;
        return true;
      }

      const user = await this.usersService.findOrCreate({
        firebaseUid: decoded.uid,
        email: decoded.email || '',
        displayName: decoded.name || null,
      });
      this.userCache.set(decoded.uid, { user, expiresAt: Date.now() + this.CACHE_TTL });
      if (Math.random() < 0.05) this.cleanCache();
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
