import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database';
import { ExpService } from './exp.service';

@Injectable()
export class RewardShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expService: ExpService,
  ) {}

  async getItems(orgId: string) {
    return this.prisma.rewardItem.findMany({
      where: { orgId, isActive: true },
      orderBy: { costExp: 'asc' },
    });
  }

  async createItem(orgId: string, data: { name: string; description?: string; costExp: number; category?: string; imageUrl?: string; quantityAvailable?: number; validUntil?: string }) {
    return this.prisma.rewardItem.create({
      data: {
        orgId,
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    });
  }

  async redeem(orgId: string, memberId: string, rewardId: string) {
    const item = await this.prisma.rewardItem.findFirst({ where: { id: rewardId, orgId, isActive: true } });
    if (!item) throw new NotFoundException('Reward item not found or inactive');

    if (item.quantityAvailable !== -1 && item.quantityAvailable <= 0) {
      throw new BadRequestException('Item out of stock');
    }
    if (item.validUntil && new Date() > item.validUntil) {
      throw new BadRequestException('Item expired');
    }

    const summary = await this.expService.getSummary(orgId, memberId);
    if (summary.availableExp < item.costExp) {
      throw new BadRequestException(`Insufficient EXP: has ${summary.availableExp}, need ${item.costExp}`);
    }

    const [redemption] = await this.prisma.$transaction([
      this.prisma.rewardRedemption.create({
        data: { orgId, orgMemberId: memberId, rewardId, expSpent: item.costExp, status: 'pending' },
      }),
      ...(item.quantityAvailable !== -1
        ? [this.prisma.rewardItem.update({ where: { id: rewardId }, data: { quantityAvailable: { decrement: 1 } } })]
        : []),
    ]);

    await this.expService.deductExp(orgId, memberId, item.costExp, `Redeem: ${item.name}`, memberId);

    return redemption;
  }

  async approveRedemption(orgId: string, redemptionId: string, approvedBy: string) {
    return this.prisma.rewardRedemption.update({
      where: { id: redemptionId },
      data: { status: 'approved', approvedBy },
    });
  }

  async getMyRedemptions(orgId: string, memberId: string) {
    return this.prisma.rewardRedemption.findMany({
      where: { orgId, orgMemberId: memberId },
      include: { reward: true },
      orderBy: { redeemedAt: 'desc' },
    });
  }
}
