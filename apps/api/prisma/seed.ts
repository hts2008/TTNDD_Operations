import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Seeding TTNDD_OPS demo data...');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'lien-doan-demo' },
    update: {},
    create: {
      id: ORG_ID,
      slug: 'lien-doan-demo',
      name: 'Liên Đoàn Demo',
      fullName: 'Liên Đoàn Thiếu Nhi Đạo Đức Demo',
      subscriptionPlan: 'basic',
      isActive: true,
      settings: {
        enabledModules: [
          'HRM',
          'SCOUT',
          'REWARDS',
          'SESSIONS',
          'EVENTS',
          'LMS',
          'PROJECTS',
          'TICKETS',
          'FINANCE',
          'ASSETS',
          'PROCESS',
          'NOTIFICATIONS',
        ],
        theme: 'default',
        expCap: { daily: 100, weekly: 500 },
        zaloOaEnabled: false,
      },
    },
  });

  // 2. Three Branches
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: 'DONG' } },
      update: {},
      create: {
        id: 'bbbbbbbb-0000-0000-0000-000000000001',
        orgId: org.id,
        code: 'DONG',
        name: 'Ngành Đồng',
        minAge: 6,
        maxAge: 11,
        colorTheme: '#FFC107',
        narrativeName: 'Đồng Nhi',
      },
    }),
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: 'THIEU' } },
      update: {},
      create: {
        id: 'bbbbbbbb-0000-0000-0000-000000000002',
        orgId: org.id,
        code: 'THIEU',
        name: 'Ngành Thiếu',
        minAge: 12,
        maxAge: 17,
        colorTheme: '#2196F3',
        narrativeName: 'Thiếu Nhi',
      },
    }),
    prisma.branch.upsert({
      where: { orgId_code: { orgId: org.id, code: 'THANH' } },
      update: {},
      create: {
        id: 'bbbbbbbb-0000-0000-0000-000000000003',
        orgId: org.id,
        code: 'THANH',
        name: 'Ngành Thanh',
        minAge: 18,
        maxAge: 25,
        colorTheme: '#4CAF50',
        narrativeName: 'Thanh Niên',
      },
    }),
  ]);
  const [branchDong, branchThieu, branchThanh] = branches;

  // 3. Units
  const units = await Promise.all([
    prisma.unit.upsert({
      where: { id: 'cccccccc-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'cccccccc-0000-0000-0000-000000000001',
        orgId: org.id,
        branchId: branchDong.id,
        name: 'Đội Hoa Mai',
        totemName: 'Hoa Mai',
        unitType: 'doi',
      },
    }),
    prisma.unit.upsert({
      where: { id: 'cccccccc-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: 'cccccccc-0000-0000-0000-000000000002',
        orgId: org.id,
        branchId: branchDong.id,
        name: 'Đội Hoa Cúc',
        totemName: 'Hoa Cúc',
        unitType: 'doi',
      },
    }),
    prisma.unit.upsert({
      where: { id: 'cccccccc-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: 'cccccccc-0000-0000-0000-000000000003',
        orgId: org.id,
        branchId: branchThieu.id,
        name: 'Đội Sao Bắc',
        totemName: 'Sao Bắc',
        unitType: 'doi',
      },
    }),
    prisma.unit.upsert({
      where: { id: 'cccccccc-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: 'cccccccc-0000-0000-0000-000000000004',
        orgId: org.id,
        branchId: branchThanh.id,
        name: 'Đội Phụng Sự',
        totemName: 'Phụng Sự',
        unitType: 'doi',
      },
    }),
  ]);

  // 4. Users (2 Trưởng + 12 Đoàn sinh)
  const userDefs = [
    {
      id: 'dddddddd-0000-0000-0000-000000000001',
      firebaseUid: 'demo-admin-1',
      email: 'truong1@demo.ttndd.org',
      displayName: 'Trưởng Nguyễn Văn An',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000002',
      firebaseUid: 'demo-admin-2',
      email: 'truong2@demo.ttndd.org',
      displayName: 'Trưởng Trần Thị Bình',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000003',
      firebaseUid: 'demo-m-1',
      email: 'ds1@demo.ttndd.org',
      displayName: 'Lê Văn Cường',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000004',
      firebaseUid: 'demo-m-2',
      email: 'ds2@demo.ttndd.org',
      displayName: 'Phạm Thị Dung',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000005',
      firebaseUid: 'demo-m-3',
      email: 'ds3@demo.ttndd.org',
      displayName: 'Hoàng Văn Em',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000006',
      firebaseUid: 'demo-m-4',
      email: 'ds4@demo.ttndd.org',
      displayName: 'Vũ Thị Phương',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000007',
      firebaseUid: 'demo-m-5',
      email: 'ds5@demo.ttndd.org',
      displayName: 'Đinh Văn Giang',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000008',
      firebaseUid: 'demo-m-6',
      email: 'ds6@demo.ttndd.org',
      displayName: 'Bùi Thị Hoa',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000009',
      firebaseUid: 'demo-m-7',
      email: 'ds7@demo.ttndd.org',
      displayName: 'Đỗ Văn Khánh',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000010',
      firebaseUid: 'demo-m-8',
      email: 'ds8@demo.ttndd.org',
      displayName: 'Ngô Thị Lan',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000011',
      firebaseUid: 'demo-m-9',
      email: 'ds9@demo.ttndd.org',
      displayName: 'Lý Văn Minh',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000012',
      firebaseUid: 'demo-m-10',
      email: 'ds10@demo.ttndd.org',
      displayName: 'Dương Thị Nam',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000013',
      firebaseUid: 'demo-m-11',
      email: 'ds11@demo.ttndd.org',
      displayName: 'Tôn Văn Oanh',
    },
    {
      id: 'dddddddd-0000-0000-0000-000000000014',
      firebaseUid: 'demo-m-12',
      email: 'ds12@demo.ttndd.org',
      displayName: 'Hà Thị Phúc',
    },
  ];
  for (const u of userDefs) {
    await prisma.user.upsert({ where: { id: u.id }, update: {}, create: u });
  }

  // 5. OrgMembers
  await prisma.orgMember.upsert({
    where: { id: 'eeeeeee1-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'eeeeeee1-0000-0000-0000-000000000001',
      orgId: org.id,
      userId: 'dddddddd-0000-0000-0000-000000000001',
      role: 'super_admin',
      branchId: branchThieu.id,
      memberCode: 'LDT-001',
      status: 'active',
    },
  });
  await prisma.orgMember.upsert({
    where: { id: 'eeeeeee1-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'eeeeeee1-0000-0000-0000-000000000002',
      orgId: org.id,
      userId: 'dddddddd-0000-0000-0000-000000000002',
      role: 'admin',
      branchId: branchDong.id,
      memberCode: 'TRG-002',
      status: 'active',
    },
  });

  const memberAssignments = [
    [branchDong.id, units[0].id],
    [branchDong.id, units[0].id],
    [branchDong.id, units[1].id],
    [branchThieu.id, units[2].id],
    [branchThieu.id, units[2].id],
    [branchThieu.id, units[2].id],
    [branchThieu.id, units[2].id],
    [branchThieu.id, units[2].id],
    [branchThanh.id, units[3].id],
    [branchThanh.id, units[3].id],
    [branchThanh.id, units[3].id],
    [branchThanh.id, units[3].id],
  ];
  for (let i = 0; i < 12; i++) {
    const mid = `eeeeeee1-0000-0000-0000-${String(i + 3).padStart(12, '0')}`;
    await prisma.orgMember.upsert({
      where: { id: mid },
      update: {},
      create: {
        id: mid,
        orgId: org.id,
        userId: `dddddddd-0000-0000-0000-${String(i + 3).padStart(12, '0')}`,
        role: 'user',
        branchId: memberAssignments[i]![0]!,
        unitId: memberAssignments[i]![1]!,
        memberCode: `DS-${String(i + 1).padStart(3, '0')}`,
        status: 'active',
        joinedDate: new Date(2024, 0, 1 + i),
      },
    });
  }

  // 6. Ranks
  await prisma.rankDefinition.upsert({
    where: { id: 'ffffffff-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'ffffffff-0000-0000-0000-000000000001',
      orgId: org.id,
      branchId: branchDong.id,
      rankCode: 'DONG_1',
      rankName: 'Đồng Nhi 1',
      rankOrder: 1,
      minExp: 0,
      narrativeName: 'Hạt Mầm',
    },
  });
  await prisma.rankDefinition.upsert({
    where: { id: 'ffffffff-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'ffffffff-0000-0000-0000-000000000002',
      orgId: org.id,
      branchId: branchThieu.id,
      rankCode: 'THIEU_1',
      rankName: 'Thiếu Nhi 1',
      rankOrder: 1,
      minExp: 100,
      narrativeName: 'Tân Binh',
    },
  });
  await prisma.rankDefinition.upsert({
    where: { id: 'ffffffff-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: 'ffffffff-0000-0000-0000-000000000003',
      orgId: org.id,
      branchId: branchThieu.id,
      rankCode: 'THIEU_2',
      rankName: 'Thiếu Nhi 2',
      rankOrder: 2,
      minExp: 300,
      narrativeName: 'Chiến Binh',
    },
  });
  await prisma.rankDefinition.upsert({
    where: { id: 'ffffffff-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: 'ffffffff-0000-0000-0000-000000000004',
      orgId: org.id,
      branchId: branchThanh.id,
      rankCode: 'THANH_1',
      rankName: 'Thanh Niên 1',
      rankOrder: 1,
      minExp: 500,
      narrativeName: 'Thần Vệ Binh',
    },
  });

  // 7. Skill Groups & Skills (with SPICES tags)
  const sgDao = await prisma.skillGroup.upsert({
    where: { id: 'a0000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a0000001-0000-0000-0000-000000000001',
      orgId: org.id,
      name: 'Đạo Đức',
      narrativeName: 'Tâm Pháp',
      icon: '🧘',
      color: '#9C27B0',
      orderIndex: 1,
    },
  });
  const sgKynang = await prisma.skillGroup.upsert({
    where: { id: 'a0000001-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'a0000001-0000-0000-0000-000000000002',
      orgId: org.id,
      name: 'Kỹ Năng Sống',
      narrativeName: 'Võ Kỹ',
      icon: '⚔️',
      color: '#F44336',
      orderIndex: 2,
    },
  });
  const sgLanhDao = await prisma.skillGroup.upsert({
    where: { id: 'a0000001-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: 'a0000001-0000-0000-0000-000000000003',
      orgId: org.id,
      name: 'Lãnh Đạo',
      narrativeName: 'Chiến Lược',
      icon: '🏆',
      color: '#FF9800',
      orderIndex: 3,
    },
  });

  const skillDefs = [
    {
      id: 'b0000001-0000-0000-0000-000000000001',
      orgId: org.id,
      skillGroupId: sgDao.id,
      skillCode: 'DAO-001',
      name: 'Ngũ Giới Cấm',
      description: 'Thực hành 5 giới luật Cao Đài',
      levels: { '1': 'Nhận biết', '2': 'Thực hành', '3': 'Chia sẻ', '4': 'Hướng dẫn' },
      expPerLevel: 15,
      spicesTags: ['SPIRITUAL', 'CHARACTER'],
    },
    {
      id: 'b0000001-0000-0000-0000-000000000002',
      orgId: org.id,
      skillGroupId: sgDao.id,
      skillCode: 'DAO-002',
      name: 'Ngũ Thường',
      description: 'Nhân Nghĩa Lễ Trí Tín',
      levels: { '1': 'Nhận biết', '2': 'Thực hành', '3': 'Chia sẻ', '4': 'Hướng dẫn' },
      expPerLevel: 15,
      spicesTags: ['CHARACTER', 'EMOTIONAL'],
    },
    {
      id: 'b0000001-0000-0000-0000-000000000003',
      orgId: org.id,
      skillGroupId: sgDao.id,
      skillCode: 'DAO-003',
      name: 'Tứ Đại Điều Quy',
      description: 'Vâng lời - Khiêm tốn - Trung thực - Nhất quán',
      levels: { '1': 'Nhận biết', '2': 'Thực hành', '3': 'Chia sẻ', '4': 'Hướng dẫn' },
      expPerLevel: 10,
      spicesTags: ['CHARACTER'],
    },
    {
      id: 'b0000001-0000-0000-0000-000000000004',
      orgId: org.id,
      skillGroupId: sgKynang.id,
      skillCode: 'KN-001',
      name: 'Sơ Cứu Cơ Bản',
      description: 'Cầm máu - băng bó - hô hấp nhân tạo',
      levels: { '1': 'Lý thuyết', '2': 'Thực hành', '3': 'Thành thạo', '4': 'Huấn luyện' },
      expPerLevel: 20,
      spicesTags: ['PHYSICAL', 'SOCIAL'],
    },
    {
      id: 'b0000001-0000-0000-0000-000000000005',
      orgId: org.id,
      skillGroupId: sgKynang.id,
      skillCode: 'KN-002',
      name: 'Định Hướng & Bản Đồ',
      description: 'Đọc bản đồ - sử dụng la bàn - định hướng GPS',
      levels: { '1': 'Lý thuyết', '2': 'Thực hành', '3': 'Thành thạo', '4': 'Huấn luyện' },
      expPerLevel: 20,
      spicesTags: ['INTELLECTUAL', 'PHYSICAL'],
    },
    {
      id: 'b0000001-0000-0000-0000-000000000006',
      orgId: org.id,
      skillGroupId: sgLanhDao.id,
      skillCode: 'LD-001',
      name: 'Họp Đội Hiệu Quả',
      description: 'Lập chương trình - điều phối - ra nghị quyết',
      levels: { '1': 'Tham dự', '2': 'Điều phối', '3': 'Dẫn dắt', '4': 'Đào tạo' },
      expPerLevel: 25,
      spicesTags: ['SOCIAL', 'INTELLECTUAL'],
    },
  ];
  for (const s of skillDefs) {
    await prisma.skill.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // 7b. Program Version (WP-3.1: T-0071)
  const programVersion = await prisma.programVersion.upsert({
    where: { orgId_versionName: { orgId: org.id, versionName: 'v1.0' } },
    update: {},
    create: {
      id: 'a0100001-0000-0000-0000-000000000001',
      orgId: org.id,
      versionName: 'v1.0',
      status: 'active',
      effectiveFrom: new Date('2026-01-01'),
      notes: 'Chương trình DTNDD khởi đầu — 3 ngành, 4 bậc, 3 lĩnh vực, 6 kỹ năng',
    },
  });

  // Link existing ranks to version
  await prisma.rankDefinition.updateMany({
    where: { orgId: org.id, versionId: null },
    data: { versionId: programVersion.id },
  });

  // 7c. Domains (WP-3.1: T-0072)
  const domainDefs = [
    {
      id: 'a0200001-0000-0000-0000-000000000001',
      orgId: org.id,
      versionId: programVersion.id,
      code: 'DAO_DUC',
      name: 'Đạo Đức',
      description: 'Giáo lý Cao Đài — Ngũ Giới, Ngũ Thường, Tứ Đại Điều Quy',
      spicesTags: ['SPIRITUAL', 'CHARACTER'],
      orderIndex: 1,
    },
    {
      id: 'a0200001-0000-0000-0000-000000000002',
      orgId: org.id,
      versionId: programVersion.id,
      code: 'KY_NANG',
      name: 'Kỹ Năng Sống',
      description: 'Sơ cứu, định hướng, cắm trại, sinh tồn',
      spicesTags: ['PHYSICAL', 'INTELLECTUAL'],
      orderIndex: 2,
    },
    {
      id: 'a0200001-0000-0000-0000-000000000003',
      orgId: org.id,
      versionId: programVersion.id,
      code: 'LANH_DAO',
      name: 'Lãnh Đạo & Phụng Sự',
      description: 'Dẫn dắt đội nhóm, phụng sự cộng đồng',
      spicesTags: ['SOCIAL', 'EMOTIONAL'],
      orderIndex: 3,
    },
  ];
  for (const d of domainDefs) {
    await prisma.domain.upsert({
      where: { orgId_code: { orgId: org.id, code: d.code } },
      update: {},
      create: d,
    });
  }

  // Link existing skills to domains
  await prisma.skill.updateMany({
    where: { orgId: org.id, skillGroupId: sgDao.id, domainId: null },
    data: { domainId: 'a0200001-0000-0000-0000-000000000001' },
  });
  await prisma.skill.updateMany({
    where: { orgId: org.id, skillGroupId: sgKynang.id, domainId: null },
    data: { domainId: 'a0200001-0000-0000-0000-000000000002' },
  });
  await prisma.skill.updateMany({
    where: { orgId: org.id, skillGroupId: sgLanhDao.id, domainId: null },
    data: { domainId: 'a0200001-0000-0000-0000-000000000003' },
  });

  // 7d. Skill Criteria (WP-3.1: T-0072)
  const criteriaDefs = [
    // DAO-001 Ngũ Giới Cấm
    {
      id: 'a0300001-0000-0000-0000-000000000001',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000001',
      metricType: 'boolean',
      text: 'Kể đúng 5 giới cấm',
      orderIndex: 1,
    },
    {
      id: 'a0300001-0000-0000-0000-000000000002',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000001',
      metricType: 'count',
      targetValue: '4',
      unit: 'tuần',
      text: 'Tự đánh giá Ngũ Giới 4 tuần liên tiếp',
      orderIndex: 2,
    },
    // DAO-002 Ngũ Thường
    {
      id: 'a0300001-0000-0000-0000-000000000003',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000002',
      metricType: 'boolean',
      text: 'Giải thích Nhân Nghĩa Lễ Trí Tín',
      orderIndex: 1,
    },
    {
      id: 'a0300001-0000-0000-0000-000000000004',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000002',
      metricType: 'boolean',
      text: 'Viết bài chia sẻ 1 đức tính đã áp dụng',
      orderIndex: 2,
    },
    // DAO-003 Tứ Đại Điều Quy
    {
      id: 'a0300001-0000-0000-0000-000000000005',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000003',
      metricType: 'boolean',
      text: 'Thuộc lòng Tứ Đại Điều Quy',
      orderIndex: 1,
    },
    {
      id: 'a0300001-0000-0000-0000-000000000006',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000003',
      metricType: 'boolean',
      text: 'Thể hiện ít nhất 1 điều quy trong 2 tuần',
      orderIndex: 2,
    },
    // KN-001 Sơ Cứu
    {
      id: 'a0300001-0000-0000-0000-000000000007',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000004',
      metricType: 'boolean',
      text: 'Thực hành cầm máu và băng bó đúng kỹ thuật',
      orderIndex: 1,
    },
    {
      id: 'a0300001-0000-0000-0000-000000000008',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000004',
      metricType: 'boolean',
      text: 'Thực hành hô hấp nhân tạo trên mô hình',
      orderIndex: 2,
    },
    // KN-002 Định Hướng
    {
      id: 'a0300001-0000-0000-0000-000000000009',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000005',
      metricType: 'boolean',
      text: 'Sử dụng la bàn xác định 4 phương chính',
      orderIndex: 1,
    },
    {
      id: 'a0300001-0000-0000-0000-000000000010',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000005',
      metricType: 'boolean',
      text: 'Đọc bản đồ tìm 3 điểm tọa độ cho trước',
      orderIndex: 2,
    },
    // LD-001 Họp Đội
    {
      id: 'a0300001-0000-0000-0000-000000000011',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000006',
      metricType: 'count',
      targetValue: '2',
      unit: 'buổi',
      text: 'Điều phối ít nhất 2 buổi họp đội',
      orderIndex: 1,
    },
    {
      id: 'a0300001-0000-0000-0000-000000000012',
      orgId: org.id,
      skillId: 'b0000001-0000-0000-0000-000000000006',
      metricType: 'boolean',
      text: 'Soạn chương trình họp + ra nghị quyết',
      orderIndex: 2,
    },
  ];
  for (const c of criteriaDefs) {
    await prisma.skillCriteria.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // 8. EXP Configs (5 rules) — eventType is unique per org
  const expConfigs = [
    {
      id: 'c0000001-0000-0000-0000-000000000001',
      orgId: org.id,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      actionName: 'Tham dự sinh hoạt',
      expAmount: 10,
      maxPerDay: 50,
      maxPerWeek: 200,
      description: 'EXP khi tham dự buổi sinh hoạt',
    },
    {
      id: 'c0000001-0000-0000-0000-000000000002',
      orgId: org.id,
      eventType: 'scout.skill_verified',
      sourceModule: 'SCOUT',
      actionName: 'Kỹ năng được xác nhận',
      expAmount: 25,
      maxPerDay: 100,
      maxPerWeek: 500,
      description: 'EXP khi kỹ năng được xác nhận',
    },
    {
      id: 'c0000001-0000-0000-0000-000000000003',
      orgId: org.id,
      eventType: 'lms.course_completed',
      sourceModule: 'LMS',
      actionName: 'Hoàn thành khóa học',
      expAmount: 50,
      maxPerDay: 200,
      maxPerWeek: 500,
      description: 'EXP khi hoàn thành khóa học LMS',
    },
    {
      id: 'c0000001-0000-0000-0000-000000000004',
      orgId: org.id,
      eventType: 'event.checked_in',
      sourceModule: 'EVENTS',
      actionName: 'Tham dự sự kiện/trại',
      expAmount: 30,
      maxPerDay: 100,
      maxPerWeek: 300,
      description: 'EXP khi check-in sự kiện',
    },
    {
      id: 'c0000001-0000-0000-0000-000000000005',
      orgId: org.id,
      eventType: 'project.task_completed',
      sourceModule: 'PROJECTS',
      actionName: 'Hoàn thành nhiệm vụ',
      expAmount: 15,
      maxPerDay: 75,
      maxPerWeek: 300,
      description: 'EXP khi hoàn thành task dự án',
    },
  ];
  for (const e of expConfigs) {
    await prisma.expConfig.upsert({
      where: { orgId_eventType: { orgId: org.id, eventType: e.eventType } },
      update: {},
      create: e,
    });
  }

  // 9. Badge Definitions (10 badges)
  const badgeDefs = [
    {
      id: 'd0000001-0000-0000-0000-000000000001',
      orgId: org.id,
      badgeCode: 'FIRST_SESSION',
      name: 'Hạt Nhân Đầu Tiên',
      description: 'Hoàn thành buổi sinh hoạt đầu tiên',
      imageUrl: '🌱',
      badgeType: 'milestone',
      rarity: 'common',
      triggerEvent: 'session.attendance_marked',
      triggerConfig: { first: true },
      expReward: 10,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000002',
      orgId: org.id,
      badgeCode: 'STREAK_10',
      name: 'Chiến Binh Chuyên Cần',
      description: 'Tham dự 10 buổi sinh hoạt liên tiếp',
      imageUrl: '⚔️',
      badgeType: 'streak',
      rarity: 'uncommon',
      triggerEvent: 'session.attendance_marked',
      triggerConfig: { minStreak: 10 },
      expReward: 100,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000003',
      orgId: org.id,
      badgeCode: 'COURSE_COMPLETE',
      name: 'Người Học Giỏi',
      description: 'Hoàn thành 1 khóa học LMS',
      imageUrl: '📚',
      badgeType: 'academic',
      rarity: 'common',
      triggerEvent: 'lms.course_completed',
      triggerConfig: {},
      expReward: 50,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000004',
      orgId: org.id,
      badgeCode: 'NGU_GIOI_STREAK',
      name: 'Ngũ Giới Tuân Thủ',
      description: 'Tự đánh giá Ngũ Giới 4 tuần liên tiếp',
      imageUrl: '🙏',
      badgeType: 'spiritual',
      rarity: 'rare',
      triggerEvent: 'enrichment.self_assessment',
      triggerConfig: { minStreak: 4 },
      expReward: 80,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000005',
      orgId: org.id,
      badgeCode: 'FIRST_SKILL',
      name: 'Kỹ Năng Đầu Tiên',
      description: 'Hoàn thành kỹ năng đầu tiên',
      imageUrl: '🛡️',
      badgeType: 'skill',
      rarity: 'common',
      triggerEvent: 'scout.skill_verified',
      triggerConfig: { first: true },
      expReward: 30,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000006',
      orgId: org.id,
      badgeCode: 'CAMPER',
      name: 'Người Trại Giỏi',
      description: 'Tham gia và hoàn thành 1 trại',
      imageUrl: '🏕️',
      badgeType: 'event',
      rarity: 'uncommon',
      triggerEvent: 'event.completed',
      triggerConfig: { eventType: 'camp' },
      expReward: 150,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000007',
      orgId: org.id,
      badgeCode: 'FIRST_AID',
      name: 'Sơ Cứu Viên',
      description: 'Hoàn thành kỹ năng Sơ Cứu Cơ Bản lv.3',
      imageUrl: '🩺',
      badgeType: 'skill',
      rarity: 'uncommon',
      triggerEvent: 'scout.skill_verified',
      triggerConfig: { skillCode: 'KN-001', minLevel: 3 },
      expReward: 60,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000008',
      orgId: org.id,
      badgeCode: 'COMMUNITY_SERVICE',
      name: 'Phụng Sự Cộng Đồng',
      description: 'Hoàn thành 1 dự án phụng sự',
      imageUrl: '🌏',
      badgeType: 'service',
      rarity: 'rare',
      triggerEvent: 'project.completed',
      triggerConfig: {},
      expReward: 200,
      isAutoAward: true,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000009',
      orgId: org.id,
      badgeCode: 'TEAM_LEADER',
      name: 'Lãnh Đạo Nhỏ',
      description: 'Dẫn đội thành công 1 hoạt động',
      imageUrl: '👑',
      badgeType: 'leadership',
      rarity: 'rare',
      triggerEvent: null,
      triggerConfig: {},
      expReward: 300,
      isAutoAward: false,
    },
    {
      id: 'd0000001-0000-0000-0000-000000000010',
      orgId: org.id,
      badgeCode: 'TAM_TRU_BALANCE',
      name: 'Tam Trụ Cân Bằng',
      description: 'Đạt điểm SPICES cân bằng trong 1 tháng',
      imageUrl: '⚖️',
      badgeType: 'spices',
      rarity: 'epic',
      triggerEvent: 'reward.spices_balanced',
      triggerConfig: { minScore: 60 },
      expReward: 500,
      isAutoAward: true,
    },
  ];
  for (const b of badgeDefs) {
    await prisma.badgeDefinition.upsert({
      where: { orgId_badgeCode: { orgId: org.id, badgeCode: b.badgeCode } },
      update: {},
      create: { ...b, triggerConfig: b.triggerConfig as object },
    });
  }

  // 10. Sessions (3 sessions with SPICES tags)
  const sessionDefs = [
    {
      id: 'e0000001-0000-0000-0000-000000000001',
      orgId: org.id,
      branchId: branchThieu.id,
      title: 'Sinh Hoạt Kỹ Năng Sơ Cứu',
      sessionDate: new Date('2026-03-01'),
      startTime: '08:00',
      endTime: '11:00',
      location: 'Nhà Văn Hóa',
      sessionType: 'skill',
      status: 'completed',
      spicesTags: ['PHYSICAL', 'INTELLECTUAL'],
      expReward: 15,
    },
    {
      id: 'e0000001-0000-0000-0000-000000000002',
      orgId: org.id,
      branchId: branchDong.id,
      title: 'Sinh Hoạt Đạo Đức Tháng 3',
      sessionDate: new Date('2026-03-08'),
      startTime: '08:00',
      endTime: '10:30',
      location: 'Thánh Thất',
      sessionType: 'spiritual',
      status: 'published',
      spicesTags: ['SPIRITUAL', 'CHARACTER', 'EMOTIONAL'],
      expReward: 10,
    },
    {
      id: 'e0000001-0000-0000-0000-000000000003',
      orgId: org.id,
      branchId: branchThieu.id,
      title: 'Lên Kế Hoạch Trại Hè 2026',
      sessionDate: new Date('2026-03-15'),
      startTime: '14:00',
      endTime: '17:00',
      location: 'Sân Đoàn',
      sessionType: 'planning',
      status: 'planned',
      spicesTags: ['SOCIAL', 'INTELLECTUAL'],
      expReward: 10,
    },
  ];
  for (const s of sessionDefs) {
    await prisma.session.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // 11. Events with SPICES tags
  await prisma.event.upsert({
    where: { id: 'f0000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'f0000001-0000-0000-0000-000000000001',
      orgId: org.id,
      title: 'Trại Hè Thiện Tâm 2026',
      eventType: 'camp',
      startDate: new Date('2026-06-20'),
      endDate: new Date('2026-06-23'),
      location: 'Núi Bà Đen, Tây Ninh',
      maxParticipants: 50,
      targetBranches: ['THIEU', 'THANH'],
      status: 'planning',
      spicesTags: ['PHYSICAL', 'SOCIAL', 'SPIRITUAL', 'CHARACTER'],
      expReward: 100,
      registrationDeadline: new Date('2026-06-10'),
    },
  });
  await prisma.event.upsert({
    where: { id: 'f0000001-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'f0000001-0000-0000-0000-000000000002',
      orgId: org.id,
      title: 'Ngày Hội Kỹ Năng Tháng 4',
      eventType: 'day_event',
      startDate: new Date('2026-04-12'),
      endDate: new Date('2026-04-12'),
      location: 'Sân Thánh Thất',
      maxParticipants: 80,
      targetBranches: ['DONG', 'THIEU', 'THANH'],
      status: 'registration_open',
      spicesTags: ['PHYSICAL', 'INTELLECTUAL', 'SOCIAL'],
      expReward: 30,
      registrationDeadline: new Date('2026-04-05'),
    },
  });

  // 12. LMS: 1 Course + 3 Lessons with SPICES tags
  await prisma.course.upsert({
    where: { id: 'a1000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a1000001-0000-0000-0000-000000000001',
      orgId: org.id,
      title: 'Giáo Lý Cao Đài Nhập Môn',
      description: 'Khóa học cơ bản về Giáo lý Đại Đạo Tam Kỳ Phổ Độ cho Đoàn sinh mới',
      category: 'spiritual',
      difficulty: 'beginner',
      targetBranches: ['DONG', 'THIEU'],
      status: 'published',
      expReward: 80,
      spicesTags: ['SPIRITUAL', 'INTELLECTUAL', 'CHARACTER'],
      totalDuration: 120,
    },
  });
  const lessonDefs = [
    {
      id: 'a2000001-0000-0000-0000-000000000001',
      orgId: org.id,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      title: 'Bài 1: Tổng Quan Đại Đạo Tam Kỳ',
      orderIndex: 1,
      lessonType: 'text',
      content: {
        text: 'Đại Đạo Tam Kỳ Phổ Độ được khai sáng tại Tây Ninh năm 1926, mang sứ mệnh hòa hợp Tam Giáo...',
      },
      duration: 20,
      expReward: 10,
      spicesTags: ['SPIRITUAL', 'INTELLECTUAL'],
    },
    {
      id: 'a2000001-0000-0000-0000-000000000002',
      orgId: org.id,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      title: 'Bài 2: Ngũ Giới Cấm & Tam Cang Ngũ Thường',
      orderIndex: 2,
      lessonType: 'text',
      content: { text: 'Ngũ Giới Cấm là nền tảng đạo đức của người tín đồ Cao Đài...' },
      duration: 30,
      expReward: 15,
      spicesTags: ['CHARACTER', 'SPIRITUAL'],
    },
    {
      id: 'a2000001-0000-0000-0000-000000000003',
      orgId: org.id,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      title: 'Bài 3: Lễ Nghi Cúng Kính',
      orderIndex: 3,
      lessonType: 'text',
      content: {
        text: 'Lễ nghi trong Cao Đài bao gồm các thức cúng, lễ phục, và cử chỉ tôn kính...',
      },
      duration: 25,
      expReward: 15,
      spicesTags: ['SPIRITUAL', 'CHARACTER'],
    },
  ];
  for (const l of lessonDefs) {
    await prisma.lesson.upsert({ where: { id: l.id }, update: {}, create: l });
  }

  // 13. Finance Account
  await prisma.financialAccount.upsert({
    where: { id: 'a3000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a3000001-0000-0000-0000-000000000001',
      orgId: org.id,
      name: 'Quỹ Chính Liên Đoàn',
      accountType: 'general',
      currency: 'VND',
      currentBalance: 5000000,
      description: 'Quỹ hoạt động chính của Liên Đoàn',
    },
  });
  await prisma.financialAccount.upsert({
    where: { id: 'a3000001-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'a3000001-0000-0000-0000-000000000002',
      orgId: org.id,
      name: 'Quỹ Trại Hè 2026',
      accountType: 'event',
      currency: 'VND',
      currentBalance: 0,
      description: 'Quỹ dành riêng cho Trại Hè Thiện Tâm 2026',
    },
  });

  // 14. Assets (10 items in 2 categories)
  await prisma.assetCategory.upsert({
    where: { id: 'a4000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a4000001-0000-0000-0000-000000000001',
      orgId: org.id,
      name: 'Dụng Cụ Cắm Trại',
      description: 'Thiết bị và dụng cụ ngoài trời',
    },
  });
  await prisma.assetCategory.upsert({
    where: { id: 'a4000001-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'a4000001-0000-0000-0000-000000000002',
      orgId: org.id,
      name: 'Đồng Phục & Huy Hiệu',
      description: 'Đồng phục và phù hiệu các ngành',
    },
  });

  const assetDefs = [
    {
      id: 'a5000001-0000-0000-0000-000000000001',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000001',
      name: 'Lều Cắm Trại 4 Người',
      assetCode: 'CAMP-001',
      status: 'available',
      quantity: 5,
      availableQty: 5,
      condition: 'good',
      location: 'Kho Đoàn',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000002',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000001',
      name: 'La Bàn Cầm Tay',
      assetCode: 'NAV-001',
      status: 'available',
      quantity: 10,
      availableQty: 9,
      condition: 'good',
      location: 'Kho Đoàn',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000003',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000001',
      name: 'Túi Sơ Cứu Tiêu Chuẩn',
      assetCode: 'MED-001',
      status: 'available',
      quantity: 3,
      availableQty: 3,
      condition: 'new',
      location: 'Kho Đoàn',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000004',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000001',
      name: 'Đèn Pin Đội',
      assetCode: 'LIGHT-001',
      status: 'available',
      quantity: 8,
      availableQty: 8,
      condition: 'good',
      location: 'Kho Đoàn',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000005',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000001',
      name: 'Dây Thừng 20m',
      assetCode: 'ROPE-001',
      status: 'available',
      quantity: 5,
      availableQty: 5,
      condition: 'good',
      location: 'Kho Đoàn',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000006',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000002',
      name: 'Đồng Phục Ngành Thiếu (Size M)',
      assetCode: 'UNI-THIEU-M',
      status: 'available',
      quantity: 15,
      availableQty: 12,
      condition: 'good',
      location: 'Kho Đoàn',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000007',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000002',
      name: 'Đồng Phục Ngành Thiếu (Size L)',
      assetCode: 'UNI-THIEU-L',
      status: 'available',
      quantity: 10,
      availableQty: 10,
      condition: 'good',
      location: 'Kho Đoàn',
    },
  ];
  for (const a of assetDefs) {
    await prisma.asset.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  // 15. Plan & Project
  await prisma.plan.upsert({
    where: { id: 'a6000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a6000001-0000-0000-0000-000000000001',
      orgId: org.id,
      title: 'Kế Hoạch Quý 2/2026 — Ngành Thiếu',
      planType: 'quarterly',
      status: 'approved',
      sectionIDescription: 'Kế hoạch sinh hoạt Quý 2 cho Ngành Thiếu năm 2026',
      sectionIIObjectives: ['12 buổi sinh hoạt', '1 trại hè', '5 đoàn sinh thăng đẳng thứ'],
    },
  });
  await prisma.project.upsert({
    where: { id: 'a7000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a7000001-0000-0000-0000-000000000001',
      orgId: org.id,
      sourcePlanId: 'a6000001-0000-0000-0000-000000000001',
      title: 'Dự Án Tổ Chức Trại Hè Thiện Tâm 2026',
      description: 'Chuẩn bị và tổ chức trại hè cho Ngành Thiếu và Thanh',
      status: 'planning',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-06-23'),
    },
  });

  // 16. Notification Templates
  const notifTemplates = [
    {
      id: 'a8000001-0000-0000-0000-000000000001',
      orgId: org.id,
      eventType: 'session.reminder',
      channel: 'in_app',
      title: 'Nhắc nhở: Sinh hoạt sắp diễn ra',
      body: 'Buổi sinh hoạt "{{sessionTitle}}" sẽ diễn ra vào {{sessionDate}}. Đừng quên tham dự!',
      isActive: true,
    },
    {
      id: 'a8000001-0000-0000-0000-000000000002',
      orgId: org.id,
      eventType: 'reward.badge_awarded',
      channel: 'in_app',
      title: 'Chúc mừng! Bạn nhận được huy hiệu mới',
      body: 'Bạn vừa nhận được huy hiệu "{{badgeName}}"! {{badgeDescription}}',
      isActive: true,
    },
    {
      id: 'a8000001-0000-0000-0000-000000000003',
      orgId: org.id,
      eventType: 'event.registration_open',
      channel: 'in_app',
      title: 'Mở đăng ký: {{eventTitle}}',
      body: 'Sự kiện "{{eventTitle}}" đã mở đăng ký. Hạn: {{deadline}}.',
      isActive: true,
    },
  ];
  for (const t of notifTemplates) {
    await prisma.notificationTemplate.upsert({
      where: {
        orgId_eventType_channel: { orgId: org.id, eventType: t.eventType, channel: t.channel },
      },
      update: {},
      create: t,
    });
  }

  // 17. Member Profiles (T-0216)
  const memberIds = Array.from(
    { length: 12 },
    (_, i) => `eeeeeee1-0000-0000-0000-${String(i + 3).padStart(12, '0')}`,
  );
  const adminMemberIds = [
    'eeeeeee1-0000-0000-0000-000000000001',
    'eeeeeee1-0000-0000-0000-000000000002',
  ];
  const allMemberIds = [...adminMemberIds, ...memberIds];
  const profileDefs = [
    {
      id: 'a9000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: adminMemberIds[0]!,
      fullName: 'Nguyễn Văn An',
      birthDate: new Date('1990-03-15'),
      gender: 'male',
      address: '123 Đường Hoà Bình, Q.Tân Phú, TP.HCM',
      personalPhone: '0901111001',
      woodBadgeLevel: 'bead_2',
      specializations: ['camping', 'first_aid'],
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: adminMemberIds[1]!,
      fullName: 'Trần Thị Bình',
      birthDate: new Date('1992-07-22'),
      gender: 'female',
      address: '456 Đường Lý Thường Kiệt, Q.10, TP.HCM',
      personalPhone: '0901111002',
      woodBadgeLevel: 'bead_1',
      specializations: ['education', 'music'],
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      fullName: 'Lê Văn Cường',
      birthDate: new Date('2016-01-10'),
      gender: 'male',
      guardianName: 'Lê Văn Hùng',
      guardianPhone: '0903001001',
      guardianRelation: 'father',
      healthNotes: 'Không dị ứng',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      fullName: 'Phạm Thị Dung',
      birthDate: new Date('2015-05-20'),
      gender: 'female',
      guardianName: 'Phạm Thị Lan',
      guardianPhone: '0903001002',
      guardianRelation: 'mother',
      healthNotes: 'Dị ứng hải sản',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[2]!,
      fullName: 'Hoàng Văn Em',
      birthDate: new Date('2015-11-08'),
      gender: 'male',
      guardianName: 'Hoàng Văn Tâm',
      guardianPhone: '0903001003',
      guardianRelation: 'father',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000006',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      fullName: 'Vũ Thị Phương',
      birthDate: new Date('2012-04-14'),
      gender: 'female',
      guardianName: 'Vũ Văn Đức',
      guardianPhone: '0903001004',
      guardianRelation: 'father',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000007',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      fullName: 'Đinh Văn Giang',
      birthDate: new Date('2011-09-30'),
      gender: 'male',
      guardianName: 'Đinh Thị Hoa',
      guardianPhone: '0903001005',
      guardianRelation: 'mother',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000008',
      orgId: org.id,
      orgMemberId: memberIds[5]!,
      fullName: 'Bùi Thị Hoa',
      birthDate: new Date('2012-02-18'),
      gender: 'female',
      guardianName: 'Bùi Văn Khoa',
      guardianPhone: '0903001006',
      guardianRelation: 'father',
      healthNotes: 'Hen suyễn nhẹ',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000009',
      orgId: org.id,
      orgMemberId: memberIds[6]!,
      fullName: 'Đỗ Văn Khánh',
      birthDate: new Date('2011-06-25'),
      gender: 'male',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000010',
      orgId: org.id,
      orgMemberId: memberIds[7]!,
      fullName: 'Ngô Thị Lan',
      birthDate: new Date('2012-08-12'),
      gender: 'female',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000011',
      orgId: org.id,
      orgMemberId: memberIds[8]!,
      fullName: 'Lý Văn Minh',
      birthDate: new Date('2006-03-02'),
      gender: 'male',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000012',
      orgId: org.id,
      orgMemberId: memberIds[9]!,
      fullName: 'Dương Thị Nam',
      birthDate: new Date('2005-12-18'),
      gender: 'female',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000013',
      orgId: org.id,
      orgMemberId: memberIds[10]!,
      fullName: 'Tôn Văn Oanh',
      birthDate: new Date('2007-07-07'),
      gender: 'male',
      consentFormSigned: true,
    },
    {
      id: 'a9000001-0000-0000-0000-000000000014',
      orgId: org.id,
      orgMemberId: memberIds[11]!,
      fullName: 'Hà Thị Phúc',
      birthDate: new Date('2006-10-30'),
      gender: 'female',
      consentFormSigned: true,
    },
  ];
  for (const p of profileDefs) {
    await prisma.memberProfile.upsert({
      where: { orgMemberId: p.orgMemberId },
      update: {},
      create: p,
    });
  }

  // 18. Guardian Links (T-0216) — 6 child members in Đồng/Thiếu branches
  const guardianDefs = [
    {
      id: 'aa000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      fullName: 'Lê Văn Hùng',
      relation: 'father',
      phone: '0903001001',
      isPrimary: true,
      canPickup: true,
      consentSigned: true,
      consentDate: new Date('2024-01-01'),
    },
    {
      id: 'aa000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      fullName: 'Phạm Thị Lan',
      relation: 'mother',
      phone: '0903001002',
      isPrimary: true,
      canPickup: true,
      consentSigned: true,
      consentDate: new Date('2024-01-05'),
    },
    {
      id: 'aa000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[2]!,
      fullName: 'Hoàng Văn Tâm',
      relation: 'father',
      phone: '0903001003',
      isPrimary: true,
      canPickup: true,
      consentSigned: true,
      consentDate: new Date('2024-01-10'),
    },
    {
      id: 'aa000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      fullName: 'Vũ Văn Đức',
      relation: 'father',
      phone: '0903001004',
      isPrimary: true,
      canPickup: true,
      consentSigned: true,
      consentDate: new Date('2024-02-01'),
    },
    {
      id: 'aa000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      fullName: 'Đinh Thị Hoa',
      relation: 'mother',
      phone: '0903001005',
      isPrimary: true,
      canPickup: true,
      consentSigned: true,
      consentDate: new Date('2024-02-01'),
    },
    {
      id: 'aa000001-0000-0000-0000-000000000006',
      orgId: org.id,
      orgMemberId: memberIds[5]!,
      fullName: 'Bùi Văn Khoa',
      relation: 'father',
      phone: '0903001006',
      isPrimary: true,
      canPickup: true,
      consentSigned: true,
      consentDate: new Date('2024-02-15'),
    },
  ];
  for (const g of guardianDefs) {
    await prisma.guardianLink.upsert({
      where: {
        orgMemberId_fullName_relation: {
          orgMemberId: g.orgMemberId,
          fullName: g.fullName,
          relation: g.relation,
        },
      },
      update: {},
      create: g,
    });
  }

  // 19. Org Chart Nodes (T-0216) — 5 nodes: root + 3 branches + 1 deputy
  const rootNode = await prisma.orgChartNode.upsert({
    where: { id: 'ab000001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'ab000001-0000-0000-0000-000000000001',
      orgId: org.id,
      nodeType: 'leader',
      name: 'Liên Đoàn Trưởng',
      orgMemberId: adminMemberIds[0]!,
      positionTitle: 'Liên Đoàn Trưởng',
      displayOrder: 1,
      isActive: true,
    },
  });
  await prisma.orgChartNode.upsert({
    where: { id: 'ab000001-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'ab000001-0000-0000-0000-000000000002',
      orgId: org.id,
      nodeType: 'leader',
      name: 'Phó Liên Đoàn Trưởng',
      parentNodeId: rootNode.id,
      orgMemberId: adminMemberIds[1]!,
      positionTitle: 'Phó LĐT',
      displayOrder: 2,
      isActive: true,
    },
  });
  await prisma.orgChartNode.upsert({
    where: { id: 'ab000001-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: 'ab000001-0000-0000-0000-000000000003',
      orgId: org.id,
      nodeType: 'branch',
      name: 'Ngành Đồng',
      parentNodeId: rootNode.id,
      positionTitle: 'Trưởng Ngành Đồng',
      displayOrder: 3,
      isActive: true,
    },
  });
  await prisma.orgChartNode.upsert({
    where: { id: 'ab000001-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: 'ab000001-0000-0000-0000-000000000004',
      orgId: org.id,
      nodeType: 'branch',
      name: 'Ngành Thiếu',
      parentNodeId: rootNode.id,
      positionTitle: 'Trưởng Ngành Thiếu',
      displayOrder: 4,
      isActive: true,
    },
  });
  await prisma.orgChartNode.upsert({
    where: { id: 'ab000001-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: 'ab000001-0000-0000-0000-000000000005',
      orgId: org.id,
      nodeType: 'branch',
      name: 'Ngành Thanh',
      parentNodeId: rootNode.id,
      positionTitle: 'Trưởng Ngành Thanh',
      displayOrder: 5,
      isActive: true,
    },
  });

  // 20. Volunteer Availability (T-0216) — 2 Trưởng × 2 slots each
  const volDefs = [
    {
      id: 'ac000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: adminMemberIds[0]!,
      date: new Date('2026-03-15'),
      startTime: '08:00',
      endTime: '12:00',
      status: 'available',
      notes: 'Sáng thứ bảy',
    },
    {
      id: 'ac000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: adminMemberIds[0]!,
      date: new Date('2026-03-22'),
      startTime: '08:00',
      endTime: '12:00',
      status: 'available',
      notes: 'Sáng thứ bảy',
    },
    {
      id: 'ac000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: adminMemberIds[1]!,
      date: new Date('2026-03-15'),
      startTime: '14:00',
      endTime: '17:00',
      status: 'available',
      notes: 'Chiều thứ bảy',
    },
    {
      id: 'ac000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: adminMemberIds[1]!,
      date: new Date('2026-03-22'),
      startTime: '08:00',
      endTime: '17:00',
      status: 'available',
      notes: 'Cả ngày thứ bảy',
    },
  ];
  for (const v of volDefs) {
    await prisma.volunteerAvailability.upsert({ where: { id: v.id }, update: {}, create: v });
  }

  // 21. EXP Transactions (T-0217) — 15 ledger entries across 5 members
  const expTxDefs = [
    {
      id: 'ad000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 10,
      notes: 'Tham dự sinh hoạt Sơ Cứu',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      transactionType: 'earn',
      expAmount: 25,
      eventType: 'scout.skill_verified',
      sourceModule: 'SCOUT',
      balanceAfter: 35,
      notes: 'Kỹ năng Ngũ Giới Cấm lv.1',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 10,
      notes: 'Tham dự sinh hoạt Sơ Cứu',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 20,
      notes: 'Tham dự sinh hoạt Đạo Đức',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 10,
      notes: 'Tham dự sinh hoạt Sơ Cứu',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000006',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      transactionType: 'earn',
      expAmount: 25,
      eventType: 'scout.skill_verified',
      sourceModule: 'SCOUT',
      balanceAfter: 35,
      notes: 'Kỹ năng Sơ Cứu lv.1',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000007',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      transactionType: 'earn',
      expAmount: 25,
      eventType: 'scout.skill_verified',
      sourceModule: 'SCOUT',
      balanceAfter: 60,
      notes: 'Kỹ năng Sơ Cứu lv.2',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000008',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      transactionType: 'earn',
      expAmount: 50,
      eventType: 'lms.course_completed',
      sourceModule: 'LMS',
      balanceAfter: 110,
      notes: 'Hoàn thành Giáo Lý Nhập Môn',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000009',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 10,
      notes: 'Tham dự sinh hoạt Sơ Cứu',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000010',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 20,
      notes: 'Tham dự sinh hoạt Đạo Đức',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000011',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      transactionType: 'earn',
      expAmount: 25,
      eventType: 'scout.skill_verified',
      sourceModule: 'SCOUT',
      balanceAfter: 45,
      notes: 'Kỹ năng Ngũ Giới Cấm lv.1',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000012',
      orgId: org.id,
      orgMemberId: memberIds[5]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 10,
      notes: 'Tham dự sinh hoạt Sơ Cứu',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000013',
      orgId: org.id,
      orgMemberId: memberIds[5]!,
      transactionType: 'earn',
      expAmount: 15,
      eventType: 'project.task_completed',
      sourceModule: 'PROJECTS',
      balanceAfter: 25,
      notes: 'Hoàn thành nhiệm vụ chuẩn bị trại',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000014',
      orgId: org.id,
      orgMemberId: memberIds[8]!,
      transactionType: 'earn',
      expAmount: 30,
      eventType: 'event.checked_in',
      sourceModule: 'EVENTS',
      balanceAfter: 30,
      notes: 'Check-in Ngày Hội Kỹ Năng',
    },
    {
      id: 'ad000001-0000-0000-0000-000000000015',
      orgId: org.id,
      orgMemberId: memberIds[8]!,
      transactionType: 'earn',
      expAmount: 10,
      eventType: 'session.attendance_marked',
      sourceModule: 'SESSIONS',
      balanceAfter: 40,
      notes: 'Tham dự sinh hoạt Sơ Cứu',
    },
  ];
  for (const tx of expTxDefs) {
    await prisma.expTransaction.upsert({ where: { id: tx.id }, update: {}, create: tx });
  }

  // 22. Member EXP Summaries (T-0217)
  const expSummaryDefs = [
    {
      id: 'ae000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      totalExp: 35,
      availableExp: 35,
      tier1Count: 2,
    },
    {
      id: 'ae000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      totalExp: 20,
      availableExp: 20,
      tier1Count: 2,
    },
    {
      id: 'ae000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      totalExp: 110,
      availableExp: 110,
      tier1Count: 2,
      tier2Count: 2,
    },
    {
      id: 'ae000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      totalExp: 45,
      availableExp: 45,
      tier1Count: 3,
    },
    {
      id: 'ae000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[5]!,
      totalExp: 25,
      availableExp: 25,
      tier1Count: 2,
    },
    {
      id: 'ae000001-0000-0000-0000-000000000006',
      orgId: org.id,
      orgMemberId: memberIds[8]!,
      totalExp: 40,
      availableExp: 40,
      tier1Count: 1,
      tier2Count: 1,
    },
  ];
  for (const es of expSummaryDefs) {
    await prisma.memberExpSummary.upsert({
      where: { orgMemberId: es.orgMemberId },
      update: {},
      create: es,
    });
  }

  // 23. Member Ranks (T-0217) — 5 members with current rank
  const memberRankDefs = [
    {
      id: 'af000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      branchId: branchDong.id,
      rankId: 'ffffffff-0000-0000-0000-000000000001',
      status: 'completed',
      startedAt: new Date('2024-02-01'),
      completedAt: new Date('2024-06-15'),
    },
    {
      id: 'af000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      branchId: branchDong.id,
      rankId: 'ffffffff-0000-0000-0000-000000000001',
      status: 'in_progress',
      startedAt: new Date('2024-03-01'),
    },
    {
      id: 'af000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      branchId: branchThieu.id,
      rankId: 'ffffffff-0000-0000-0000-000000000002',
      status: 'completed',
      startedAt: new Date('2024-01-15'),
      completedAt: new Date('2024-09-30'),
    },
    {
      id: 'af000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      branchId: branchThieu.id,
      rankId: 'ffffffff-0000-0000-0000-000000000002',
      status: 'in_progress',
      startedAt: new Date('2024-04-01'),
    },
    {
      id: 'af000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[8]!,
      branchId: branchThanh.id,
      rankId: 'ffffffff-0000-0000-0000-000000000004',
      status: 'in_progress',
      startedAt: new Date('2025-01-10'),
    },
  ];
  for (const mr of memberRankDefs) {
    await prisma.memberRank.upsert({
      where: {
        orgMemberId_branchId_rankId: {
          orgMemberId: mr.orgMemberId,
          branchId: mr.branchId,
          rankId: mr.rankId,
        },
      },
      update: {},
      create: mr,
    });
  }

  // 24. Member Badges (T-0217) — award 5 badges
  const memberBadgeDefs = [
    {
      id: 'b1000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      badgeId: 'd0000001-0000-0000-0000-000000000001',
      earnedAt: new Date('2024-03-01'),
      notes: 'Buổi sinh hoạt đầu tiên',
    },
    {
      id: 'b1000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      badgeId: 'd0000001-0000-0000-0000-000000000001',
      earnedAt: new Date('2024-02-01'),
      notes: 'Buổi sinh hoạt đầu tiên',
    },
    {
      id: 'b1000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      badgeId: 'd0000001-0000-0000-0000-000000000003',
      earnedAt: new Date('2026-02-28'),
      notes: 'Hoàn thành khóa Giáo Lý Nhập Môn',
    },
    {
      id: 'b1000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      badgeId: 'd0000001-0000-0000-0000-000000000005',
      earnedAt: new Date('2024-06-15'),
      notes: 'Hoàn thành kỹ năng đầu tiên',
    },
    {
      id: 'b1000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      badgeId: 'd0000001-0000-0000-0000-000000000001',
      earnedAt: new Date('2024-04-01'),
      notes: 'Buổi sinh hoạt đầu tiên',
    },
  ];
  for (const mb of memberBadgeDefs) {
    await prisma.memberBadge.upsert({
      where: { orgMemberId_badgeId: { orgMemberId: mb.orgMemberId, badgeId: mb.badgeId } },
      update: {},
      create: mb,
    });
  }

  // 25. Session Attendance (T-0218) — 20 records across 3 sessions
  const attendanceDefs = [
    // Session 1: Sơ Cứu (branchThieu) — 8 attendees
    {
      id: 'b2000001-0000-0000-0000-000000000001',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[3]!,
      status: 'present',
      checkInTime: new Date('2026-03-01T08:05:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000002',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[4]!,
      status: 'present',
      checkInTime: new Date('2026-03-01T07:55:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000003',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[5]!,
      status: 'present',
      checkInTime: new Date('2026-03-01T08:10:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000004',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[6]!,
      status: 'present',
      checkInTime: new Date('2026-03-01T08:00:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000005',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[7]!,
      status: 'absent',
    },
    {
      id: 'b2000001-0000-0000-0000-000000000006',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[0]!,
      status: 'present',
      checkInTime: new Date('2026-03-01T08:02:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000007',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[1]!,
      status: 'present',
      checkInTime: new Date('2026-03-01T08:08:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000008',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[8]!,
      status: 'present',
      checkInTime: new Date('2026-03-01T08:15:00'),
    },
    // Session 2: Đạo Đức (branchDong) — 5 attendees
    {
      id: 'b2000001-0000-0000-0000-000000000009',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[0]!,
      status: 'present',
      checkInTime: new Date('2026-03-08T08:00:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000010',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[1]!,
      status: 'present',
      checkInTime: new Date('2026-03-08T08:05:00'),
    },
    {
      id: 'b2000001-0000-0000-0000-000000000011',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[2]!,
      status: 'excused',
      excusedReason: 'Bệnh',
    },
    {
      id: 'b2000001-0000-0000-0000-000000000012',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[4]!,
      status: 'present',
      checkInTime: new Date('2026-03-08T08:10:00'),
    },
    // Session 3: Kế Hoạch Trại (branchThieu) — future, no attendance yet
    // (planned session — no attendance records)
    // Extra: cross-branch attendance for member in both sessions
    {
      id: 'b2000001-0000-0000-0000-000000000013',
      orgId: org.id,
      sessionId: 'e0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[5]!,
      status: 'present',
      checkInTime: new Date('2026-03-08T08:12:00'),
    },
  ];
  for (const a of attendanceDefs) {
    await prisma.sessionAttendance.upsert({
      where: { sessionId_orgMemberId: { sessionId: a.sessionId, orgMemberId: a.orgMemberId } },
      update: {},
      create: a,
    });
  }

  // 26. Event Registrations (T-0218) — 8 registrations for 2 events
  const eventRegDefs = [
    {
      id: 'b3000001-0000-0000-0000-000000000001',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[3]!,
      status: 'registered',
      consentSigned: true,
      consentDate: new Date('2026-03-05'),
      consentBy: 'Vũ Văn Đức (Phụ huynh)',
    },
    {
      id: 'b3000001-0000-0000-0000-000000000002',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[4]!,
      status: 'registered',
      consentSigned: true,
      consentDate: new Date('2026-03-06'),
      consentBy: 'Đinh Thị Hoa (Phụ huynh)',
    },
    {
      id: 'b3000001-0000-0000-0000-000000000003',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[5]!,
      status: 'registered',
      consentSigned: false,
    },
    {
      id: 'b3000001-0000-0000-0000-000000000004',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000001',
      orgMemberId: memberIds[8]!,
      status: 'registered',
      consentSigned: true,
      consentDate: new Date('2026-03-07'),
    },
    {
      id: 'b3000001-0000-0000-0000-000000000005',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[0]!,
      status: 'registered',
      consentSigned: true,
      consentDate: new Date('2026-03-20'),
    },
    {
      id: 'b3000001-0000-0000-0000-000000000006',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[3]!,
      status: 'registered',
      consentSigned: true,
      consentDate: new Date('2026-03-20'),
    },
    {
      id: 'b3000001-0000-0000-0000-000000000007',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[8]!,
      status: 'checked_in',
      consentSigned: true,
      consentDate: new Date('2026-03-20'),
      checkInTime: new Date('2026-04-12T08:30:00'),
    },
    {
      id: 'b3000001-0000-0000-0000-000000000008',
      orgId: org.id,
      eventId: 'f0000001-0000-0000-0000-000000000002',
      orgMemberId: memberIds[10]!,
      status: 'registered',
      consentSigned: true,
      consentDate: new Date('2026-03-25'),
    },
  ];
  for (const er of eventRegDefs) {
    await prisma.eventRegistration.upsert({
      where: { eventId_orgMemberId: { eventId: er.eventId, orgMemberId: er.orgMemberId } },
      update: {},
      create: er,
    });
  }

  // 27. Member Course Progress (T-0218) — 5 progress records
  const courseProgressDefs = [
    {
      id: 'b4000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      status: 'in_progress',
      progressPct: 33,
      startedAt: new Date('2026-02-15'),
      expEarned: 10,
    },
    {
      id: 'b4000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      status: 'in_progress',
      progressPct: 66,
      startedAt: new Date('2026-02-10'),
      expEarned: 25,
    },
    {
      id: 'b4000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      status: 'completed',
      progressPct: 100,
      startedAt: new Date('2026-01-20'),
      completedAt: new Date('2026-02-28'),
      expEarned: 80,
    },
    {
      id: 'b4000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      status: 'not_started',
      progressPct: 0,
    },
    {
      id: 'b4000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[8]!,
      courseId: 'a1000001-0000-0000-0000-000000000001',
      status: 'in_progress',
      progressPct: 33,
      startedAt: new Date('2026-03-01'),
      expEarned: 10,
    },
  ];
  for (const cp of courseProgressDefs) {
    await prisma.memberCourseProgress.upsert({
      where: { orgMemberId_courseId: { orgMemberId: cp.orgMemberId, courseId: cp.courseId } },
      update: {},
      create: cp,
    });
  }

  // 28. Member Skill Progress (T-0219) — 8 progress records
  const skillProgressDefs = [
    {
      id: 'b5000001-0000-0000-0000-000000000001',
      orgId: org.id,
      orgMemberId: memberIds[0]!,
      skillId: 'b0000001-0000-0000-0000-000000000001',
      status: 'verified',
      currentLevel: 1,
      startedAt: new Date('2024-03-01'),
      verifiedAt: new Date('2024-06-15'),
    },
    {
      id: 'b5000001-0000-0000-0000-000000000002',
      orgId: org.id,
      orgMemberId: memberIds[1]!,
      skillId: 'b0000001-0000-0000-0000-000000000001',
      status: 'in_progress',
      currentLevel: 0,
      startedAt: new Date('2024-05-01'),
    },
    {
      id: 'b5000001-0000-0000-0000-000000000003',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      skillId: 'b0000001-0000-0000-0000-000000000004',
      status: 'verified',
      currentLevel: 2,
      startedAt: new Date('2024-02-01'),
      verifiedAt: new Date('2024-08-30'),
    },
    {
      id: 'b5000001-0000-0000-0000-000000000004',
      orgId: org.id,
      orgMemberId: memberIds[3]!,
      skillId: 'b0000001-0000-0000-0000-000000000001',
      status: 'verified',
      currentLevel: 1,
      startedAt: new Date('2024-03-15'),
      verifiedAt: new Date('2024-07-20'),
    },
    {
      id: 'b5000001-0000-0000-0000-000000000005',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      skillId: 'b0000001-0000-0000-0000-000000000001',
      status: 'verified',
      currentLevel: 1,
      startedAt: new Date('2024-04-01'),
      verifiedAt: new Date('2024-09-15'),
    },
    {
      id: 'b5000001-0000-0000-0000-000000000006',
      orgId: org.id,
      orgMemberId: memberIds[4]!,
      skillId: 'b0000001-0000-0000-0000-000000000005',
      status: 'in_progress',
      currentLevel: 1,
      startedAt: new Date('2025-01-10'),
    },
    {
      id: 'b5000001-0000-0000-0000-000000000007',
      orgId: org.id,
      orgMemberId: memberIds[5]!,
      skillId: 'b0000001-0000-0000-0000-000000000004',
      status: 'in_progress',
      currentLevel: 1,
      startedAt: new Date('2025-02-01'),
    },
    {
      id: 'b5000001-0000-0000-0000-000000000008',
      orgId: org.id,
      orgMemberId: memberIds[8]!,
      skillId: 'b0000001-0000-0000-0000-000000000006',
      status: 'in_progress',
      currentLevel: 1,
      startedAt: new Date('2025-03-01'),
    },
  ];
  for (const sp of skillProgressDefs) {
    await prisma.memberSkillProgress.upsert({
      where: { orgMemberId_skillId: { orgMemberId: sp.orgMemberId, skillId: sp.skillId } },
      update: {},
      create: sp,
    });
  }

  // 29. Skill Verifications (T-0219) — 5 verification records
  const verificationDefs = [
    {
      id: 'b6000001-0000-0000-0000-000000000001',
      orgId: org.id,
      progressId: 'b5000001-0000-0000-0000-000000000001',
      verifierPersonId: adminMemberIds[0]!,
      decision: 'approved',
      comment: 'Thuộc Ngũ Giới Cấm tốt',
      decidedAt: new Date('2024-06-15'),
    },
    {
      id: 'b6000001-0000-0000-0000-000000000002',
      orgId: org.id,
      progressId: 'b5000001-0000-0000-0000-000000000003',
      verifierPersonId: adminMemberIds[0]!,
      decision: 'approved',
      comment: 'Thực hành cầm máu + băng bó đúng kỹ thuật',
      decidedAt: new Date('2024-08-30'),
    },
    {
      id: 'b6000001-0000-0000-0000-000000000003',
      orgId: org.id,
      progressId: 'b5000001-0000-0000-0000-000000000004',
      verifierPersonId: adminMemberIds[1]!,
      decision: 'approved',
      comment: 'Nhận biết Ngũ Giới tốt',
      decidedAt: new Date('2024-07-20'),
    },
    {
      id: 'b6000001-0000-0000-0000-000000000004',
      orgId: org.id,
      progressId: 'b5000001-0000-0000-0000-000000000005',
      verifierPersonId: adminMemberIds[0]!,
      decision: 'approved',
      comment: 'Ngũ Giới Cấm lv.1 đạt',
      decidedAt: new Date('2024-09-15'),
    },
    {
      id: 'b6000001-0000-0000-0000-000000000005',
      orgId: org.id,
      progressId: 'b5000001-0000-0000-0000-000000000003',
      verifierPersonId: adminMemberIds[1]!,
      decision: 'approved',
      comment: 'Sơ Cứu lv.2 — hô hấp nhân tạo đạt chuẩn',
      decidedAt: new Date('2024-08-30'),
    },
  ];
  for (const sv of verificationDefs) {
    await prisma.skillVerification.upsert({ where: { id: sv.id }, update: {}, create: sv });
  }

  // 30. Habit Definitions & Logs (T-0219)
  const habitDefDefs = [
    {
      id: 'b7000001-0000-0000-0000-000000000001',
      orgId: org.id,
      key: 'ngu_gioi_daily',
      name: 'Tự đánh giá Ngũ Giới hàng ngày',
      cadence: 'daily',
      scoringRule: { type: 'streak', pointsPerDay: 5 },
      isActive: true,
    },
    {
      id: 'b7000001-0000-0000-0000-000000000002',
      orgId: org.id,
      key: 'morning_prayer',
      name: 'Cúng thời Tý (sáng)',
      cadence: 'daily',
      scoringRule: { type: 'streak', pointsPerDay: 3 },
      isActive: true,
    },
    {
      id: 'b7000001-0000-0000-0000-000000000003',
      orgId: org.id,
      key: 'weekly_reflection',
      name: 'Tự kiểm tuần',
      cadence: 'weekly',
      scoringRule: { type: 'completion', pointsPerWeek: 10 },
      isActive: true,
    },
  ];
  for (const hd of habitDefDefs) {
    await prisma.habitDef.upsert({
      where: { orgId_key: { orgId: org.id, key: hd.key } },
      update: {},
      create: hd,
    });
  }

  const habitLogDefs = [
    {
      id: 'b8000001-0000-0000-0000-000000000001',
      orgId: org.id,
      personId: memberIds[3]!,
      habitDefId: 'b7000001-0000-0000-0000-000000000001',
      logDate: new Date('2026-03-01'),
      status: 'completed',
      note: 'Không phạm giới',
    },
    {
      id: 'b8000001-0000-0000-0000-000000000002',
      orgId: org.id,
      personId: memberIds[3]!,
      habitDefId: 'b7000001-0000-0000-0000-000000000001',
      logDate: new Date('2026-03-02'),
      status: 'completed',
    },
    {
      id: 'b8000001-0000-0000-0000-000000000003',
      orgId: org.id,
      personId: memberIds[3]!,
      habitDefId: 'b7000001-0000-0000-0000-000000000001',
      logDate: new Date('2026-03-03'),
      status: 'missed',
    },
    {
      id: 'b8000001-0000-0000-0000-000000000004',
      orgId: org.id,
      personId: memberIds[4]!,
      habitDefId: 'b7000001-0000-0000-0000-000000000002',
      logDate: new Date('2026-03-01'),
      status: 'completed',
      note: 'Cúng đầy đủ',
    },
    {
      id: 'b8000001-0000-0000-0000-000000000005',
      orgId: org.id,
      personId: memberIds[4]!,
      habitDefId: 'b7000001-0000-0000-0000-000000000002',
      logDate: new Date('2026-03-02'),
      status: 'completed',
    },
    {
      id: 'b8000001-0000-0000-0000-000000000006',
      orgId: org.id,
      personId: memberIds[8]!,
      habitDefId: 'b7000001-0000-0000-0000-000000000003',
      logDate: new Date('2026-03-07'),
      status: 'completed',
      note: 'Tuần tốt, hoàn thành mục tiêu sinh hoạt',
    },
  ];
  for (const hl of habitLogDefs) {
    await prisma.habitLog.upsert({
      where: {
        personId_habitDefId_logDate: {
          personId: hl.personId,
          habitDefId: hl.habitDefId,
          logDate: hl.logDate,
        },
      },
      update: {},
      create: hl,
    });
  }


  // ── T-1057: Approval Definitions (5 core DTNDD workflows) ──
  const approvalDefs = [
    {
      id: 'b9000001-0000-0000-0000-000000000001',
      orgId: org.id,
      name: 'Xin phép nghỉ',
      description: 'Huynh trưởng/đoàn sinh xin phép vắng mặt sinh hoạt',
      entityType: 'leave_request',
      isActive: true,
      steps: [{ name: 'Đội trưởng duyệt', type: 'sequential', signerRole: 'unit_leader' }],
      triggerConditions: [],
      thresholds: [],
      createdBy: 'dddddddd-0000-0000-0000-000000000001',
    },
    {
      id: 'b9000001-0000-0000-0000-000000000002',
      orgId: org.id,
      name: 'Xin cấp kinh phí',
      description: 'Yêu cầu duyệt ngân sách cho hoạt động',
      entityType: 'budget',
      isActive: true,
      steps: [
        { name: 'Trưởng duyệt', type: 'sequential', signerRole: 'branch_leader' },
        { name: 'Tài chính duyệt', type: 'sequential', signerRole: 'finance_admin' },
      ],
      triggerConditions: [{ field: 'amount', operator: 'gte', value: 500000 }],
      thresholds: [{ minAmount: 500000, maxAmount: 5000000, requiredRole: 'branch_leader', requiredLevel: 1 }],
      createdBy: 'dddddddd-0000-0000-0000-000000000001',
    },
    {
      id: 'b9000001-0000-0000-0000-000000000003',
      orgId: org.id,
      name: 'Đồng ý tham gia trại',
      description: 'Phụ huynh duyệt cho con em tham gia trại/sự kiện qua đêm',
      entityType: 'event',
      isActive: true,
      steps: [{ name: 'Phụ huynh đồng ý', type: 'sequential', signerRole: 'guardian' }],
      triggerConditions: [{ field: 'eventType', operator: 'eq', value: 'camp' }],
      thresholds: [],
      createdBy: 'dddddddd-0000-0000-0000-000000000001',
    },
    {
      id: 'b9000001-0000-0000-0000-000000000004',
      orgId: org.id,
      name: 'Leo thang sự cố',
      description: 'Báo cáo sự cố cần xử lý cấp trên (child-safety)',
      entityType: 'ticket',
      isActive: true,
      steps: [{ name: 'Trưởng ban an toàn duyệt', type: 'sequential', signerRole: 'safety_officer' }],
      triggerConditions: [{ field: 'category', operator: 'eq', value: 'incident' }],
      thresholds: [],
      createdBy: 'dddddddd-0000-0000-0000-000000000001',
    },
    {
      id: 'b9000001-0000-0000-0000-000000000005',
      orgId: org.id,
      name: 'Thanh toán chi tiêu',
      description: 'Xin hoàn trả chi phí đã ứng trước cho hoạt động',
      entityType: 'budget',
      isActive: true,
      steps: [{ name: 'Thủ quỹ duyệt', type: 'sequential', signerRole: 'finance_admin' }],
      triggerConditions: [],
      thresholds: [{ minAmount: 0, maxAmount: 2000000, requiredRole: 'finance_admin', requiredLevel: 1 }],
      createdBy: 'dddddddd-0000-0000-0000-000000000001',
    },
  ];
  for (const ad of approvalDefs) {
    await prisma.approvalDefinition.upsert({
      where: { id: ad.id },
      update: {},
      create: ad,
    });
  }

  // Summary
  console.log('');
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('──────────────────────────────────');
  console.log(`  Org: ${org.name} (${org.id})`);
  console.log(`  Branches: 3 (Đồng / Thiếu / Thanh)`);
  console.log(`  Units: 4`);
  console.log(`  Users: 14 (2 Trưởng + 12 Đoàn sinh)`);
  console.log(`  Ranks: 4`);
  console.log(`  Skill Groups: 3 | Skills: ${skillDefs.length}`);
  console.log(`  EXP Configs: ${expConfigs.length}`);
  console.log(`  Badges: ${badgeDefs.length}`);
  console.log(`  Sessions: ${sessionDefs.length}`);
  console.log(`  Events: 2`);
  console.log(`  Course + Lessons: 1 course, 3 lessons`);
  console.log(`  Finance Accounts: 2`);
  console.log(`  Assets: ${assetDefs.length} in 2 categories`);
  console.log(`  Plan + Project: 1 each`);
  console.log(`  Notification Templates: ${notifTemplates.length}`);
  console.log(`  Member Profiles: ${profileDefs.length}`);
  console.log(`  Guardian Links: ${guardianDefs.length}`);
  console.log(`  Org Chart Nodes: 5`);
  console.log(`  Volunteer Availability: ${volDefs.length}`);
  console.log(`  EXP Transactions: ${expTxDefs.length}`);
  console.log(`  Member EXP Summaries: ${expSummaryDefs.length}`);
  console.log(`  Member Ranks: ${memberRankDefs.length}`);
  console.log(`  Member Badges: ${memberBadgeDefs.length}`);
  console.log(`  Session Attendance: ${attendanceDefs.length}`);
  console.log(`  Event Registrations: ${eventRegDefs.length}`);
  console.log(`  Course Progress: ${courseProgressDefs.length}`);
  console.log(`  Skill Progress: ${skillProgressDefs.length}`);
  console.log(`  Skill Verifications: ${verificationDefs.length}`);
  console.log(`  Habit Defs: ${habitDefDefs.length} | Habit Logs: ${habitLogDefs.length}`);
  console.log('──────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
