import { PrismaClient } from '@prisma/client';

/** T-1097: Seed data for Assets module */
export async function seedAssetsModule(prisma: PrismaClient, orgId: string) {
  console.log('🌱 Seeding Assets module...');
  const actorId = 'system';

  const catTent = await prisma.assetCategory.create({
    data: { orgId, name: 'Lều trại', description: 'Lều, bạt, tấm trải', icon: '⛺' },
  });
  const catKitchen = await prisma.assetCategory.create({
    data: { orgId, name: 'Bếp trại', description: 'Nồi, chảo, bếp gas', icon: '🍳' },
  });
  const catRope = await prisma.assetCategory.create({
    data: { orgId, name: 'Dây thừng & Gút', description: 'Dây, chão, phụ kiện', icon: '🪢' },
  });
  const catUniform = await prisma.assetCategory.create({
    data: { orgId, name: 'Đồng phục', description: 'Áo, quần, mũ, khăn quàng', icon: '👕' },
  });

  const assets = [
    {
      assetCode: 'TENT-001',
      name: 'Lều 4 người Coleman',
      categoryId: catTent.id,
      quantity: 8,
      availableQty: 6,
      location: 'Kho A',
      condition: 'good',
      unit: 'cái',
    },
    {
      assetCode: 'TENT-002',
      name: 'Bạt che 3x4m',
      categoryId: catTent.id,
      quantity: 5,
      availableQty: 5,
      location: 'Kho A',
      condition: 'good',
      unit: 'tấm',
    },
    {
      assetCode: 'KIT-001',
      name: 'Bộ nồi nấu 20 người',
      categoryId: catKitchen.id,
      quantity: 3,
      availableQty: 2,
      location: 'Kho B',
      condition: 'good',
      unit: 'bộ',
    },
    {
      assetCode: 'KIT-002',
      name: 'Bếp gas dã ngoại',
      categoryId: catKitchen.id,
      quantity: 4,
      availableQty: 4,
      location: 'Kho B',
      condition: 'fair',
      unit: 'cái',
    },
    {
      assetCode: 'ROPE-001',
      name: 'Dây thừng 10m',
      categoryId: catRope.id,
      quantity: 20,
      availableQty: 15,
      location: 'Kho C',
      condition: 'good',
      unit: 'cuộn',
    },
    {
      assetCode: 'ROPE-002',
      name: 'Dây chão 5m',
      categoryId: catRope.id,
      quantity: 30,
      availableQty: 2,
      location: 'Kho C',
      condition: 'fair',
      unit: 'cuộn',
    },
  ];

  for (const a of assets) {
    await prisma.asset.create({ data: { orgId, ...a } });
  }

  const kitTemplate = await prisma.kitTemplate.create({
    data: {
      orgId,
      name: 'Kit Trại Cuối Tuần',
      description: 'Bộ kit cho trại 2 ngày 1 đêm',
      kitType: 'weekend_camp',
      createdBy: actorId,
      items: {
        createMany: {
          data: [
            { orgId, itemName: 'Lều 4 người', quantity: 2, isRequired: true },
            { orgId, itemName: 'Bạt che', quantity: 1, isRequired: true },
            { orgId, itemName: 'Bộ nồi', quantity: 1, isRequired: true },
            { orgId, itemName: 'Dây thừng 10m', quantity: 4, isRequired: true },
            { orgId, itemName: 'Đèn pin', quantity: 2, isRequired: false, notes: 'Nếu có' },
          ],
        },
      },
    },
  });

  const members = await prisma.orgMember.findMany({ where: { orgId }, take: 2 });
  if (members.length > 0) {
    await prisma.uniformIssue.create({
      data: { orgId, memberId: members[0].id, uniformType: 'Áo sinh hoạt', size: 'M', quantity: 1 },
    });
    if (members[1]) {
      await prisma.uniformIssue.create({
        data: {
          orgId,
          memberId: members[1].id,
          uniformType: 'Khăn quàng',
          size: 'Free',
          quantity: 1,
        },
      });
    }
  }

  console.log(
    `  ✅ 4 categories, ${assets.length} assets, 1 kit template, ${members.length} uniforms seeded`,
  );
}
