import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'dtndd-demo' },
    update: {},
    create: {
      slug: 'dtndd-demo',
      name: 'DTNDD Demo',
      fullName: 'Đoàn Thiếu Nhi Đạo Đức — Demo Environment',
      settings: {
        modules: {
          orgConfig: true,
          hrm: true,
          projects: true,
          tickets: true,
          finance: true,
          assets: true,
          process: true,
          lms: true,
          scout: true,
          rewards: true,
        },
        theme: 'dong',
        quotas: { maxMembers: 500, maxAdmins: 20 },
        safety: { twoAdultRule: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' },
      },
      subscriptionPlan: 'basic',
    },
  });
  console.log(`  ✅ Organization: ${org.name} (${org.id})`);

  // Branches (Đồng, Thiếu, Thanh)
  const branchData = [
    { code: 'dong', name: 'Ngành Đồng', minAge: 6, maxAge: 11, colorTheme: 'green', narrativeName: 'Ong Vàng' },
    { code: 'thieu', name: 'Ngành Thiếu', minAge: 12, maxAge: 17, colorTheme: 'blue', narrativeName: 'Chiến Sĩ' },
    { code: 'thanh', name: 'Ngành Thanh', minAge: 18, maxAge: 25, colorTheme: 'red', narrativeName: 'Tráng Sinh' },
  ];

  const branches: Record<string, { id: string }> = {};
  for (const b of branchData) {
    const branch = await prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: b.code } },
      update: {},
      create: { orgId: org.id, ...b },
    });
    branches[b.code] = branch;
    console.log(`  ✅ Branch: ${branch.name}`);
  }

  // Demo user — Liên Đoàn Trưởng (super_admin)
  const superAdmin = await prisma.user.upsert({
    where: { firebaseUid: 'demo-super-admin-uid' },
    update: {},
    create: {
      firebaseUid: 'demo-super-admin-uid',
      email: 'ldt@dtndd-demo.vn',
      displayName: 'Trưởng LĐT Demo',
      isActive: true,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: superAdmin.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: superAdmin.id,
      role: 'super_admin',
      truongLevel: 'alt',
      memberCode: 'LDT-001',
      joinedDate: new Date('2024-01-01'),
      status: 'active',
      scoutName: 'Đại Bàng',
    },
  });
  console.log(`  ✅ Super Admin: ${superAdmin.displayName}`);

  // Demo Trưởng (admin)
  const admin = await prisma.user.upsert({
    where: { firebaseUid: 'demo-admin-uid' },
    update: {},
    create: {
      firebaseUid: 'demo-admin-uid',
      email: 'truong@dtndd-demo.vn',
      displayName: 'Trưởng Đồng Demo',
      isActive: true,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: admin.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: admin.id,
      role: 'admin',
      truongLevel: 'truong_chinh_thuc',
      branchId: branches['dong']!.id,
      memberCode: 'TR-001',
      joinedDate: new Date('2024-06-01'),
      status: 'active',
      scoutName: 'Sóc Nâu',
    },
  });
  console.log(`  ✅ Admin (Trưởng): ${admin.displayName}`);

  // Demo Đoàn Sinh (user)
  const scout = await prisma.user.upsert({
    where: { firebaseUid: 'demo-scout-uid' },
    update: {},
    create: {
      firebaseUid: 'demo-scout-uid',
      email: 'doansinh@dtndd-demo.vn',
      displayName: 'Đoàn Sinh Demo',
      isActive: true,
    },
  });

  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: scout.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: scout.id,
      role: 'user',
      branchId: branches['dong']!.id,
      memberCode: 'DS-001',
      joinedDate: new Date('2025-01-15'),
      status: 'active',
      scoutName: 'Ong Vàng Nhỏ',
      heroName: 'Chiến Binh Ánh Sáng',
    },
  });
  console.log(`  ✅ Scout (Đoàn Sinh): ${scout.displayName}`);

  console.log('\n🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
