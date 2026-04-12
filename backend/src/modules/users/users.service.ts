import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub) return false;
    return sub.active && sub.expiresAt > new Date();
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
    if (!sub) return { active: false };
    return {
      active: sub.active && sub.expiresAt > new Date(),
      expiresAt: sub.expiresAt,
    };
  }
}
