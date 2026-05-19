/**
 * Generate OpenAPI spec from the compiled NestJS API app.
 *
 * Pre-requisite: `pnpm --filter api build` must have been run.
 *
 * Usage:
 *   node contracts/openapi/generate.js
 *
 * Output:
 *   contracts/openapi/ttndd-ops-api.json
 */
const { NestFactory } = require('@nestjs/core');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const fs = require('fs');
const path = require('path');

async function generateSpec() {
  // Import the compiled AppModule from the API dist
  const { AppModule } = require('../../apps/api/dist/app.module');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('TTNDD_OPS API')
    .setDescription(
      'Thanh Thiếu Niên Đại Đạo — Platform REST API\n\n' +
        'Multi-tenant ERP platform for DTNDD scouting operations.\n' +
        'All endpoints require Bearer token and X-Org-Id header for RLS isolation.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('System', 'Health checks, readiness, release gates')
    .addTag('Organization Config', 'Org settings, module toggles (Module 10)')
    .addTag('HRM', 'People, members, guardians, units (Module 1)')
    .addTag('Scout', 'Skills, ranks, progression (Module 8)')
    .addTag('Rewards', 'EXP, badges, shop, leaderboard (Module 9)')
    .addTag('Sessions', 'Training sessions, attendance (Module 11)')
    .addTag('Events', 'Camps, events, registration, check-in (Module 12)')
    .addTag('LMS', 'Courses, lessons, quizzes (Module 7)')
    .addTag('Enrichment', 'Spiritual logs, Ngũ Giới, mentoring (Module 8D)')
    .addTag('Projects', 'Service learning projects, tasks (Module 2)')
    .addTag('Tickets', 'Support tickets, status tracking (Module 3)')
    .addTag('Finance', 'Fees, payments, transactions (Module 4)')
    .addTag('Assets', 'Inventory, check-out/in (Module 5)')
    .addTag('Process', 'Workflows, approvals (Module 6)')
    .addTag('Notifications', 'In-app, push, email notifications (Module 14)')
    .addTag('ChildSafety', 'Child protection, consent, incidents (Module 15)')
    .addTag('Reports', 'Dashboards, analytics, exports')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputIndex = process.argv.indexOf('--output');
  const outputPath =
    outputIndex >= 0
      ? path.resolve(process.argv[outputIndex + 1])
      : path.join(__dirname, 'ttndd-ops-api.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`✅ OpenAPI spec written to: ${outputPath}`);
  console.log(`   Paths: ${Object.keys(document.paths || {}).length}`);
  console.log(`   Schemas: ${Object.keys(document.components?.schemas || {}).length}`);

  await app.close();
}

generateSpec().catch((e) => {
  console.error('❌ Failed to generate OpenAPI spec:', e.message || e);
  process.exit(1);
});
