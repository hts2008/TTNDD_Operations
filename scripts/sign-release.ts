#!/usr/bin/env ts-node
/**
 * Release Manifest Signer
 * Generates a release-manifest.json with git SHA, build ID,
 * timestamp, and file checksums for deployment verification.
 *
 * Usage: npx ts-node scripts/sign-release.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ReleaseManifest {
  version: string;
  buildId: string;
  gitSha: string;
  gitBranch: string;
  timestamp: string;
  checksums: Record<string, string>;
  modules: string[];
  signedBy: string;
}

function getGitInfo(): { sha: string; branch: string } {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return { sha, branch };
  } catch {
    return { sha: 'unknown', branch: 'unknown' };
  }
}

function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getModuleList(): string[] {
  const modulesDir = path.resolve(__dirname, '../apps/api/src/modules');
  if (!fs.existsSync(modulesDir)) return [];
  return fs.readdirSync(modulesDir).filter((d) =>
    fs.statSync(path.join(modulesDir, d)).isDirectory(),
  );
}

function main(): void {
  const git = getGitInfo();
  const buildId = `build-${Date.now()}`;

  const criticalFiles = [
    'apps/api/package.json',
    'apps/api/prisma/schema.prisma',
    'pnpm-lock.yaml',
  ];

  const checksums: Record<string, string> = {};
  for (const file of criticalFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      checksums[file] = hashFile(fullPath);
    }
  }

  const manifest: ReleaseManifest = {
    version: JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../apps/api/package.json'), 'utf8'),
    ).version || '0.0.0',
    buildId,
    gitSha: git.sha,
    gitBranch: git.branch,
    timestamp: new Date().toISOString(),
    checksums,
    modules: getModuleList(),
    signedBy: 'sign-release.ts',
  };

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(manifest))
    .digest('hex');

  const signedManifest = { ...manifest, integrity: hash };

  const outputPath = path.resolve(__dirname, '../release-manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(signedManifest, null, 2));

  console.log('✅ Release manifest signed');
  console.log(`   Build: ${buildId}`);
  console.log(`   SHA:   ${git.sha.substring(0, 8)}`);
  console.log(`   File:  ${outputPath}`);
}

main();
