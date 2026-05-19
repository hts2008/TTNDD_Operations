import { PrismaClient } from '@prisma/client';

const SUPERUSER_URL =
  process.env.RLS_SUPERUSER_URL ?? 'postgresql://ttndd:ttndd_local@localhost:5432/ttndd_ops';
const APP_USER_URL =
  process.env.RLS_APP_USER_URL ?? 'postgresql://ttndd_app:ttndd_local@localhost:5432/ttndd_ops';

const ORG_A = '10000000-0000-4000-8000-000000000001';
const ORG_B = '10000000-0000-4000-8000-000000000002';
const USER_A = '20000000-0000-4000-8000-000000000001';
const USER_B = '20000000-0000-4000-8000-000000000002';
const MEMBER_A = '30000000-0000-4000-8000-000000000001';
const MEMBER_B = '30000000-0000-4000-8000-000000000002';
const PROFILE_A = '31000000-0000-4000-8000-000000000001';
const PROFILE_B = '31000000-0000-4000-8000-000000000002';
const GUARDIAN_A = '32000000-0000-4000-8000-000000000001';
const GUARDIAN_B = '32000000-0000-4000-8000-000000000002';
const TICKET_A = '40000000-0000-4000-8000-000000000001';
const TICKET_B = '40000000-0000-4000-8000-000000000002';
const COMMENT_A = '41000000-0000-4000-8000-000000000001';
const COMMENT_B = '41000000-0000-4000-8000-000000000002';
const HISTORY_A = '42000000-0000-4000-8000-000000000001';
const HISTORY_B = '42000000-0000-4000-8000-000000000002';
const NOTIFICATION_A = '50000000-0000-4000-8000-000000000001';
const NOTIFICATION_B = '50000000-0000-4000-8000-000000000002';
const DELIVERY_A = '51000000-0000-4000-8000-000000000001';
const DELIVERY_B = '51000000-0000-4000-8000-000000000002';
const PREF_A = '52000000-0000-4000-8000-000000000001';
const PREF_B = '52000000-0000-4000-8000-000000000002';
const TEMPLATE_A = '53000000-0000-4000-8000-000000000001';
const TEMPLATE_B = '53000000-0000-4000-8000-000000000002';
const AUDIT_A = '60000000-0000-4000-8000-000000000001';
const AUDIT_B = '60000000-0000-4000-8000-000000000002';

describe('RLS phase 1 sensitive table isolation', () => {
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

  it('shows only the active org across HRM, guardian, ticket, notification, and audit tables', async () => {
    const counts = await withOrgContext(appDb, ORG_A, async (tx) => ({
      orgMembers: await countRows(tx, 'org_members'),
      memberProfiles: await countRows(tx, 'member_profiles'),
      guardianLinks: await countRows(tx, 'guardian_links'),
      tickets: await countRows(tx, 'tickets'),
      ticketComments: await countRows(tx, 'ticket_comments'),
      ticketStatusHistory: await countRows(tx, 'ticket_status_history'),
      notifications: await countRows(tx, 'notifications'),
      notificationPreferences: await countRows(tx, 'notification_preferences'),
      notificationTemplates: await countRows(tx, 'notification_templates'),
      notificationDeliveryLogs: await countRows(tx, 'notification_delivery_logs'),
      auditLogs: await countRows(tx, 'audit_logs'),
    }));

    expect(counts).toEqual({
      orgMembers: 1,
      memberProfiles: 1,
      guardianLinks: 1,
      tickets: 1,
      ticketComments: 1,
      ticketStatusHistory: 1,
      notifications: 1,
      notificationPreferences: 1,
      notificationTemplates: 1,
      notificationDeliveryLogs: 1,
      auditLogs: 1,
    });
  });

  it('rejects writes whose org_id differs from the active RLS org context', async () => {
    await expect(
      withOrgContext(appDb, ORG_A, (tx) =>
        tx.$executeRawUnsafe(
          `INSERT INTO tickets (id, org_id, ticket_number, title, requester_id)
           VALUES ($1::uuid, $2::uuid, 'RLS-BLOCKED', 'blocked cross-org ticket', $3::uuid)`,
          '40000000-0000-4000-8000-000000000099',
          ORG_B,
          USER_A,
        ),
      ),
    ).rejects.toThrow();

    await expect(
      withOrgContext(appDb, ORG_A, (tx) =>
        tx.$executeRawUnsafe(
          `INSERT INTO notifications (id, org_id, recipient_id, title, body, type)
           VALUES ($1::uuid, $2::uuid, $3::uuid, 'blocked', 'blocked', 'system')`,
          '50000000-0000-4000-8000-000000000099',
          ORG_B,
          MEMBER_A,
        ),
      ),
    ).rejects.toThrow();
  });
});

