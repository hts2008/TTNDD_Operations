/**
 * Generate TypeScript types from the OpenAPI specification.
 *
 * Usage:
 *   node contracts/openapi/codegen.js
 *
 * Requires: npx openapi-typescript (auto-installed via npx -y)
 *
 * Output:
 *   contracts/openapi/api-types.d.ts   — Full typed paths/operations
 */
const { execSync } = require('child_process');
const path = require('path');

const specPath = path.join(__dirname, 'ttndd-ops-api.json');
const outputPath = path.join(__dirname, 'api-types.d.ts');

console.log('🔄 Generating TypeScript types from OpenAPI spec...');
console.log(`   Input:  ${specPath}`);
console.log(`   Output: ${outputPath}`);

try {
  execSync(`npx -y openapi-typescript "${specPath}" -o "${outputPath}"`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..', '..'),
  });
  console.log('✅ TypeScript types generated successfully');
} catch (e) {
  console.error('❌ Codegen failed:', e.message);
  process.exit(1);
}
