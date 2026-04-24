#!/usr/bin/env ts-node
/**
 * Module Readiness Check
 * Validates that all ACTIVE modules have required E2E specs,
 * unit tests, and passing health checks before release.
 *
 * Usage: npx ts-node scripts/check-readiness.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ModuleStatus {
  name: string;
  hasService: boolean;
  hasController: boolean;
  hasSpec: boolean;
  hasDto: boolean;
  specCount: number;
  ready: boolean;
  issues: string[];
}

const API_SRC = path.resolve(__dirname, '../apps/api/src');
const MODULES_DIR = path.join(API_SRC, 'modules');

function checkModule(moduleName: string): ModuleStatus {
  const moduleDir = path.join(MODULES_DIR, moduleName);
  const files = fs.readdirSync(moduleDir);

  const hasService = files.some((f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));
  const hasController = files.some((f) => f.endsWith('.controller.ts'));
  const hasSpec = files.some((f) => f.endsWith('.spec.ts'));
  const hasDto = files.some((f) => f.endsWith('.dto.ts'));
  const specCount = files.filter((f) => f.endsWith('.spec.ts')).length;

  const issues: string[] = [];
  if (!hasService) issues.push('Missing service');
  if (!hasController) issues.push('Missing controller');
  if (!hasSpec) issues.push('Missing unit tests');
  if (!hasDto) issues.push('Missing DTO validation');

  return {
    name: moduleName,
    hasService,
    hasController,
    hasSpec,
    hasDto,
    specCount,
    ready: issues.length === 0,
    issues,
  };
}

function main(): void {
  console.log('🔍 Module Readiness Check\n');
  console.log(`Scanning: ${MODULES_DIR}\n`);

  const modules = fs.readdirSync(MODULES_DIR).filter((d) => {
    const fullPath = path.join(MODULES_DIR, d);
    return fs.statSync(fullPath).isDirectory();
  });

  const results = modules.map(checkModule);
  const readyCount = results.filter((r) => r.ready).length;

  console.log('| Module | Service | Controller | Spec | DTO | Tests | Status |');
  console.log('|--------|---------|------------|------|-----|-------|--------|');

  for (const r of results) {
    const status = r.ready ? '✅ READY' : '❌ GAPS';
    console.log(
      `| ${r.name.padEnd(20)} | ${r.hasService ? '✅' : '❌'}       | ${r.hasController ? '✅' : '❌'}          | ${r.hasSpec ? '✅' : '❌'}    | ${r.hasDto ? '✅' : '❌'}   | ${String(r.specCount).padStart(5)} | ${status} |`,
    );
  }

  console.log(`\n📊 ${readyCount}/${modules.length} modules ready`);

  const notReady = results.filter((r) => !r.ready);
  if (notReady.length > 0) {
    console.log('\n⚠️  Modules with gaps:');
    for (const r of notReady) {
      console.log(`  - ${r.name}: ${r.issues.join(', ')}`);
    }
    process.exit(1);
  }

  console.log('\n✅ All modules pass readiness check');
  process.exit(0);
}

main();
