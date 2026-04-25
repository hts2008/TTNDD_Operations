import { PrismaClient } from '@prisma/client';

/** T-1077: Seed data for Finance module */
export async function seedFinanceModule(prisma: PrismaClient, orgId: string) {
  console.log('🌱 Seeding Finance module...');
  const actorId = 'system';

  const account = await prisma.financialAccount.create({
    data: {
      orgId,
      name: 'Quỹ Đoàn Chính',
      accountType: 'cash',
      currency: 'VND',
      description: 'Tài khoản chính của Đoàn',
    },
  });

  const account2 = await prisma.financialAccount.create({
    data: {
      orgId,
      name: 'Ngân hàng Đoàn',
      accountType: 'bank',
      currency: 'VND',
      description: 'Tài khoản ngân hàng',
    },
  });

  const transactions = [
    {
      accountId: account.id,
      transactionType: 'income',
      category: 'Phí sinh hoạt',
      amount: 5_000_000,
      description: 'Thu phí sinh hoạt tháng 3',
      status: 'completed',
      transactionDate: new Date('2026-03-04'),
    },
    {
      accountId: account.id,
      transactionType: 'expense',
      category: 'Vật tư',
      amount: 3_200_000,
      description: 'Mua vật tư trại huấn luyện',
      status: 'completed',
      transactionDate: new Date('2026-03-03'),
    },
    {
      accountId: account2.id,
      transactionType: 'income',
      category: 'Tài trợ',
      amount: 7_500_000,
      description: 'Tài trợ từ Ban Đại Diện',
      status: 'completed',
      transactionDate: new Date('2026-03-02'),
    },
    {
      accountId: account.id,
      transactionType: 'expense',
      category: 'In ấn',
      amount: 1_800_000,
      description: 'In ấn tài liệu giáo lý',
      status: 'pending',
      transactionDate: new Date('2026-03-01'),
    },
    {
      accountId: account.id,
      transactionType: 'expense',
      category: 'Vận chuyển',
      amount: 3_200_000,
      description: 'Chi phí thuê xe cho dã ngoại',
      status: 'completed',
      transactionDate: new Date('2026-02-28'),
    },
  ];

  for (const tx of transactions) {
    await prisma.financialTransaction.create({
      data: { orgId, ...tx, recordedBy: actorId },
    });
  }

  const members = await prisma.orgMember.findMany({ where: { orgId }, take: 3 });
  if (members.length > 0) {
    const fees = [
      {
        orgMemberId: members[0].id,
        feeType: 'sinh_hoat',
        feePeriod: 'Q1/2026',
        amountDue: 300_000,
        amountPaid: 300_000,
        status: 'paid',
        paidDate: new Date(),
      },
      {
        orgMemberId: members[1]?.id ?? members[0].id,
        feeType: 'sinh_hoat',
        feePeriod: 'Q1/2026',
        amountDue: 300_000,
        amountPaid: 0,
        status: 'unpaid',
        dueDate: new Date('2026-04-30'),
      },
      {
        orgMemberId: members[2]?.id ?? members[0].id,
        feeType: 'sinh_hoat',
        feePeriod: 'Q1/2026',
        amountDue: 300_000,
        amountPaid: 150_000,
        status: 'partial',
        dueDate: new Date('2026-03-31'),
      },
    ];
    for (const fee of fees) {
      await prisma.memberFee.create({ data: { orgId, ...fee } });
    }
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const settings = (org?.settings as Record<string, unknown>) ?? {};
  settings.costCenters = [
    {
      id: 'cc-seed-1',
      name: 'Trại huấn luyện 2026',
      code: 'CAMP26',
      budgetAmount: 15_000_000,
      spentAmount: 3_200_000,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cc-seed-2',
      name: 'In ấn & Tài liệu',
      code: 'PRINT',
      budgetAmount: 5_000_000,
      spentAmount: 1_800_000,
      createdAt: new Date().toISOString(),
    },
  ];
  settings.feePlans = [
    {
      id: 'fp-seed-1',
      name: 'Phí sinh hoạt hàng quý',
      frequency: 'quarterly',
      amount: 300_000,
      feeType: 'sinh_hoat',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
  settings.sponsors = [
    {
      id: 'sp-seed-1',
      name: 'Ban Đại Diện Phụ Huynh',
      contributionType: 'cash',
      amount: 7_500_000,
      receivedDate: '2026-03-02',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sp-seed-2',
      name: 'Cty TNHH ABC',
      contributionType: 'in_kind',
      amount: 2_000_000,
      description: '200 áo thun cho trại',
      createdAt: new Date().toISOString(),
    },
  ];
  await prisma.organization.update({ where: { id: orgId }, data: { settings: settings as any } });

  console.log(
    `  ✅ 2 accounts, ${transactions.length} transactions, ${members.length > 0 ? 3 : 0} fees, 2 cost centers, 1 fee plan, 2 sponsors seeded`,
  );
}
