# T-0918: Seed & Demo Data Pack — AI Agent Reference

> **Purpose:** AI agents can generate proper seed scripts for dev/staging/demo environments
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.4 / M9.4**

---

## Current Seed Status

| Item | Status | Notes |
|------|--------|-------|
| `prisma/seed.ts` | ⚠️ NOT FOUND | No seed script exists yet |
| `package.json prisma.seed` | ⚠️ NOT CONFIGURED | Missing seed entry |
| Demo data fixtures | ⚠️ NOT FOUND | No fixture files |

---

## Required Seed Data per Module (from `module-readiness.yaml`)

| Priority | Seed Pack | Module | Data Required |
|----------|-----------|--------|---------------|
| 🔴 P0 | `org_demo_structure` | Core | 1 Org + 3 Branches (Sói, Kha, Tráng) + 2 Units each |
| 🔴 P0 | `members_minimal` | HRM | 5 members (1 admin, 2 truong, 2 scouts) + profiles |
| 🟡 P1 | `scout_program_minimal` | Scout 8A | 1 ProgramVersion + 3 Domains + 6 SkillGroups + 12 Skills |
| 🟡 P1 | `skills_minimal` | Scout 8A | Criteria for each skill |
| 🟡 P1 | `sessions_sample` | Sessions 8B | 3 sessions (planned/active/completed) + attendance |
| 🟡 P1 | `events_sample` | Events 8C | 2 events (upcoming/completed) + registrations |
| 🟡 P1 | `rewards_config_minimal` | Rewards 9 | ExpConfig + 3 BadgeDefinitions + 2 RewardItems |
| 🟢 P2 | `course_demo` | LMS 7 | 1 Course + 3 Lessons + 1 Quiz + 3 Questions |
| 🟢 P2 | `plan_template_demo` | Projects 2 | 1 Plan + 1 Project + 2 Phases + 4 Tasks |
| 🟢 P2 | `finance_accounts_demo` | Finance 4 | 2 Accounts + 1 FeePlan + sample transactions |
| 🟢 P2 | `assets_demo` | Assets 5 | 3 Categories + 5 Assets + 1 KitTemplate |
| 🟢 P2 | `notification_templates` | Notifications | 10 templates (welcome, attend, verify, etc.) |

---

## Seed Script Template

```typescript
// prisma/seed.ts — Template for AI Agents
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ── P0: Organization ──
  const org = await prisma.organization.upsert({
    where: { slug: 'dtndd-demo' },
    update: {},
    create: {
      slug: 'dtndd-demo',
      name: 'DTNDD Demo',
      fullName: 'Đoàn Thanh Thiếu Niên Đại Đạo - Demo',
      settings: {},
      subscriptionPlan: 'premium',
      isActive: true,
    },
  });

  // ── P0: Branches (Sói, Kha, Tráng) ──
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: 'SOI' } },
      update: {},
      create: { orgId: org.id, code: 'SOI', name: 'Đoàn Sói', minAge: 7, maxAge: 11, colorTheme: 'yellow', narrativeName: 'Bầy Sói' },
    }),
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: 'KHA' } },
      update: {},
      create: { orgId: org.id, code: 'KHA', name: 'Đoàn Kha', minAge: 12, maxAge: 15, colorTheme: 'green', narrativeName: 'Đoàn Kha' },
    }),
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: 'TRANG' } },
      update: {},
      create: { orgId: org.id, code: 'TRANG', name: 'Đoàn Tráng', minAge: 16, maxAge: 25, colorTheme: 'red', narrativeName: 'Đoàn Tráng' },
    }),
  ]);

  // ── P0: Admin User + Members ──
  const adminUser = await prisma.user.upsert({
    where: { firebaseUid: 'demo-admin-001' },
    update: {},
    create: { firebaseUid: 'demo-admin-001', email: 'admin@dtndd-demo.org', displayName: 'Trưởng Admin Demo' },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: adminUser.id } },
    update: {},
    create: { orgId: org.id, userId: adminUser.id, role: 'admin', branchId: branches[1].id, status: 'active' },
  });

  console.log('✅ Seed complete:', { org: org.slug, branches: branches.length });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
```

### package.json Addition
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"commonjs\"} prisma/seed.ts"
  }
}
```

---

## Demo Data Rules for AI Agents

1. **Always use `upsert()`** — seed must be idempotent (re-runnable)
2. **Use deterministic IDs** for cross-references (e.g., `org.id` → `branch.orgId`)
3. **Match unique constraints** — use `where` on unique fields
4. **Never seed production** — guard with `NODE_ENV` check
5. **Follow naming convention** — Vietnamese names for demo members
6. **Include all branches** — Sói/Kha/Tráng represent age groups
7. **Include realistic dates** — sessions in past/future, events spread across year
