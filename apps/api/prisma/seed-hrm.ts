/**
 * T-1017: HRM Seed Data
 *
 * Seeds 20 demo members across 4 branches, 5 guardians, org chart nodes.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed-hrm.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_ORG_ID = 'eeeeeee0-0000-0000-0000-000000000001';

async function seedHrm() {
  console.log('🌱 Seeding HRM data...');

  // --- Users (if not exist) ---
  const userIds: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const uid = `eeeeeee1-0000-0000-0000-${String(i).padStart(12, '0')}`;
    await prisma.user.upsert({
      where: { id: uid },
      create: {
        id: uid,
        firebaseUid: `demo-hrm-${i}`,
        email: `member${i}@demo.ttndd.org`,
        displayName: `Demo Member ${i}`,
      },
      update: {},
    });
    userIds.push(uid);
  }

  // --- Branches ---
  const branches = [
    { code: 'au', name: 'Ngành Ấu', minAge: 7, maxAge: 11 },
    { code: 'thieu', name: 'Ngành Thiếu', minAge: 12, maxAge: 15 },
    { code: 'kha', name: 'Ngành Kha', minAge: 16, maxAge: 17 },
    { code: 'trang', name: 'Ngành Tráng', minAge: 18, maxAge: 25 },
  ];

  const branchIds: Record<string, string> = {};
  for (const b of branches) {
    const branch = await prisma.branch.upsert({
      where: { orgId_code: { orgId: DEMO_ORG_ID, code: b.code } },
      create: { orgId: DEMO_ORG_ID, ...b },
      update: {},
    });
    branchIds[b.code] = branch.id;
  }

  // --- Units ---
  const units = [
    { name: 'Đàn Sơn Ca', branchCode: 'au' },
    { name: 'Đàn Hải Yến', branchCode: 'au' },
    { name: 'Đội Hướng Dương', branchCode: 'thieu' },
    { name: 'Đội Hải Âu', branchCode: 'thieu' },
    { name: 'Toán Bạch Mã', branchCode: 'kha' },
    { name: 'Toán Thanh Long', branchCode: 'trang' },
  ];

  const unitIds: Record<string, string> = {};
  for (const u of units) {
    const unit = await prisma.unit.upsert({
      where: {
        id: `seed-unit-${u.name.toLowerCase().replace(/\s/g, '-')}`.slice(0, 36).padEnd(36, '0'),
      },
      create: {
        orgId: DEMO_ORG_ID,
        branchId: branchIds[u.branchCode],
        name: u.name,
        unitType: u.branchCode === 'au' ? 'dan' : u.branchCode === 'thieu' ? 'doi' : 'toan',
      },
      update: {},
    });
    unitIds[u.name] = unit.id;
  }

  // --- Members with profiles ---
  const memberData = [
    {
      name: 'Nguyễn Văn An',
      code: 'DS-001',
      branch: 'thieu',
      unit: 'Đội Hướng Dương',
      dob: '2012-08-22',
      status: 'active',
      scout: 'Sơn Ca',
    },
    {
      name: 'Trần Thị Bình',
      code: 'DS-002',
      branch: 'thieu',
      unit: 'Đội Hải Âu',
      dob: '2011-03-15',
      status: 'active',
      scout: 'Hải Âu',
    },
    {
      name: 'Lê Minh Châu',
      code: 'DS-003',
      branch: 'au',
      unit: 'Đàn Sơn Ca',
      dob: '2016-01-10',
      status: 'active',
      scout: 'Bướm Vàng',
    },
    {
      name: 'Phạm Đức Dũng',
      code: 'DS-004',
      branch: 'trang',
      unit: 'Toán Thanh Long',
      dob: '2004-07-20',
      status: 'inactive',
      scout: 'Rồng Lửa',
    },
    {
      name: 'Hoàng Thị Lan',
      code: 'DS-005',
      branch: 'thieu',
      unit: 'Đội Hướng Dương',
      dob: '2012-12-05',
      status: 'suspended',
      scout: 'Hoa Lan',
    },
    {
      name: 'Võ Quốc Bảo',
      code: 'DS-006',
      branch: 'kha',
      unit: 'Toán Bạch Mã',
      dob: '2009-04-18',
      status: 'active',
      scout: 'Đại Bàng',
    },
    {
      name: 'Đặng Thị Hà',
      code: 'DS-007',
      branch: 'au',
      unit: 'Đàn Hải Yến',
      dob: '2017-09-03',
      status: 'active',
      scout: 'Yến Trắng',
    },
    {
      name: 'Bùi Văn Khoa',
      code: 'DS-008',
      branch: 'thieu',
      unit: 'Đội Hải Âu',
      dob: '2011-06-28',
      status: 'active',
      scout: 'Khoa Học',
    },
    {
      name: 'Ngô Thị Mai',
      code: 'DS-009',
      branch: 'au',
      unit: 'Đàn Sơn Ca',
      dob: '2016-11-14',
      status: 'pending',
      scout: 'Mai Vàng',
    },
    {
      name: 'Lý Hoàng Nam',
      code: 'DS-010',
      branch: 'trang',
      unit: 'Toán Thanh Long',
      dob: '2005-02-07',
      status: 'active',
      scout: 'Sư Tử',
    },
    {
      name: 'Trịnh Văn Phát',
      code: 'DS-011',
      branch: 'thieu',
      unit: 'Đội Hướng Dương',
      dob: '2013-05-25',
      status: 'active',
      scout: 'Phượng Hoàng',
    },
    {
      name: 'Hồ Thị Quỳnh',
      code: 'DS-012',
      branch: 'kha',
      unit: 'Toán Bạch Mã',
      dob: '2009-08-12',
      status: 'active',
      scout: 'Ngọc Quỳnh',
    },
    {
      name: 'Phan Văn Sơn',
      code: 'DS-013',
      branch: 'au',
      unit: 'Đàn Hải Yến',
      dob: '2018-03-30',
      status: 'active',
      scout: 'Sơn Ca Nhỏ',
    },
    {
      name: 'Cao Thị Tuyết',
      code: 'DS-014',
      branch: 'thieu',
      unit: 'Đội Hải Âu',
      dob: '2012-10-08',
      status: 'active',
      scout: 'Tuyết Trắng',
    },
    {
      name: 'Dương Văn Uy',
      code: 'DS-015',
      branch: 'trang',
      unit: 'Toán Thanh Long',
      dob: '2003-12-22',
      status: 'left',
      scout: 'Hùng Sư',
    },
    {
      name: 'Lê Thị Vân',
      code: 'DS-016',
      branch: 'au',
      unit: 'Đàn Sơn Ca',
      dob: '2017-07-17',
      status: 'active',
      scout: 'Vân Mây',
    },
    {
      name: 'Nguyễn Xuân',
      code: 'DS-017',
      branch: 'kha',
      unit: 'Toán Bạch Mã',
      dob: '2008-01-05',
      status: 'active',
      scout: 'Mãnh Hổ',
    },
    {
      name: 'Trần Ý Nhi',
      code: 'DS-018',
      branch: 'thieu',
      unit: 'Đội Hướng Dương',
      dob: '2013-04-11',
      status: 'active',
      scout: 'Sao Mai',
    },
    {
      name: 'Vũ Đình Anh',
      code: 'DS-019',
      branch: 'thieu',
      unit: 'Đội Hải Âu',
      dob: '2012-09-29',
      status: 'transferred',
      scout: 'Chim Ưng',
    },
    {
      name: 'Phùng Thị Bích',
      code: 'DS-020',
      branch: 'au',
      unit: 'Đàn Hải Yến',
      dob: '2016-06-16',
      status: 'active',
      scout: 'Bích Ngọc',
    },
  ];

  for (let i = 0; i < memberData.length; i++) {
    const m = memberData[i];
    const memberId = `eeeeeee1-0000-0000-0000-${String(i + 1)
      .padStart(12, '0')
      .replace(/0{4}$/, '0003')}`;

    await prisma.orgMember.upsert({
      where: { orgId_userId: { orgId: DEMO_ORG_ID, userId: userIds[i] } },
      create: {
        id: memberId,
        orgId: DEMO_ORG_ID,
        userId: userIds[i],
        role: 'member',
        branchId: branchIds[m.branch],
        unitId: unitIds[m.unit],
        memberCode: m.code,
        scoutName: m.scout,
        status: m.status,
        profile: {
          create: {
            orgId: DEMO_ORG_ID,
            fullName: m.name,
            birthDate: new Date(m.dob),
            emergencyContact: '0900-000-' + String(i + 1).padStart(3, '0'),
          },
        },
      },
      update: {},
    });
  }

  // --- Guardians for under-18 members ---
  const guardians = [
    { memberIdx: 0, name: 'Nguyễn Thị Hồng', relation: 'mother', phone: '0901000001' },
    { memberIdx: 2, name: 'Lê Văn Tài', relation: 'father', phone: '0901000003' },
    { memberIdx: 6, name: 'Đặng Thị Nga', relation: 'mother', phone: '0901000007' },
    { memberIdx: 8, name: 'Ngô Văn Hùng', relation: 'father', phone: '0901000009' },
    { memberIdx: 12, name: 'Phan Thị Lan', relation: 'mother', phone: '0901000013' },
  ];

  for (const g of guardians) {
    const memberId = `eeeeeee1-0000-0000-0000-${String(g.memberIdx + 1)
      .padStart(12, '0')
      .replace(/0{4}$/, '0003')}`;
    await prisma.guardianLink.upsert({
      where: {
        orgMemberId_fullName_relation: {
          orgMemberId: memberId,
          fullName: g.name,
          relation: g.relation,
        },
      },
      create: {
        orgId: DEMO_ORG_ID,
        orgMemberId: memberId,
        fullName: g.name,
        relation: g.relation,
        phone: g.phone,
        isPrimary: true,
        consentSigned: true,
        consentDate: new Date('2025-01-15'),
      },
      update: {},
    });
  }

  // --- Org Chart Nodes ---
  const rootNode = await prisma.orgChartNode.upsert({
    where: { id: 'ocn-root-0000-0000-0000-000000000001' },
    create: {
      id: 'ocn-root-0000-0000-0000-000000000001',
      orgId: DEMO_ORG_ID,
      nodeType: 'org',
      name: 'Đoàn HĐ Cao Đài Tòa Thánh',
      displayOrder: 0,
    },
    update: {},
  });

  for (const b of branches) {
    await prisma.orgChartNode.upsert({
      where: { id: `ocn-branch-${b.code}-000000000001`.padEnd(36, '0').slice(0, 36) },
      create: {
        id: `ocn-branch-${b.code}-000000000001`.padEnd(36, '0').slice(0, 36),
        orgId: DEMO_ORG_ID,
        nodeType: 'branch',
        name: b.name,
        parentNodeId: rootNode.id,
        displayOrder: branches.indexOf(b) + 1,
      },
      update: {},
    });
  }

  console.log('✅ HRM seed complete: 20 members, 5 guardians, 5 org chart nodes');
}

seedHrm()
  .catch((e) => {
    console.error('❌ HRM seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
