import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedScout(orgId: string) {
  console.log('🏕️ Seeding Scout Advancement data...');

  const rankSoiCon = await prisma.rankDefinition.create({
    data: {
      orgId,
      branchId: 'branch-thieu',
      rankCode: 'SOI-CON',
      rankName: 'Sói Con',
      narrativeName: 'Chú Sói Nhỏ',
      rankOrder: 1,
      description: 'Bậc khởi đầu cho thiếu sinh Hướng Đạo',
      minExp: 0,
    },
  });

  const rankHds = await prisma.rankDefinition.create({
    data: {
      orgId,
      branchId: 'branch-thieu',
      rankCode: 'HDS',
      rankName: 'Hướng Đạo Sinh',
      narrativeName: 'Người Dẫn Đường',
      rankOrder: 2,
      description: 'Bậc chính thức của Hướng Đạo Sinh',
      minExp: 100,
    },
  });

  const rankTrangSinh = await prisma.rankDefinition.create({
    data: {
      orgId,
      branchId: 'branch-trang',
      rankCode: 'TRANG-SINH',
      rankName: 'Tráng Sinh',
      narrativeName: 'Chiến Binh Trưởng Thành',
      rankOrder: 3,
      description: 'Bậc cao nhất — trưởng thành và phục vụ',
      minExp: 500,
    },
  });

  const groupOutdoor = await prisma.skillGroup.create({
    data: {
      orgId,
      name: 'Kỹ năng Ngoài trời',
      narrativeName: 'Thiên nhiên & Sinh tồn',
      description: 'Kỹ năng sống ngoài trời, cắm trại, leo núi, dấu vết',
      icon: '⛺',
      color: '#2d7d46',
      orderIndex: 1,
    },
  });

  const groupLeadership = await prisma.skillGroup.create({
    data: {
      orgId,
      name: 'Lãnh đạo',
      narrativeName: 'Dẫn Dắt & Truyền Cảm Hứng',
      description: 'Kỹ năng lãnh đạo nhóm, quản lý dự án, giao tiếp',
      icon: '🌟',
      color: '#d4a017',
      orderIndex: 2,
    },
  });

  const groupService = await prisma.skillGroup.create({
    data: {
      orgId,
      name: 'Phục vụ Cộng đồng',
      narrativeName: 'Giúp Đời & Phụng Sự',
      description: 'Phục vụ cộng đồng, từ thiện, hoạt động xã hội',
      icon: '🤝',
      color: '#4285f4',
      orderIndex: 3,
    },
  });

  const groupKnowledge = await prisma.skillGroup.create({
    data: {
      orgId,
      name: 'Kiến thức Tổng quát',
      narrativeName: 'Tri Thức & Văn Hóa',
      description: 'Kiến thức về lịch sử, văn hóa, tôn giáo, xã hội',
      icon: '📚',
      color: '#9c27b0',
      orderIndex: 4,
    },
  });

  const skillCamping = await prisma.skill.create({
    data: {
      orgId,
      skillGroupId: groupOutdoor.id,
      skillCode: 'OUT-CAMP',
      name: 'Cắm trại',
      narrativeName: 'Nghệ thuật dựng trại',
      description: 'Kỹ năng cắm trại cơ bản và nâng cao',
      levels: [
        { level: 1, criteria: 'Dựng lều 2 người trong 15 phút' },
        { level: 2, criteria: 'Dựng lều 6 người, nấu ăn ngoài trời' },
        { level: 3, criteria: 'Tổ chức trại cho đội 20 người' },
      ],
      maxLevel: 3,
      isRequired: true,
      requiredForRankId: rankHds.id,
      expPerLevel: 20,
    },
  });

  const skillKnots = await prisma.skill.create({
    data: {
      orgId,
      skillGroupId: groupOutdoor.id,
      skillCode: 'OUT-KNOT',
      name: 'Nút dây',
      narrativeName: 'Bậc thầy giao nối',
      description: 'Kỹ năng thắt nút dây cơ bản và nâng cao',
      levels: [
        { level: 1, criteria: 'Thắt 5 nút cơ bản (dẹt, thợ dệt, ghế đơn, số 8, thòng lọng)' },
        { level: 2, criteria: 'Thắt 10 nút nâng cao, ứng dụng thực tế' },
      ],
      maxLevel: 2,
      isRequired: true,
      requiredForRankId: rankSoiCon.id,
      expPerLevel: 15,
    },
  });

  await prisma.skill.create({
    data: {
      orgId,
      skillGroupId: groupLeadership.id,
      skillCode: 'LDR-TEAM',
      name: 'Lãnh đạo đội',
      narrativeName: 'Đội Trưởng',
      description: 'Kỹ năng dẫn dắt, điều hành đội nhóm',
      levels: [
        { level: 1, criteria: 'Điều hành 1 buổi họp đội' },
        { level: 2, criteria: 'Lên kế hoạch và điều hành hoạt động 1 ngày' },
        { level: 3, criteria: 'Lãnh đạo dự án phục vụ cộng đồng' },
      ],
      maxLevel: 3,
      isRequired: true,
      requiredForRankId: rankHds.id,
      expPerLevel: 25,
    },
  });

  await prisma.skill.create({
    data: {
      orgId,
      skillGroupId: groupService.id,
      skillCode: 'SVC-COMM',
      name: 'Phục vụ Cộng đồng',
      narrativeName: 'Người Giúp Đời',
      description: 'Tham gia và tổ chức hoạt động phục vụ',
      levels: [
        { level: 1, criteria: 'Tham gia 2 hoạt động phục vụ cộng đồng' },
        { level: 2, criteria: 'Tổ chức 1 dự án phục vụ cộng đồng cho đội' },
      ],
      maxLevel: 2,
      isRequired: false,
      expPerLevel: 30,
    },
  });

  await prisma.skill.create({
    data: {
      orgId,
      skillGroupId: groupKnowledge.id,
      skillCode: 'KNW-HIST',
      name: 'Lịch sử Hướng Đạo',
      narrativeName: 'Người Kể Chuyện',
      description: 'Kiến thức về lịch sử phong trào Hướng Đạo',
      levels: [
        { level: 1, criteria: 'Biết lịch sử Baden-Powell và phong trào thế giới' },
        { level: 2, criteria: 'Hiểu lịch sử Hướng Đạo Việt Nam và Cao Đài' },
      ],
      maxLevel: 2,
      isRequired: false,
      expPerLevel: 10,
    },
  });

  await prisma.skill.create({
    data: {
      orgId,
      skillGroupId: groupOutdoor.id,
      skillCode: 'OUT-NAV',
      name: 'Định hướng',
      narrativeName: 'Người Dẫn Lối',
      description: 'Kỹ năng đọc bản đồ, la bàn, GPS',
      levels: [
        { level: 1, criteria: 'Đọc bản đồ địa hình và sử dụng la bàn' },
        { level: 2, criteria: 'Hoàn thành hành trình định hướng 5km' },
        { level: 3, criteria: 'Dẫn đội đi hành trình đêm bằng sao' },
      ],
      maxLevel: 3,
      isRequired: false,
      expPerLevel: 20,
    },
  });

  await prisma.skill.create({
    data: {
      orgId,
      skillGroupId: groupOutdoor.id,
      skillCode: 'OUT-AID',
      name: 'Sơ cấp cứu',
      narrativeName: 'Người Cứu Hộ',
      description: 'Kỹ năng sơ cấp cứu và an toàn',
      levels: [
        { level: 1, criteria: 'Sơ cứu vết thương cơ bản, CPR cơ bản' },
        { level: 2, criteria: 'Xử lý tình huống khẩn cấp, cáng thương' },
      ],
      maxLevel: 2,
      isRequired: true,
      requiredForRankId: rankHds.id,
      expPerLevel: 25,
    },
  });

  console.log(`  ✅ Ranks: 3 (Sói Con, HDS, Tráng Sinh)`);
  console.log(`  ✅ Skill Groups: 4 (Outdoor, Leadership, Service, Knowledge)`);
  console.log(`  ✅ Skills: 8 with multi-level criteria`);
  console.log('🏕️ Scout seed complete.');
}

export { seedScout };
