import { Controller, Get } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators';
import { PrismaService } from '../../core/database';
import { MemberValidationService } from './member-validation.service';

@ApiTags('HRM - Parent Portal')
@ApiBearerAuth()
@Controller('hrm/parent-portal')
export class ParentPortalController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: MemberValidationService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'T-1013: Parent portal dashboard - linked children, compliance, access logs',
  })
  async getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.prisma.withRLS(
      user.orgId,
      user.userId,
      user.role,
      async (db) => {
        const currentUser = await db.user.findUnique({
          where: { id: user.userId },
          select: { email: true, phone: true },
        });

        if (!currentUser) {
          await this.logDashboardAccess(db, user, []);
          return { children: [], accessLogs: [] };
        }

        const contactFilters = [
          ...(currentUser.email ? [{ email: currentUser.email }] : []),
          ...(currentUser.phone ? [{ phone: currentUser.phone }] : []),
        ];

        const [guardianLinks, linkedParentMembers] = await Promise.all([
          contactFilters.length > 0
            ? db.guardianLink.findMany({
                where: {
                  orgId: user.orgId,
                  OR: contactFilters,
                },
                select: { orgMemberId: true },
              })
            : Promise.resolve([]),
          db.orgMember.findMany({
            where: {
              orgId: user.orgId,
              userId: user.userId,
              role: { in: ['parent', 'guardian'] },
            },
            select: {
              linkedBy: {
                select: { id: true },
              },
            },
          }),
        ]);

        const memberIds = Array.from(
          new Set([
            ...guardianLinks.map((link) => link.orgMemberId),
            ...linkedParentMembers.flatMap((member) => member.linkedBy.map((child) => child.id)),
          ]),
        );

        if (memberIds.length === 0) {
          await this.logDashboardAccess(db, user, []);
          return { children: [], accessLogs: [] };
        }

        const children = await db.orgMember.findMany({
          where: {
            orgId: user.orgId,
            id: { in: memberIds },
          },
          select: {
            id: true,
            memberCode: true,
            scoutName: true,
            status: true,
            profile: { select: { fullName: true } },
            branch: { select: { name: true } },
            unit: { select: { name: true } },
            guardianLinks: {
              select: { consentSigned: true, isPrimary: true },
            },
          },
        });

        const childrenWithCompliance = await Promise.all(
          children.map(async (child) => {
            const [compliance, expSummary, badgesCount, attendance, courses] = await Promise.all([
              this.validation.checkCompliance(user.orgId, child.id, db),
              db.memberExpSummary.findFirst({
                where: { orgId: user.orgId, orgMemberId: child.id },
                select: { totalExp: true, availableExp: true, lastUpdated: true },
              }),
              db.memberBadge.count({
                where: { orgId: user.orgId, orgMemberId: child.id },
              }),
              db.sessionAttendance.groupBy({
                by: ['status'],
                where: { orgId: user.orgId, orgMemberId: child.id },
                _count: true,
              }),
              db.memberCourseProgress.findMany({
                where: { orgId: user.orgId, orgMemberId: child.id },
                include: {
                  course: {
                    select: { title: true, category: true, difficulty: true, expReward: true },
                  },
                },
                orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
                take: 4,
              }),
            ]);
            const attendanceSummary = attendance.reduce(
              (acc, entry) => {
                acc[entry.status] = entry._count;
                return acc;
              },
              {} as Record<string, number>,
            );
            const totalAttendance = Object.values(attendanceSummary).reduce(
              (sum, value) => sum + value,
              0,
            );
            const presentAttendance = attendanceSummary.present ?? 0;
            const signedGuardianLinks = child.guardianLinks.filter(
              (link) => link.consentSigned,
            ).length;
            return {
              id: child.id,
              memberCode: child.memberCode,
              scoutName: child.scoutName,
              status: child.status,
              profile: child.profile ? { fullName: child.profile.fullName } : null,
              branch: child.branch ? { name: child.branch.name } : null,
              unit: child.unit ? { name: child.unit.name } : null,
              compliance,
              journey: {
                exp: {
                  totalExp: expSummary?.totalExp ?? 0,
                  availableExp: expSummary?.availableExp ?? 0,
                  lastUpdated: expSummary?.lastUpdated?.toISOString() ?? null,
                },
                badgesCount,
                attendance: {
                  ...attendanceSummary,
                  total: totalAttendance,
                  presentRate:
                    totalAttendance > 0
                      ? Math.round((presentAttendance / totalAttendance) * 100)
                      : 0,
                },
                courses: courses.map((progress) => ({
                  id: progress.id,
                  status: progress.status,
                  progressPct: progress.progressPct,
                  completedAt: progress.completedAt?.toISOString() ?? null,
                  course: progress.course,
                })),
                guardianConsent: {
                  total: child.guardianLinks.length,
                  signed: signedGuardianLinks,
                  primarySigned: child.guardianLinks.some(
                    (link) => link.isPrimary && link.consentSigned,
                  ),
                },
                nextActions: [
                  ...(compliance.compliant
                    ? []
                    : [
                        {
                          type: 'compliance',
                          label: 'Lien he truong de hoan tat ho so/uy quyen con em.',
                          priority: 'high',
                        },
                      ]),
                  ...(signedGuardianLinks === 0
                    ? [
                        {
                          type: 'consent',
                          label: 'Kiem tra cac mau dong thuan can phu huynh ky.',
                          priority: 'high',
                        },
                      ]
                    : []),
                  ...(courses.some((progress) => progress.status !== 'completed')
                    ? [
                        {
                          type: 'course',
                          label: 'Dong vien con tiep tuc khoa hoc dang hoc.',
                          priority: 'medium',
                        },
                      ]
                    : []),
                ],
              },
            };
          }),
        );

        const accessLogs = await db.auditLog.findMany({
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

        await this.logDashboardAccess(db, user, memberIds);

        return {
          children: childrenWithCompliance,
          accessLogs: accessLogs.map((log) => ({
            timestamp: log.createdAt.toISOString(),
            action: log.action,
            resource: log.resource,
          })),
        };
      },
      user.memberId,
    );
  }

  private async logDashboardAccess(
    db: PrismaClient,
    user: CurrentUserPayload,
    memberIds: string[],
  ) {
    await db.auditLog.create({
      data: {
        orgId: user.orgId,
        userId: user.userId,
        action: 'parent_portal.dashboard_viewed',
        resource: 'ParentPortal',
        resourceId: user.userId,
        newValue: { childrenViewed: memberIds.length, childIds: memberIds },
      },
    });
  }
}
