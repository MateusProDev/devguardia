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
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {}

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
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
