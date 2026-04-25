import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEvents(orgId: string) {
  console.log('🏕️ Seeding Events & Camps data...');

  const traiHe = await prisma.event.create({
    data: {
      orgId,
      title: 'Trại Hè Hướng Đạo 2026',
      eventType: 'camp',
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-07-18'),
      location: 'Khu Du Lịch Sinh Thái Cần Giờ',
      maxParticipants: 60,
      targetBranches: ['thieu', 'trang'],
      status: 'planning',
      schedule: {
        day1: ['Đăng ký', 'Khai mạc', 'Trò chơi lớn'],
        day2: ['Hành trình', 'Kỹ năng sinh tồn', 'Lửa trại'],
        day3: ['Phục vụ cộng đồng', 'Tổng kết', 'Bế mạc'],
      },
      raciMatrix: {
        responsible: ['leader-001', 'leader-002'],
        accountable: 'admin-001',
        consulted: ['parent-rep-001'],
        informed: ['all-parents'],
      },
      riskAssessment: {
        weather: { risk: 'medium', mitigation: 'Backup indoor venue' },
        terrain: { risk: 'low', mitigation: 'Pre-survey trails' },
        health: { risk: 'low', mitigation: 'First aid team on-site' },
      },
      safetyChecklist: {
        two_adult_rule: true,
        first_aid_kit: true,
        emergency_contacts: true,
        weather_monitoring: true,
        terrain_assessment: true,
      },
      expReward: 150,
      createdBy: 'system',
    },
  });

  const hopDoi = await prisma.event.create({
    data: {
      orgId,
      title: 'Họp Đội Tháng 7/2026',
      eventType: 'meeting',
      startDate: new Date('2026-07-05'),
      endDate: new Date('2026-07-05'),
      location: 'Thánh Thất Tây Ninh',
      maxParticipants: 30,
      status: 'planning',
      schedule: {
        morning: ['Chào cờ', 'Ôn bài Nút dây', 'Trò chơi nhỏ'],
        afternoon: ['Phát bài mới', 'Thực hành', 'Tổng kết'],
      },
      expReward: 30,
      createdBy: 'system',
    },
  });

  const phucVu = await prisma.event.create({
    data: {
      orgId,
      title: 'Ngày Phục Vụ Cộng Đồng',
      eventType: 'service',
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-10'),
      location: 'Làng Trẻ SOS',
      maxParticipants: 25,
      status: 'planning',
      raciMatrix: {
        responsible: ['leader-003'],
        accountable: 'admin-001',
      },
      riskAssessment: {
        transport: { risk: 'low', mitigation: 'Chartered bus' },
      },
      expReward: 80,
      createdBy: 'system',
    },
  });

  console.log(`  ✅ Events: 3 (Trại Hè, Họp Đội, Phục Vụ)`);
  console.log(`  ✅ IDs: ${traiHe.id}, ${hopDoi.id}, ${phucVu.id}`);
  console.log('🏕️ Events seed complete.');
}

export { seedEvents };
