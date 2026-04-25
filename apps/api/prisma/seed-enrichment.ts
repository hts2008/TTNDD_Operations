import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEnrichment(orgId: string, memberId: string) {
  console.log('🙏 Seeding Enrichment data...');

  await prisma.spiritualLog.createMany({
    data: [
      {
        orgId,
        orgMemberId: memberId,
        logDate: new Date('2026-04-20'),
        logType: 'meditation',
        durationMinutes: 30,
        notes: 'Thiền định buổi sáng — tập trung vào hơi thở',
        thanhNgonRef: 'TNHT Quyển 1 Phần 12',
        emotionBefore: 4,
        emotionAfter: 8,
      },
      {
        orgId,
        orgMemberId: memberId,
        logDate: new Date('2026-04-19'),
        logType: 'prayer',
        durationMinutes: 15,
        notes: 'Cầu nguyện tối — cảm tạ Thượng Đế',
        emotionBefore: 5,
        emotionAfter: 7,
      },
      {
        orgId,
        orgMemberId: memberId,
        logDate: new Date('2026-04-18'),
        logType: 'study',
        durationMinutes: 45,
        notes: 'Nghiên cứu Thánh Ngôn — chương về từ bi',
        thanhNgonRef: 'TNHT Quyển 2 Phần 5',
        emotionBefore: 3,
        emotionAfter: 9,
      },
    ],
  });

  await prisma.nguGioiAssessment.createMany({
    data: [
      {
        orgId,
        orgMemberId: memberId,
        weekStart: new Date('2026-04-14'),
        batSatSinh: 9,
        batDuDao: 8,
        batTaDam: 10,
        batTuuNhuc: 7,
        batVongNgu: 8,
        reflection: 'Tuần này giữ giới khá tốt, cần chú ý hơn về bất tửu nhục',
      },
      {
        orgId,
        orgMemberId: memberId,
        weekStart: new Date('2026-04-21'),
        batSatSinh: 10,
        batDuDao: 9,
        batTaDam: 10,
        batTuuNhuc: 8,
        batVongNgu: 9,
        reflection: 'Cải thiện rõ rệt so với tuần trước',
      },
    ],
  });

  console.log(`  ✅ Spiritual Logs: 3 (meditation, prayer, study)`);
  console.log(`  ✅ Ngũ Giới Assessments: 2 weeks`);
  console.log('🙏 Enrichment seed complete.');
}

export { seedEnrichment };
