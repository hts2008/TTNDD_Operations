/**
 * Script to generate OpenAPI spec from NestJS Swagger.
 * Run: npx ts-node contracts/openapi/generate.ts
 * Output: contracts/openapi/ttndd-ops-api.json
 */
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function generateSpec() {
  // Dynamically import the AppModule
  const { AppModule } = await import('../../apps/api/src/app.module');

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('TTNDD_OPS API')
    .setDescription('Thanh Thiếu Niên Đại Đạo — Platform REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('Health', 'System health endpoints')
    .addTag('Organization Config', 'Organization management (Module 10)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputIndex = process.argv.indexOf('--output');
  const outputPath =
    outputIndex >= 0
      ? path.resolve(process.argv[outputIndex + 1] as string)
      : path.join(__dirname, 'ttndd-ops-api.json');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec written to: ${outputPath}`);

  await app.close();
}

generateSpec().catch((e) => {
  console.error('Failed to generate OpenAPI spec:', e);
  process.exit(1);
});
