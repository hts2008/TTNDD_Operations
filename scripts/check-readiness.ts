/**
 * T-0222 — Module-Active Readiness Check
 * Validates that all required E2E spec files from module-readiness.yaml exist.
 * Usage: npx ts-node scripts/check-readiness.ts
 * Exit code 1 = missing specs (CI gate fail)
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ModuleConfig {
  active: boolean;
  required_e2e?: string[];
}

interface ReadinessManifest {
  release_profile: string;
  spec_version: string;
  modules: Record<string, ModuleConfig>;
}

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'contracts', 'release', 'module-readiness.yaml');

function main() {
  console.log('🔍 Checking module readiness...\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest not found: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const manifest = yaml.load(raw) as ReadinessManifest;

  console.log(`📋 Release Profile: ${manifest.release_profile}`);
  console.log(`📋 Spec Version: ${manifest.spec_version}\n`);

  const missing: string[] = [];
  const found: string[] = [];

  for (const [moduleName, config] of Object.entries(manifest.modules)) {
    if (!config.active) {
      console.log(`⏭  ${moduleName} — inactive, skipped`);
      continue;
    }

    if (!config.required_e2e || config.required_e2e.length === 0) {
      console.log(`✅ ${moduleName} — no E2E required`);
      continue;
    }

    for (const specPath of config.required_e2e) {
      const fullPath = path.join(ROOT, specPath);
      if (fs.existsSync(fullPath)) {
        found.push(`${moduleName}: ${specPath}`);
        console.log(`✅ ${moduleName} — ${specPath}`);
      } else {
        missing.push(`${moduleName}: ${specPath}`);
        console.log(`❌ ${moduleName} — MISSING: ${specPath}`);
      }
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Found: ${found.length} | Missing: ${missing.length}`);
  console.log(`${'═'.repeat(50)}\n`);

  if (missing.length > 0) {
    console.error('❌ Readiness check FAILED. Missing specs:');
    missing.forEach((m) => console.error(`   - ${m}`));
    process.exit(1);
  }

  console.log('✅ All required E2E specs present. Readiness check PASSED.');
  process.exit(0);
}

main();
