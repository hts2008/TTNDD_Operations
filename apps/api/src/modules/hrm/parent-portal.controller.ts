import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators';
import { PrismaService } from '../../core/database';
import { AuditService } from '../../core/audit';
import { MemberValidationService } from './member-validation.service';

/**
 * T-1013: Parent Portal API
 *
 * Provides read-only access for guardian users to view their linked children's
 * status, compliance, and data access logs (COPPA requirement).
 */
@ApiTags('HRM — Parent Portal')
@ApiBearerAuth()
@Controller('hrm/parent-portal')
export class ParentPortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly validation: MemberValidationService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'T-1013: Parent portal dashboard — linked children + compliance + access logs',
  })
  async getDashboard(@CurrentUser() user: CurrentUserPayload) {
    // 1. Find all GuardianLinks where the guardian's user email/phone matches
    //    (Guardian users are linked by their contact info, not userId)
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, phone: true },
    });

    if (!currentUser) {
      return { children: [], accessLogs: [] };
    }

    // Find guardian links matching this user's email or phone
    const guardianLinks = await this.prisma.guardianLink.findMany({
      where: {
        orgId: user.orgId,
        OR: [
          ...(currentUser.email ? [{ email: currentUser.email }] : []),
          ...(currentUser.phone ? [{ phone: currentUser.phone }] : []),
        ],
      },
      select: { orgMemberId: true },
    });

    if (guardianLinks.length === 0) {
      // Also check if user has a linked member (parent role)
      const linkedMembers = await this.prisma.orgMember.findMany({
        where: {
          orgId: user.orgId,
          userId: user.userId,
          role: { in: ['parent', 'guardian'] },
        },
        include: {
          linkedBy: {
            select: { id: true },
          },
        },
      });

      if (linkedMembers.length === 0) {
        return { children: [], accessLogs: [] };
      }
    }

    const memberIds = guardianLinks.map((g) => g.orgMemberId);

    // 2. Fetch children details
    const children = await this.prisma.orgMember.findMany({
      where: {
        orgId: user.orgId,
        id: { in: memberIds },
      },
      include: {
        profile: { select: { fullName: true } },
        branch: { select: { name: true } },
        unit: { select: { name: true } },
      },
    });

    // 3. Check compliance for each child
    const childrenWithCompliance = await Promise.all(
      children.map(async (child) => {
        const compliance = await this.validation.checkCompliance(user.orgId, child.id);
        return {
          id: child.id,
          memberCode: child.memberCode,
          scoutName: child.scoutName,
          status: child.status,
          profile: child.profile ? { fullName: child.profile.fullName } : null,
          branch: child.branch ? { name: child.branch.name } : null,
          unit: child.unit ? { name: child.unit.name } : null,
          compliance,
        };
      }),
    );

    // 4. Fetch data access logs for COPPA compliance
    const accessLogs = await this.prisma.auditLog.findMany({
      where: {
        orgId: user.orgId,
        resource: { in: ['OrgMember', 'MemberProfile', 'GuardianLink'] },
        resourceId: { in: memberIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        action: true,
        resource: true,
        createdAt: true,
      },
    });

    // 5. Log this parent portal access (COPPA audit trail)
    await this.audit.log({
      orgId: user.orgId,
      userId: user.userId,
      action: 'parent_portal.dashboard_viewed',
      resource: 'ParentPortal',
      resourceId: user.userId,
      newValue: { childrenViewed: memberIds.length },
    });

    return {
      children: childrenWithCompliance,
      accessLogs: accessLogs.map((log) => ({
        timestamp: log.createdAt.toISOString(),
        action: log.action,
        resource: log.resource,
      })),
    };
  }
}
