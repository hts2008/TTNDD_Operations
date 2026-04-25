import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRewards(orgId: string) {
  console.log('🏆 Seeding Rewards data...');

  await prisma.expConfig.createMany({
    data: [
      {
        orgId,
        eventType: 'member.activated',
        sourceModule: 'hrm',
        actionName: 'welcome_bonus',
        expAmount: 10,
        maxPerDay: 1,
        maxPerWeek: 1,
        description: 'Welcome EXP for new member activation',
      },
      {
        orgId,
        eventType: 'session.attendance_marked',
        sourceModule: 'session',
        actionName: 'attendance_reward',
        expAmount: 5,
        maxPerDay: 2,
        maxPerWeek: 10,
        description: 'EXP for attending a session',
      },
      {
        orgId,
        eventType: 'scout.skill_verified',
        sourceModule: 'scout',
        actionName: 'skill_mastery',
        expAmount: 20,
        maxPerDay: 5,
        maxPerWeek: 20,
        description: 'EXP for verified skill mastery',
      },
      {
        orgId,
        eventType: 'lms.lesson_completed',
        sourceModule: 'lms',
        actionName: 'lesson_completion',
        expAmount: 5,
        maxPerDay: 10,
        maxPerWeek: 30,
        description: 'EXP for completing a lesson',
      },
      {
        orgId,
        eventType: 'enrichment.spiritual_log_created',
        sourceModule: 'enrichment',
        actionName: 'spiritual_practice',
        expAmount: 5,
        maxPerDay: 2,
        maxPerWeek: 7,
        description: 'EXP for spiritual practice logging',
      },
    ],
  });

  await prisma.badgeDefinition.createMany({
    data: [
      {
        orgId,
        badgeCode: 'first-step',
        name: 'Bước Đầu Tiên',
        description: 'Tham gia buổi sinh hoạt đầu tiên',
        badgeType: 'milestone',
        imageUrl: '/badges/first-step.svg',
        rarity: 'common',
        triggerEvent: 'session.attendance_marked',
        expReward: 10,
        isAutoAward: true,
      },
      {
        orgId,
        badgeCode: 'spiritual-seeker',
        name: 'Người Tìm Đạo',
        description: 'Hoàn thành 7 ngày thiền định liên tục',
        badgeType: 'achievement',
        imageUrl: '/badges/spiritual-seeker.svg',
        rarity: 'rare',
        expReward: 50,
        isAutoAward: false,
      },
      {
        orgId,
        badgeCode: 'helping-hand',
        name: 'Bàn Tay Phụng Sự',
        description: 'Nhận 10 peer recognitions trong danh mục helpfulness',
        badgeType: 'social',
        imageUrl: '/badges/helping-hand.svg',
        rarity: 'epic',
        expReward: 100,
        isAutoAward: false,
      },
    ],
  });

  await prisma.rewardItem.createMany({
    data: [
      {
        orgId,
        name: 'Khăn quàng đặc biệt',
        description: 'Khăn quàng phiên bản giới hạn cho thành viên xuất sắc',
        costExp: 500,
        category: 'merchandise',
        imageUrl: '/rewards/scarf-special.jpg',
        quantityAvailable: 20,
        isActive: true,
      },
      {
        orgId,
        name: 'Chọn bài hát campfire',
        description: 'Quyền chọn bài hát cho buổi campfire tiếp theo',
        costExp: 100,
        category: 'privilege',
        quantityAvailable: -1,
        isActive: true,
      },
      {
        orgId,
        name: 'Đội trưởng một ngày',
        description: 'Được làm đội trưởng trong một buổi sinh hoạt',
        costExp: 300,
        category: 'experience',
        quantityAvailable: 5,
        isActive: true,
      },
    ],
  });

  console.log(`  ✅ EXP Configs: 5 event types`);
  console.log(`  ✅ Badge Definitions: 3 (common, rare, epic)`);
  console.log(`  ✅ Shop Items: 3 (merchandise, privilege, experience)`);
  console.log('🏆 Rewards seed complete.');
}

export { seedRewards };
