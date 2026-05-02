import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_LIMITS, PlanName } from '../../common/config/limits.config';

interface FindOrCreateDto {
  firebaseUid: string;
  email: string;
  displayName: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(dto: FindOrCreateDto) {
    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: dto.firebaseUid },
      include: { subscription: true },
    });

    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        firebaseUid: dto.firebaseUid,
        email: dto.email,
        displayName: dto.displayName,
        acceptedTerms: true,
        acceptedTermsAt: new Date(),
      },
      include: { subscription: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    });
  }

  private subCache = new Map<string, { active: boolean; expiresAt: number }>();
  private readonly SUB_CACHE_TTL = 30_000;

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const cached = this.subCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) return cached.active;

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    const active = sub ? sub.active && sub.expiresAt > new Date() : false;
    this.subCache.set(userId, { active, expiresAt: Date.now() + this.SUB_CACHE_TTL });

    // Periodic cleanup
    if (this.subCache.size > 2000) {
      const now = Date.now();
      for (const [k, v] of this.subCache) {
        if (v.expiresAt < now) this.subCache.delete(k);
      }
    }

    return active;
  }

  async getScansToday(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.prisma.scan.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
      },
    });
  }

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub) return { active: false, plan: 'FREE' as const };
    const active = sub.active && sub.expiresAt > new Date();
    return {
      active,
      plan: active ? (sub.plan as PlanName) : ('FREE' as const),
      expiresAt: sub.expiresAt,
    };
  }

  async getActivePlan(userId: string): Promise<PlanName> {
    const sub = await this.getSubscription(userId);
    return sub.active ? (sub.plan as PlanName) : 'FREE';
  }

  async getPlanLimits(userId: string) {
    const plan = await this.getActivePlan(userId);
    return { plan, limits: PLAN_LIMITS[plan] || PLAN_LIMITS.FREE };
  }

  async getScansThisMonth(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return this.prisma.scan.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });
  }
}
