import { PrismaClient } from '@prisma/client';

/**
 * T-1039: Seed data for Projects & Planning module
 * Creates: 3 plan templates (via API), 2 demo plans, 1 generated project with 8 tasks
 */
export async function seedProjectsModule(prisma: PrismaClient, orgId: string) {
  console.log('🌱 Seeding Projects & Planning module...');

  // Demo Plan 1: Approved camp plan
  const campPlan = await prisma.plan.create({
    data: {
      orgId,
      title: 'Trại hè Vũng Tàu 2026',
      planType: 'camp',
      status: 'approved',
      sectionIDescription: 'Tổ chức trại hè 3 ngày 2 đêm tại Vũng Tàu cho 50 đoàn sinh.',
      sectionIIObjectives: [
        { objective: 'Rèn luyện kỹ năng sinh tồn' },
        { objective: 'Xây dựng tinh thần đồng đội' },
      ],
      sectionIIIOutcomes: [
        { outcome: '100% đoàn sinh tham gia đầy đủ' },
        { outcome: 'Không có sự cố nghiêm trọng' },
      ],
      sectionIVActivities: [
        { name: 'Dựng trại', description: 'Setup khu vực trại chính' },
        { name: 'Trò chơi lớn', description: 'Hoạt động ngoài trời theo đội' },
        { name: 'Lửa trại', description: 'Chương trình văn nghệ buổi tối' },
        { name: 'Bơi biển', description: 'Hoạt động biển có giám sát' },
        { name: 'Nấu ăn dã ngoại', description: 'Thi nấu ăn giữa các đội' },
        { name: 'Tổng kết', description: 'Phát thưởng và tổng kết trại' },
      ],
      sectionVPersonnel: {
        roles: [
          { role: 'Trại trưởng', raci: 'R', name: 'Nguyễn Văn A' },
          { role: 'Phó trại', raci: 'A', name: 'Trần Thị B' },
          { role: 'Hậu cần', raci: 'C', name: 'Lê Văn C' },
          { role: 'Y tế', raci: 'I', name: 'Phạm Thị D' },
        ],
      },
      sectionVIContent: { program: 'Chi tiết chương trình 3 ngày' },
      sectionVIITimeline: { startDate: '2026-07-15', endDate: '2026-07-17' },
      sectionVIIIProposal: 'Đề xuất tổ chức trại hè tại khu du lịch Vũng Tàu.',
      sectionIXBudget: {
        categories: [
          { name: 'Ăn uống', amount: 5000000 },
          { name: 'Vận chuyển', amount: 3000000 },
          { name: 'Vật tư', amount: 2000000 },
        ],
        total: 10000000,
      },
      approvedBy: 'system',
      approvedAt: new Date(),
    },
  });

  // Demo Plan 2: Draft event plan
  await prisma.plan.create({
    data: {
      orgId,
      title: 'Lễ kỷ niệm 10 năm thành lập Đoàn',
      planType: 'event',
      status: 'draft',
      sectionIDescription: 'Tổ chức lễ kỷ niệm 10 năm thành lập đoàn tại hội trường.',
      sectionIIObjectives: [{ objective: 'Kỷ niệm thành tích 10 năm' }],
    },
  });

  // Generate project from camp plan
  const project = await prisma.project.create({
    data: {
      orgId,
      title: campPlan.title,
      description: campPlan.sectionIDescription ?? undefined,
      projectType: 'camp',
      sourcePlanId: campPlan.id,
      status: 'active',
      objectives: campPlan.sectionIIObjectives ?? [],
      settings: { budget: campPlan.sectionIXBudget },
      startDate: new Date('2026-07-15'),
      endDate: new Date('2026-07-17'),
      createdBy: 'system',
    },
  });

  // Link plan to project
  await prisma.plan.update({
    where: { id: campPlan.id },
    data: { generatedProjectId: project.id },
  });

  // Create 8 tasks
  const tasks = [
    { title: 'Khảo sát địa điểm', status: 'done', priority: 'high', storyPoints: 3 },
    { title: 'Lên danh sách vật tư', status: 'done', priority: 'high', storyPoints: 2 },
    { title: 'Liên hệ xe đưa đón', status: 'in_progress', priority: 'high', storyPoints: 2 },
    {
      title: 'Chuẩn bị chương trình lửa trại',
      status: 'in_progress',
      priority: 'medium',
      storyPoints: 5,
    },
    { title: 'Kiểm tra y tế đoàn sinh', status: 'todo', priority: 'high', storyPoints: 3 },
    { title: 'Mua thực phẩm', status: 'todo', priority: 'medium', storyPoints: 2 },
    { title: 'Setup trò chơi lớn', status: 'todo', priority: 'medium', storyPoints: 5 },
    { title: 'In giấy tờ & bảng tên', status: 'todo', priority: 'low', storyPoints: 1 },
  ];

  for (let i = 0; i < tasks.length; i++) {
    await prisma.projectTask.create({
      data: {
        orgId,
        projectId: project.id,
        title: tasks[i].title,
        status: tasks[i].status,
        priority: tasks[i].priority,
        storyPoints: tasks[i].storyPoints,
        position: i,
        createdBy: 'system',
      },
    });
  }

  console.log(`  ✅ 2 plans, 1 project, ${tasks.length} tasks created`);
}
