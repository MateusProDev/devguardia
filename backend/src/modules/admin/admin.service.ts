import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicStats() {
    const [totalUsers, totalScans, totalVulnerabilities] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.scan.count(),
      this.prisma.vulnerability.count(),
    ]);
    return { users: totalUsers, scans: totalScans, vulnerabilities: totalVulnerabilities };
  }

  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      usersToday,
      usersThisMonth,
      totalScans,
      scansToday,
      scansThisMonth,
      totalVulnerabilities,
      totalPayments,
      revenueAll,
      revenueSingleScan,
      revenueSubscription,
      revenueThisMonth,
      revenueLastMonth,
      activeSubscriptions,
      scansByStatus,
      vulnsBySeverity,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.scan.count(),
      this.prisma.scan.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.scan.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.vulnerability.count(),
      this.prisma.payment.count({ where: { status: 'APPROVED' } }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', type: 'SINGLE_SCAN' }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', type: { in: ['SUBSCRIPTION_STARTER', 'SUBSCRIPTION_PRO', 'SUBSCRIPTION_ENTERPRISE'] } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { status: 'APPROVED', createdAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
      this.prisma.subscription.count({ where: { active: true, expiresAt: { gt: now } } }),
      this.prisma.scan.groupBy({ by: ['status'], _count: true }),
      this.prisma.vulnerability.groupBy({ by: ['severity'], _count: true }),
    ]);

    return {
      users: {
        total: totalUsers,
        today: usersToday,
        thisMonth: usersThisMonth,
      },
      scans: {
        total: totalScans,
        today: scansToday,
        thisMonth: scansThisMonth,
        byStatus: Object.fromEntries(scansByStatus.map((s) => [s.status, s._count])),
      },
      vulnerabilities: {
        total: totalVulnerabilities,
        bySeverity: Object.fromEntries(vulnsBySeverity.map((v) => [v.severity, v._count])),
      },
      revenue: {
        totalCents: revenueAll._sum.amount || 0,
        singleScanCents: revenueSingleScan._sum.amount || 0,
        subscriptionCents: revenueSubscription._sum.amount || 0,
        thisMonthCents: revenueThisMonth._sum.amount || 0,
        lastMonthCents: revenueLastMonth._sum.amount || 0,
        totalPayments,
        activeSubscriptions,
      },
    };
  }

  async getRecentUsers(limit = 20) {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        _count: { select: { scans: true, payments: true } },
        subscription: { select: { active: true, expiresAt: true } },
      },
    });
  }

  async getRecentScans(limit = 20) {
    return this.prisma.scan.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        url: true,
        status: true,
        score: true,
        createdAt: true,
        user: { select: { email: true } },
        _count: { select: { vulnerabilities: true } },
      },
    });
  }

  async getRecentPayments(limit = 20) {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });
  }

  async getAnalytics(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [pageViews, topPages, uniqueSessions] = await Promise.all([
      this.prisma.pageView.groupBy({
        by: ['path'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
      this.prisma.pageView.count({ where: { createdAt: { gte: since } } }),
      this.prisma.pageView.findMany({
        where: { createdAt: { gte: since } },
        distinct: ['sessionId'],
        select: { sessionId: true },
      }),
    ]);

    // Daily page views for chart
    const dailyViews = await this.prisma.$queryRawUnsafe(
      `SELECT DATE("createdAt") as date, COUNT(*) as count FROM "PageView" WHERE "createdAt" >= $1 GROUP BY DATE("createdAt") ORDER BY date ASC`,
      since,
    ) as { date: string; count: bigint }[];

    return {
      totalViews: topPages,
      uniqueSessions: uniqueSessions.length,
      topPages: pageViews.map((p) => ({ path: p.path, views: p._count })),
      dailyViews: dailyViews.map((d) => ({ date: String(d.date), views: Number(d.count) })),
    };
  }

  async trackPageView(data: { path: string; userId?: string; sessionId: string; referrer?: string; userAgent?: string }) {
    return this.prisma.pageView.create({ data });
  }
}
