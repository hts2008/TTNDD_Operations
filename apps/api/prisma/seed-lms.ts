import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedLms(orgId: string) {
  console.log('🎓 Seeding LMS courses...');

  // ── Scout courses ──

  const scoutCourse1 = await prisma.course.create({
    data: {
      orgId,
      title: 'Nhập môn Hướng Đạo',
      description:
        'Tìm hiểu lịch sử, nguyên tắc và phương pháp Hướng Đạo Sinh. Từ Robert Baden-Powell đến phong trào DTNDD.',
      category: 'scout',
      difficulty: 'beginner',
      expReward: 200,
      totalDuration: 240,
      status: 'published',
      publishedAt: new Date(),
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        orgId,
        courseId: scoutCourse1.id,
        title: 'Lịch sử phong trào Hướng Đạo',
        content: 'Phong trào Hướng Đạo được sáng lập bởi Robert Baden-Powell năm 1907...',
        lessonType: 'text',
        orderIndex: 0,
        duration: 15,
        isRequired: true,
      },
      {
        orgId,
        courseId: scoutCourse1.id,
        title: 'Lời hứa và Luật Hướng Đạo',
        content: {},
        lessonType: 'video',
        orderIndex: 1,
        duration: 20,
        isRequired: true,
      },
      {
        orgId,
        courseId: scoutCourse1.id,
        title: 'Phương pháp Hướng Đạo trong DTNDD',
        content: 'DTNDD áp dụng phương pháp Hướng Đạo theo cách riêng...',
        lessonType: 'text',
        orderIndex: 2,
        duration: 25,
        isRequired: true,
      },
      {
        orgId,
        courseId: scoutCourse1.id,
        title: 'Hàng Đội Tự Trị',
        content: 'Hàng đội là đơn vị cơ bản trong Hướng Đạo...',
        lessonType: 'text',
        orderIndex: 3,
        duration: 30,
        isRequired: true,
      },
    ],
  });

  const scoutCourse2 = await prisma.course.create({
    data: {
      orgId,
      title: 'Kỹ năng Trại & Dã ngoại',
      description: 'Dựng lều, nấu ăn ngoài trời, sinh tồn trong tự nhiên.',
      category: 'scout',
      difficulty: 'intermediate',
      expReward: 350,
      totalDuration: 360,
      status: 'published',
      publishedAt: new Date(),
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        orgId,
        courseId: scoutCourse2.id,
        title: 'Dựng lều cơ bản',
        content: {},
        lessonType: 'video',
        orderIndex: 0,
        duration: 30,
        isRequired: true,
      },
      {
        orgId,
        courseId: scoutCourse2.id,
        title: 'Nấu ăn ngoài trời',
        content: 'Kỹ thuật nấu ăn với bếp củi...',
        lessonType: 'text',
        orderIndex: 1,
        duration: 20,
        isRequired: true,
      },
      {
        orgId,
        courseId: scoutCourse2.id,
        title: 'Đọc bản đồ & la bàn',
        content: 'Cách đọc bản đồ địa hình...',
        lessonType: 'text',
        orderIndex: 2,
        duration: 25,
        isRequired: true,
      },
    ],
  });

  const scoutCourse3 = await prisma.course.create({
    data: {
      orgId,
      title: 'Sơ cấp cứu thực hành',
      description: 'Kỹ năng xử lý tình huống khẩn cấp, băng bó và hồi sức.',
      category: 'skill',
      difficulty: 'intermediate',
      expReward: 300,
      totalDuration: 180,
      status: 'draft',
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        orgId,
        courseId: scoutCourse3.id,
        title: 'Đánh giá tình huống',
        content: 'Bước đầu tiên khi gặp tình huống khẩn cấp...',
        lessonType: 'text',
        orderIndex: 0,
        duration: 15,
        isRequired: true,
      },
      {
        orgId,
        courseId: scoutCourse3.id,
        title: 'Kỹ thuật băng bó',
        content: {},
        lessonType: 'video',
        orderIndex: 1,
        duration: 20,
        isRequired: true,
      },
    ],
  });

  // ── Cao Đài courses ──

  const caodaiCourse1 = await prisma.course.create({
    data: {
      orgId,
      title: 'Giáo lý Cao Đài cơ bản',
      description: 'Tìm hiểu nền tảng giáo lý Đại Đạo Tam Kỳ Phổ Độ.',
      category: 'religion',
      difficulty: 'beginner',
      expReward: 250,
      totalDuration: 300,
      status: 'published',
      publishedAt: new Date(),
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        orgId,
        courseId: caodaiCourse1.id,
        title: 'Đại Đạo Tam Kỳ Phổ Độ là gì?',
        content: 'Đại Đạo Tam Kỳ Phổ Độ là tôn giáo được khai sáng...',
        lessonType: 'text',
        orderIndex: 0,
        duration: 20,
        isRequired: true,
      },
      {
        orgId,
        courseId: caodaiCourse1.id,
        title: 'Ngũ Giới Cấm',
        content: 'Năm giới cấm trong Đạo Cao Đài...',
        lessonType: 'text',
        orderIndex: 1,
        duration: 25,
        isRequired: true,
      },
      {
        orgId,
        courseId: caodaiCourse1.id,
        title: 'Thánh Ngôn Hiệp Tuyển',
        content: {},
        lessonType: 'text',
        orderIndex: 2,
        duration: 30,
        isRequired: true,
      },
    ],
  });

  const caodaiCourse2 = await prisma.course.create({
    data: {
      orgId,
      title: 'Ngũ Giới & Đạo đức sống',
      description: 'Ứng dụng Ngũ Giới vào cuộc sống hằng ngày, rèn luyện đạo đức.',
      category: 'religion',
      difficulty: 'beginner',
      expReward: 150,
      totalDuration: 150,
      status: 'published',
      publishedAt: new Date(),
    },
  });

  await prisma.lesson.createMany({
    data: [
      {
        orgId,
        courseId: caodaiCourse2.id,
        title: 'Giới Sát',
        content: 'Không sát hại sinh linh...',
        lessonType: 'text',
        orderIndex: 0,
        duration: 15,
        isRequired: true,
      },
      {
        orgId,
        courseId: caodaiCourse2.id,
        title: 'Giới Đạo',
        content: 'Không trộm cắp tài sản...',
        lessonType: 'text',
        orderIndex: 1,
        duration: 15,
        isRequired: true,
      },
    ],
  });

  // ── Quiz for scout course ──

  const quiz = await prisma.quiz.create({
    data: {
      orgId,
      courseId: scoutCourse1.id,
      title: 'Kiểm tra: Nền tảng Hướng Đạo',
      passingScore: 70,
      maxRetries: 3,
      timeLimit: 10,
    },
  });

  await prisma.quizQuestion.createMany({
    data: [
      {
        orgId,
        quizId: quiz.id,
        questionText: 'Ai là người sáng lập phong trào Hướng Đạo?',
        questionType: 'multiple_choice',
        options: {
          choices: ['Robert Baden-Powell', 'Lord Kitchener', 'Ernest Seton', 'Daniel Boone'],
          correctAnswer: 'Robert Baden-Powell',
        },
        orderIndex: 0,
        points: 25,
      },
      {
        orgId,
        quizId: quiz.id,
        questionText: 'Lời hứa Hướng Đạo có mấy điểm?',
        questionType: 'multiple_choice',
        options: { choices: ['2', '3', '4', '5'], correctAnswer: '3' },
        orderIndex: 1,
        points: 25,
      },
      {
        orgId,
        quizId: quiz.id,
        questionText: 'Phương châm Hướng Đạo là gì?',
        questionType: 'multiple_choice',
        options: {
          choices: ['Sẵn Sàng', 'Tiến Lên', 'Phụng Sự', 'Đoàn Kết'],
          correctAnswer: 'Sẵn Sàng',
        },
        orderIndex: 2,
        points: 25,
      },
      {
        orgId,
        quizId: quiz.id,
        questionText: 'Hướng Đạo sử dụng hệ thống tổ chức nào?',
        questionType: 'multiple_choice',
        options: {
          choices: ['Hàng Đội Tự Trị', 'Lớp Học', 'Phòng Ban', 'Ban Chấp Hành'],
          correctAnswer: 'Hàng Đội Tự Trị',
        },
        orderIndex: 3,
        points: 25,
      },
    ],
  });

  // ── Competencies ──

  await prisma.competency.createMany({
    data: [
      {
        orgId,
        name: 'Kỹ năng sinh tồn',
        competencyCode: 'SURVIVAL',
        description: 'Khả năng tồn tại và thích nghi trong tự nhiên',
        category: 'scout',
      },
      {
        orgId,
        name: 'Lãnh đạo',
        competencyCode: 'LEADERSHIP',
        description: 'Khả năng dẫn dắt và tổ chức nhóm',
        category: 'scout',
      },
      {
        orgId,
        name: 'Đạo đức Cao Đài',
        competencyCode: 'CAODAI_ETHICS',
        description: 'Hiểu biết và thực hành giáo lý Cao Đài',
        category: 'religion',
      },
      {
        orgId,
        name: 'Sơ cấp cứu',
        competencyCode: 'FIRST_AID',
        description: 'Kỹ năng xử lý tình huống khẩn cấp cơ bản',
        category: 'skill',
      },
    ],
  });

  console.log(`✅ LMS seeded: 5 courses, ${quiz.id ? '1 quiz' : '0 quizzes'}, 4 competencies`);
}
