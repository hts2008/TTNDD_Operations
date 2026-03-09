/**
 * RLS Isolation Smoke Test (T-0030)
 *
 * Verifies that PostgreSQL Row-Level Security policies correctly
 * isolate data between organizations (tenants).
 *
 * IMPORTANT: This test connects as `ttndd_app` (non-superuser) because
 * `ttndd` is SUPERUSER and bypasses ALL RLS. The application runtime
 * must also connect as `ttndd_app` for RLS to work.
 *
 * Prerequisites:
 *   1. PostgreSQL running (docker compose up -d postgres)
 *   2. Prisma migrations applied (prisma migrate deploy)
 *   3. RLS policies applied (psql -f prisma/rls-policies.sql)
 *      This also creates the ttndd_app user.
 *
 * Run: npx jest --config test/jest-e2e.json test/rls-isolation.e2e-spec.ts --runInBand
 */
import { PrismaClient } from '@prisma/client';

// Superuser client for seeding (bypasses RLS)
const SUPERUSER_URL = 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
// App user client for testing (subject to RLS)
const APP_USER_URL = 'postgresql://ttndd_app:ttndd_local@localhost:5432/ttndd_ops';

describe('RLS Isolation — Cross-Tenant Data Visibility', () => {
  let seedPrisma: PrismaClient; // Superuser — for seeding/cleanup
  let appPrisma: PrismaClient; // App user — for RLS tests

  const ORG_A_ID = '00000000-0000-0000-0000-000000000001';
  const ORG_B_ID = '00000000-0000-0000-0000-000000000002';
  const USER_A_ID = '00000000-0000-0000-0000-00000000000a';
  const USER_B_ID = '00000000-0000-0000-0000-00000000000b';

  beforeAll(async () => {
    seedPrisma = new PrismaClient({ datasources: { db: { url: SUPERUSER_URL } } });
    appPrisma = new PrismaClient({ datasources: { db: { url: APP_USER_URL } } });
    await seedPrisma.$connect();
    await appPrisma.$connect();

    // Clean up using superuser (bypasses RLS)
    await seedPrisma.$executeRawUnsafe(
      `DELETE FROM branches WHERE org_id IN ($1::uuid, $2::uuid)`,
      ORG_A_ID,
      ORG_B_ID,
    );
    await seedPrisma.$executeRawUnsafe(
      `DELETE FROM org_members WHERE org_id IN ($1::uuid, $2::uuid)`,
      ORG_A_ID,
      ORG_B_ID,
    );
    await seedPrisma.$executeRawUnsafe(
      `DELETE FROM organizations WHERE id IN ($1::uuid, $2::uuid)`,
      ORG_A_ID,
      ORG_B_ID,
    );
    await seedPrisma.$executeRawUnsafe(
      `DELETE FROM users WHERE id IN ($1::uuid, $2::uuid)`,
      USER_A_ID,
      USER_B_ID,
    );

    // Seed using superuser (bypasses RLS)
    await seedPrisma.$executeRawUnsafe(
      `
      INSERT INTO organizations (id, slug, name, settings) VALUES
        ($1::uuid, 'test-org-a', 'Test Org A', '{}'),
        ($2::uuid, 'test-org-b', 'Test Org B', '{}')
      ON CONFLICT (id) DO NOTHING
    `,
      ORG_A_ID,
      ORG_B_ID,
    );

    await seedPrisma.$executeRawUnsafe(
      `
      INSERT INTO users (id, firebase_uid, email, display_name) VALUES
        ($1::uuid, 'firebase-test-a', 'a@test.local', 'User A'),
        ($2::uuid, 'firebase-test-b', 'b@test.local', 'User B')
      ON CONFLICT (id) DO NOTHING
    `,
      USER_A_ID,
      USER_B_ID,
    );

    // Create branches using superuser (bypasses RLS)
    await seedPrisma.$executeRawUnsafe(
      `
      INSERT INTO branches (id, org_id, code, name) VALUES
        (gen_random_uuid(), $1::uuid, 'oanh-a', 'Oanh Vũ Test A'),
        (gen_random_uuid(), $2::uuid, 'oanh-b', 'Oanh Vũ Test B')
      ON CONFLICT DO NOTHING
    `,
      ORG_A_ID,
      ORG_B_ID,
    );
  });

  afterAll(async () => {
    // Cleanup using superuser
    await seedPrisma.$executeRawUnsafe(
      `DELETE FROM branches WHERE org_id IN ($1::uuid, $2::uuid)`,
      ORG_A_ID,
      ORG_B_ID,
    );
    await seedPrisma.$executeRawUnsafe(
      `DELETE FROM organizations WHERE id IN ($1::uuid, $2::uuid)`,
      ORG_A_ID,
      ORG_B_ID,
    );
    await seedPrisma.$executeRawUnsafe(
      `DELETE FROM users WHERE id IN ($1::uuid, $2::uuid)`,
      USER_A_ID,
      USER_B_ID,
    );
    await seedPrisma.$disconnect();
    await appPrisma.$disconnect();
  });

  // ─── Test 1: Org A sees only its own data ────────────────────
  it('Org A can see its own branches', async () => {
    const rows = await appPrisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, ORG_A_ID);
      return tx.$queryRawUnsafe<{ id: string; name: string }[]>(`SELECT id, name FROM branches`);
    });

    expect(Array.isArray(rows)).toBe(true);
    expect((rows as any[]).length).toBeGreaterThanOrEqual(1);
    expect((rows as any[]).every((r: any) => r.name.includes('Test A'))).toBe(true);
  });

  // ─── Test 2: Org B cannot see Org A branches ─────────────────
  it('Org B CANNOT see Org A branches', async () => {
    const rows = await appPrisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, ORG_B_ID);
      return tx.$queryRawUnsafe<{ id: string; name: string }[]>(`SELECT id, name FROM branches`);
    });

    expect(Array.isArray(rows)).toBe(true);
    // Org B should only see its own branch, NOT Org A's branch
    for (const row of rows as any[]) {
      expect(row.name).not.toContain('Test A');
    }
    // Verify Org B sees at least its own branch
    expect((rows as any[]).some((r: any) => r.name.includes('Test B'))).toBe(true);
  });

  // ─── Test 3: No org context = zero rows (fail-safe) ──────────
  it('No org context set = no rows visible (fail-safe)', async () => {
    // When app.current_org_id is not set or set to an invalid value,
    // the ::uuid cast either returns NULL (→ 0 rows) or throws a cast error.
    // Both outcomes prove the fail-safe works: no data leaks.
    let rowCount = -1;
    try {
      const rows = await appPrisma.$transaction(async (tx) => {
        // RESET to ensure no org context
        await tx.$executeRawUnsafe(`RESET app.current_org_id`);
        return tx.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM branches`);
      });
      rowCount = (rows as any[]).length;
    } catch {
      // UUID cast error = fail-safe triggered, no data leaked
      rowCount = 0;
    }

    expect(rowCount).toBe(0);
  });

  // ─── Test 4: Cross-org INSERT is blocked by WITH CHECK ───────
  it('Cross-org INSERT is blocked by WITH CHECK', async () => {
    let insertSucceeded = false;
    try {
      await appPrisma.$transaction(async (tx) => {
        // Set context as Org B
        await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, ORG_B_ID);
        // Attempt to insert with Org A's org_id while context is Org B
        // WITH CHECK should reject this
        await tx.$executeRawUnsafe(
          `
          INSERT INTO branches (id, org_id, code, name)
          VALUES (gen_random_uuid(), $1::uuid, 'hacked', 'Hacked Branch')
        `,
          ORG_A_ID,
        );
        insertSucceeded = true;
      });
    } catch (error) {
      // Expected: WITH CHECK policy violation
      insertSucceeded = false;
    }

    expect(insertSucceeded).toBe(false);
  });
});