async function withOrgContext<T>(
  db: PrismaClient,
  orgId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, orgId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, USER_A);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_member_id', $1, true)`, MEMBER_A);
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
       VALUES ($1::uuid, 'rls-phase1-a', 'RLS Phase 1 A'),
              ($2::uuid, 'rls-phase1-b', 'RLS Phase 1 B')`,
      ORG_A,
      ORG_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO users (id, firebase_uid, email, display_name)
       VALUES ($1::uuid, 'rls-phase1-user-a', 'rls-a@example.test', 'RLS A'),
              ($2::uuid, 'rls-phase1-user-b', 'rls-b@example.test', 'RLS B')`,
      USER_A,
      USER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO org_members (id, org_id, user_id, role, member_code, scout_name)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'admin', 'RLS-A', 'RLS A'),
              ($4::uuid, $5::uuid, $6::uuid, 'admin', 'RLS-B', 'RLS B')`,
      MEMBER_A,
      ORG_A,
      USER_A,
      MEMBER_B,
      ORG_B,
      USER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO member_profiles (id, org_id, org_member_id, full_name)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'RLS Member A'),
              ($4::uuid, $5::uuid, $6::uuid, 'RLS Member B')`,
      PROFILE_A,
      ORG_A,
      MEMBER_A,
      PROFILE_B,
      ORG_B,
      MEMBER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO guardian_links (id, org_id, org_member_id, full_name, relation)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'Guardian A', 'parent'),
              ($4::uuid, $5::uuid, $6::uuid, 'Guardian B', 'parent')`,
      GUARDIAN_A,
      ORG_A,
      MEMBER_A,
      GUARDIAN_B,
      ORG_B,
      MEMBER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO tickets (id, org_id, ticket_number, title, requester_id)
       VALUES ($1::uuid, $2::uuid, 'RLS-A-1', 'Ticket A', $3::uuid),
              ($4::uuid, $5::uuid, 'RLS-B-1', 'Ticket B', $6::uuid)`,
      TICKET_A,
      ORG_A,
      USER_A,
      TICKET_B,
      ORG_B,
      USER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO ticket_comments (id, org_id, ticket_id, author_id, content)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'Comment A'),
              ($5::uuid, $6::uuid, $7::uuid, $8::uuid, 'Comment B')`,
      COMMENT_A,
      ORG_A,
      TICKET_A,
      USER_A,
      COMMENT_B,
      ORG_B,
      TICKET_B,
      USER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO ticket_status_history (id, ticket_id, to_status, changed_by)
       VALUES ($1::uuid, $2::uuid, 'open', $3::uuid),
              ($4::uuid, $5::uuid, 'open', $6::uuid)`,
      HISTORY_A,
      TICKET_A,
      USER_A,
      HISTORY_B,
      TICKET_B,
      USER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO notifications (id, org_id, recipient_id, title, body, type)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'Notification A', 'Body A', 'system'),
              ($4::uuid, $5::uuid, $6::uuid, 'Notification B', 'Body B', 'system')`,
      NOTIFICATION_A,
      ORG_A,
      MEMBER_A,
      NOTIFICATION_B,
      ORG_B,
      MEMBER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO notification_preferences (id, org_id, user_id, channel, event_type, enabled)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'in_app', 'RLS_EVENT_A', true),
              ($4::uuid, $5::uuid, $6::uuid, 'in_app', 'RLS_EVENT_B', true)`,
      PREF_A,
      ORG_A,
      USER_A,
      PREF_B,
      ORG_B,
      USER_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO notification_templates (id, org_id, event_type, channel, title, body)
       VALUES ($1::uuid, $2::uuid, 'RLS_TEMPLATE_A', 'in_app', 'Template A', 'Body A'),
              ($3::uuid, $4::uuid, 'RLS_TEMPLATE_B', 'in_app', 'Template B', 'Body B')`,
      TEMPLATE_A,
      ORG_A,
      TEMPLATE_B,
      ORG_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO notification_delivery_logs (id, notification_id, channel, status)
       VALUES ($1::uuid, $2::uuid, 'in_app', 'pending'),
              ($3::uuid, $4::uuid, 'in_app', 'pending')`,
      DELIVERY_A,
      NOTIFICATION_A,
      DELIVERY_B,
      NOTIFICATION_B,
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, org_id, user_id, action, resource, resource_id)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'rls.audit.a', 'OrgMember', $4::uuid),
              ($5::uuid, $6::uuid, $7::uuid, 'rls.audit.b', 'OrgMember', $8::uuid)`,
      AUDIT_A,
      ORG_A,
      USER_A,
      MEMBER_A,
      AUDIT_B,
      ORG_B,
      USER_B,
      MEMBER_B,
    );
  });
}

async function cleanupFixture(db: PrismaClient) {
  await db.$executeRawUnsafe(
    `DELETE FROM notification_delivery_logs WHERE id IN ($1::uuid, $2::uuid)`,
    DELIVERY_A,
    DELIVERY_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM notification_preferences WHERE id IN ($1::uuid, $2::uuid)`,
    PREF_A,
    PREF_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM notification_templates WHERE id IN ($1::uuid, $2::uuid)`,
    TEMPLATE_A,
    TEMPLATE_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM notifications WHERE id IN ($1::uuid, $2::uuid)`,
    NOTIFICATION_A,
    NOTIFICATION_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM ticket_status_history WHERE id IN ($1::uuid, $2::uuid)`,
    HISTORY_A,
    HISTORY_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM ticket_comments WHERE id IN ($1::uuid, $2::uuid)`,
    COMMENT_A,
    COMMENT_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM tickets WHERE id IN ($1::uuid, $2::uuid)`,
    TICKET_A,
    TICKET_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM audit_logs WHERE id IN ($1::uuid, $2::uuid)`,
    AUDIT_A,
    AUDIT_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM guardian_links WHERE id IN ($1::uuid, $2::uuid)`,
    GUARDIAN_A,
    GUARDIAN_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM member_profiles WHERE id IN ($1::uuid, $2::uuid)`,
    PROFILE_A,
    PROFILE_B,
  );
  await db.$executeRawUnsafe(
    `DELETE FROM org_members WHERE id IN ($1::uuid, $2::uuid)`,
    MEMBER_A,
    MEMBER_B,
  );
  await db.$executeRawUnsafe(`DELETE FROM users WHERE id IN ($1::uuid, $2::uuid)`, USER_A, USER_B);
  await db.$executeRawUnsafe(
    `DELETE FROM organizations WHERE id IN ($1::uuid, $2::uuid)`,
    ORG_A,
    ORG_B,
  );
}
