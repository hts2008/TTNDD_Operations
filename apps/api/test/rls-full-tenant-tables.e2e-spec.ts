import { PrismaClient } from '@prisma/client';

const SUPERUSER_URL =
  process.env.RLS_SUPERUSER_URL ?? 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
const APP_USER_URL =
  process.env.RLS_APP_USER_URL ?? 'postgresql://ttndd_app:ttndd_local@localhost:5432/ttndd_ops';

const ORG_A = '71000000-0000-4000-8000-000000000001';
const ORG_B = '71000000-0000-4000-8000-000000000002';
const BRANCH_A = '72000000-0000-4000-8000-000000000001';
const BRANCH_B = '72000000-0000-4000-8000-000000000002';
const EXP_A = '73000000-0000-4000-8000-000000000001';
const EXP_B = '73000000-0000-4000-8000-000000000002';
const BLOCKED_BRANCH = '72000000-0000-4000-8000-000000000099';

const SPECIAL_TENANT_TABLES = [
  'organizations',
  'ticket_status_history',
  'notification_delivery_logs',
];

describe('P3 full tenant RLS coverage', () => {
  let adminDb: PrismaClient;
  let appDb: PrismaClient;

  beforeAll(async () => {
    adminDb = new PrismaClient({ datasources: { db: { url: SUPERUSER_URL } } });
    appDb = new PrismaClient({ datasources: { db: { url: APP_USER_URL } } });
    await seedFixture(adminDb);
  });

  afterAll(async () => {
    await cleanupFixture(adminDb);
    await appDb.$disconnect();
    await adminDb.$disconnect();
  });

  it('enables RLS and org isolation policies for every tenant-scoped table', async () => {
    const directOrgTables = await getDirectOrgTables(adminDb);
    const tables = [...directOrgTables, ...SPECIAL_TENANT_TABLES];
    const tableList = toSqlStringList(tables);
    const rowSecurity = await adminDb.$queryRawUnsafe<
      Array<{ relname: string; relrowsecurity: boolean }>
    >(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relkind = 'r'
         AND c.relname IN (${tableList})`,
    );

    expect(rowSecurity).toHaveLength(tables.length);
    expect(rowSecurity.every((row) => row.relrowsecurity)).toBe(true);

    const policies = await adminDb.$queryRawUnsafe<
      Array<{ tablename: string; policyname: string }>
    >(
      `SELECT tablename, policyname
       FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename IN (${tableList})`,
    );
    const policyKeys = new Set(
      policies.map((policy) => `${policy.tablename}:${policy.policyname}`),
    );

    for (const table of directOrgTables) {
      expect(policyKeys.has(`${table}:org_isolation_${table}`)).toBe(true);
    }
    for (const table of SPECIAL_TENANT_TABLES) {
      expect(policyKeys.has(`${table}:org_isolation_${table}`)).toBe(true);
    }
  });

  it('filters direct org tables by app.current_org_id for the app role', async () => {
    const noContext = await countRows(appDb, 'branches');
    expect(noContext).toBe(0);

    const counts = await withOrgContext(appDb, ORG_A, async (tx) => ({
      organizations: await countRows(tx, 'organizations'),
      branches: await countRows(tx, 'branches'),
      expConfigs: await countRows(tx, 'exp_configs'),
    }));

    expect(counts).toEqual({ organizations: 1, branches: 1, expConfigs: 1 });
  });

  it('rejects cross-org writes through the app role', async () => {
    await expect(
      withOrgContext(appDb, ORG_A, (tx) =>
        tx.$executeRawUnsafe(
          `INSERT INTO branches (id, org_id, code, name)
           VALUES ($1::uuid, $2::uuid, 'blocked', 'Blocked Branch')`,
          BLOCKED_BRANCH,
          ORG_B,
        ),
      ),
    ).rejects.toThrow();
  });
});

function toSqlStringList(values: string[]) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

async function getDirectOrgTables(db: PrismaClient): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT c.relname AS table_name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND a.attname = 'org_id'
       AND NOT a.attisdropped
     ORDER BY c.relname`,
  );
  return rows.map((row) => row.table_name);
}

async function withOrgContext<T>(
  db: PrismaClient,
  orgId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, orgId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, ORG_A);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_member_id', $1, true)`, ORG_A);
    await tx.$executeRawUnsafe(`SELECT set_config('app.user_role', $1, true)`, 'admin');
    return fn(tx as PrismaClient);
  });
}

async function countRows(db: PrismaClient, tableName: string): Promise<number> {
  const rows = await db.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT count(*)::int AS count FROM ${tableName}`,
  );
  return rows[0]?.count ?? 0;
}

async function seedFixture(db: PrismaClient) {
  await db.$transaction(async (tx) => {
    await cleanupFixture(tx as PrismaClient);
    await tx.$executeRawUnsafe(
      `INSERT INTO organizations (id, slug, name)
       VALUES ($1::uuid, 'p3-rls-a', 'P3 RLS A'),
              ($2::uuid, 'p3-rls-b', 'P3 RLS B')`,
      ORG_A,
      ORG_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO branches (id, org_id, code, name)
       VALUES ($1::uuid, $2::uuid, 'p3a', 'P3 Branch A'),
              ($3::uuid, $4::uuid, 'p3b', 'P3 Branch B')`,
      BRANCH_A,
      ORG_A,
      BRANCH_B,
      ORG_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO exp_configs (id, org_id, event_type, source_module, action_name, exp_amount)
       VALUES ($1::uuid, $2::uuid, 'p3.rls.a', 'p3', 'RLS A', 1),
              ($3::uuid, $4::uuid, 'p3.rls.b', 'p3', 'RLS B', 1)`,
      EXP_A,
      ORG_A,
      EXP_B,
      ORG_B,
    );
  });
}

async function cleanupFixture(db: PrismaClient) {
  await db.$executeRawUnsafe(
    `DELETE FROM exp_configs WHERE id IN ($1::uuid, $2::uuid) OR event_type IN ('p3.rls.a', 'p3.rls.b')`,
    EXP_A,
    EXP_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM branches WHERE id IN ($1::uuid, $2::uuid, $3::uuid)`,
    BRANCH_A,
    BRANCH_B,
    BLOCKED_BRANCH,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM organizations WHERE id IN ($1::uuid, $2::uuid)`,
    ORG_A,
    ORG_B,
  );
}
