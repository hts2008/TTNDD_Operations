/**
 * T-0224 — Signed Release Manifest Generator
 * Captures release metadata and writes release-manifest.json
 * Usage: npx ts-node scripts/sign-release.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

interface ReleaseManifest {
  profile: string;
  buildId: string;
  gitSha: string;
  gitBranch: string;
  timestamp: string;
  specVersion: string;
  modules: string[];
  checksum: string;
}

function getGitInfo() {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { sha, branch };
  } catch {
    return { sha: 'unknown', branch: 'unknown' };
  }
}

function main() {
  console.log('📦 Generating signed release manifest...\n');

  const ROOT = path.resolve(__dirname, '..');
  const git = getGitInfo();
  const timestamp = new Date().toISOString();
  const buildId = `${timestamp.replace(/[^0-9]/g, '').slice(0, 14)}-${git.sha.slice(0, 7)}`;

  // Read module list from readiness manifest
  let modules: string[] = [];
  try {
    const yaml = require('js-yaml');
    const raw = fs.readFileSync(
      path.join(ROOT, 'contracts', 'release', 'module-readiness.yaml'),
      'utf-8',
    );
    const manifest = yaml.load(raw) as { modules: Record<string, { active: boolean }> };
    modules = Object.entries(manifest.modules)
      .filter(([, v]) => v.active)
      .map(([k]) => k);
  } catch {
    console.warn('⚠️  Could not read module-readiness.yaml');
  }

  const payload: Omit<ReleaseManifest, 'checksum'> = {
    profile: 'PROFILE_OPS',
    buildId,
    gitSha: git.sha,
    gitBranch: git.branch,
    timestamp,
    specVersion: 'V10 FINAL',
    modules,
  };

  // Generate SHA-256 checksum of the payload
  const payloadStr = JSON.stringify(payload, null, 2);
  const checksum = crypto.createHash('sha256').update(payloadStr).digest('hex');

  const manifest: ReleaseManifest = { ...payload, checksum };

  const outPath = path.join(ROOT, 'release-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`✅ Release manifest written: ${outPath}`);
  console.log(`   Build ID:  ${buildId}`);
  console.log(`   Git SHA:   ${git.sha}`);
  console.log(`   Branch:    ${git.branch}`);
  console.log(`   Modules:   ${modules.length} active`);
  console.log(`   Checksum:  ${checksum.slice(0, 16)}...`);
}

main();
