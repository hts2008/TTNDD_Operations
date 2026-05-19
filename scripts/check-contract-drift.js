const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const tmpDir = path.join(root, '.contract-tmp', `${process.pid}-${Date.now()}`);

function runNode(args) {
  execFileSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_ENV: process.env.APP_ENV ?? 'development',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://dummy:dummy@localhost:5432/dummy',
      DATABASE_MIGRATION_URL:
        process.env.DATABASE_MIGRATION_URL ?? 'postgresql://dummy:dummy@localhost:5432/dummy',
    },
  });
}

function compareFiles(label, expectedPath, actualPath, updateCommand) {
  const expected = fs.readFileSync(expectedPath, 'utf8');
  const actual = fs.readFileSync(actualPath, 'utf8');

  if (expected !== actual) {
    console.error(`${label} drift detected.`);
    console.error(`Expected: ${path.relative(root, expectedPath)}`);
    console.error(`Actual:   ${path.relative(root, actualPath)}`);
    console.error(`Fix:      ${updateCommand}`);
    process.exitCode = 1;
  } else {
    console.log(`${label} drift check passed`);
  }
}

function checkEventCatalog() {
  const actual = path.join(tmpDir, 'events-catalog.json');
  runNode(['scripts/generate-event-catalog.js', '--output', actual]);
  compareFiles(
    'Event catalog',
    path.join(root, 'contracts/events/catalog.json'),
    actual,
    'node scripts/generate-event-catalog.js',
  );
}

function checkOpenApi() {
  const actual = path.join(tmpDir, 'ttndd-ops-api.json');
  runNode(['contracts/openapi/generate.js', '--output', actual]);
  compareFiles(
    'OpenAPI',
    path.join(root, 'contracts/openapi/ttndd-ops-api.json'),
    actual,
    'pnpm --filter api build && node contracts/openapi/generate.js',
  );
}

function main() {
  fs.mkdirSync(tmpDir, { recursive: true });

  const eventOnly = process.argv.includes('--event-catalog-only');
  const openApiOnly = process.argv.includes('--openapi-only');

  if (!openApiOnly) {
    checkEventCatalog();
  }
  if (!eventOnly) {
    checkOpenApi();
  }

  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
