import { PrismaClient } from '@prisma/client';
import { seedLms } from './seed-lms';

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

  // 14b. More Assets (T-1097: armory expansion)
  const moreAssets = [
    {
      id: 'a5000001-0000-0000-0000-000000000008',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000001',
      name: 'Bếp Gas Di Động',
      assetCode: 'COOK-001',
      status: 'available',
      quantity: 3,
      availableQty: 3,
      condition: 'good',
      location: 'Kho Đoàn',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000009',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000001',
      name: 'Nồi Quân Dụng 20L',
      assetCode: 'COOK-002',
      status: 'maintenance',
      quantity: 4,
      availableQty: 2,
      condition: 'fair',
      location: 'Xưởng Sửa Chữa',
    },
    {
      id: 'a5000001-0000-0000-0000-000000000010',
      orgId: org.id,
      categoryId: 'a4000001-0000-0000-0000-000000000002',
      name: 'Khăn Quàng Đoàn',
      assetCode: 'UNI-SCARF-01',
      status: 'available',
      quantity: 30,
      availableQty: 28,
      condition: 'good',
      location: 'Kho Đoàn',
    },
  ];
  for (const a of moreAssets) {
    await prisma.asset.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  // 14c. Kit Templates (T-1097)
  await prisma.kitTemplate.upsert({
    where: { id: 'a5100001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a5100001-0000-0000-0000-000000000001',
      orgId: org.id,
      name: 'Bộ Kit Cắm Trại 4 Người',
      description: 'Kit tiêu chuẩn cho 1 đội 4 người đi trại',
      kitType: 'camp',
      createdBy: 'dddddddd-0000-0000-0000-000000000001',
    },
  });
  const kitItems = [
    {
      id: 'a5200001-0000-0000-0000-000000000001',
      orgId: org.id,
      templateId: 'a5100001-0000-0000-0000-000000000001',
      itemName: 'Lều 4 người',
      quantity: 1,
      isRequired: true,
    },
    {
      id: 'a5200001-0000-0000-0000-000000000002',
      orgId: org.id,
      templateId: 'a5100001-0000-0000-0000-000000000001',
      itemName: 'Đèn pin đội',
      quantity: 2,
      isRequired: true,
    },
    {
      id: 'a5200001-0000-0000-0000-000000000003',
      orgId: org.id,
      templateId: 'a5100001-0000-0000-0000-000000000001',
      itemName: 'Dây thừng 20m',
      quantity: 1,
      isRequired: true,
    },
    {
      id: 'a5200001-0000-0000-0000-000000000004',
      orgId: org.id,
      templateId: 'a5100001-0000-0000-0000-000000000001',
      itemName: 'La bàn',
      quantity: 1,
      isRequired: false,
      notes: 'Tùy chọn nếu có bài la bàn',
    },
    {
      id: 'a5200001-0000-0000-0000-000000000005',
      orgId: org.id,
      templateId: 'a5100001-0000-0000-0000-000000000001',
      itemName: 'Túi sơ cứu',
      quantity: 1,
      isRequired: true,
    },
  ];
  for (const ki of kitItems) {
    await prisma.kitTemplateItem.upsert({ where: { id: ki.id }, update: {}, create: ki });
  }

  // 14d. Maintenance Schedules (T-1097)
  const maintenanceDefs = [
    {
      id: 'a5300001-0000-0000-0000-000000000001',
      orgId: org.id,
      assetId: 'a5000001-0000-0000-0000-000000000001',
      maintenanceType: 'Kiểm tra chống thấm',
      frequency: 'quarterly',
      nextDue: new Date('2026-06-01'),
      status: 'scheduled',
    },
    {
      id: 'a5300001-0000-0000-0000-000000000002',
      orgId: org.id,
      assetId: 'a5000001-0000-0000-0000-000000000009',
      maintenanceType: 'Vệ sinh & kiểm tra',
      frequency: 'monthly',
      nextDue: new Date('2026-04-01'),
      status: 'scheduled',
      notes: 'Nồi có dấu hiệu rỉ sét nhẹ',
    },
  ];
  for (const m of maintenanceDefs) {
    await prisma.maintenanceSchedule.upsert({ where: { id: m.id }, update: {}, create: m });
  }

  // 14e. Uniform Issues (T-1097)
  const uniformDefs = [
    {
      id: 'a5400001-0000-0000-0000-000000000001',
      orgId: org.id,
      memberId: 'eeeeeee1-0000-0000-0000-000000000005',
      uniformType: 'Đồng phục Ngành Thiếu',
      size: 'M',
      quantity: 1,
      status: 'issued',
      issuedDate: new Date('2026-01-15'),
    },
    {
      id: 'a5400001-0000-0000-0000-000000000002',
      orgId: org.id,
      memberId: 'eeeeeee1-0000-0000-0000-000000000006',
      uniformType: 'Đồng phục Ngành Thiếu',
      size: 'L',
      quantity: 1,
      status: 'issued',
      issuedDate: new Date('2026-01-15'),
    },
  ];
  for (const u of uniformDefs) {
    await prisma.uniformIssue.upsert({ where: { id: u.id }, update: {}, create: u });
  }

  // 14f. Sample Loans (T-1097) — 1 normal + 1 guardian pending
  await prisma.assetLoan.upsert({
    where: { id: 'a5500001-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'a5500001-0000-0000-0000-000000000001',
      orgId: org.id,
      assetId: 'a5000001-0000-0000-0000-000000000002',
      borrowerId: 'eeeeeee1-0000-0000-0000-000000000005',
      quantity: 1,
      purpose: 'Bài tập đọc bản đồ',
      status: 'checked_out',
      expectedReturn: new Date('2026-03-20'),
      approvedBy: 'dddddddd-0000-0000-0000-000000000001',
      approvedAt: new Date('2026-03-10'),
      checkedOutAt: new Date('2026-03-10'),
    },
  });
  await prisma.assetLoan.upsert({
    where: { id: 'a5500001-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'a5500001-0000-0000-0000-000000000002',
      orgId: org.id,
      assetId: 'a5000001-0000-0000-0000-000000000004',
      borrowerId: 'eeeeeee1-0000-0000-0000-000000000004',
      quantity: 2,
      purpose: 'Sinh hoạt ngoài trời',
      status: 'approved',
      expectedReturn: new Date('2026-04-05'),
      approvedBy: 'dddddddd-0000-0000-0000-000000000002',
      approvedAt: new Date('2026-03-12'),
      guardianAcceptanceStatus: 'pending',
    },
  });

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
  console.log(`  Assets: ${assetDefs.length + moreAssets.length} in 2 categories`);
  console.log(`  Kit Templates: 1 (${kitItems.length} items)`);
  console.log(`  Maintenance Schedules: ${maintenanceDefs.length}`);
  console.log(`  Uniform Issues: ${uniformDefs.length}`);
  console.log(`  Asset Loans: 2`);
  console.log(`  Plan + Project: 1 each`);
  console.log(`  Notification Templates: ${notifTemplates.length}`);
  console.log('──────────────────────────────────');

  // LMS Phase M7 seed data
  await seedLms(org.id);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
