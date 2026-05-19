const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const canonicalPath = path.join(root, 'contracts', 'events', 'catalog.json');
const constantsPath = path.join(root, 'packages', 'constants', 'dist', 'events.js');

function readDomainEvents() {
  if (!fs.existsSync(constantsPath)) {
    throw new Error('packages/constants/dist/events.js missing. Run: pnpm --filter @ttndd/constants build');
  }
  const { DOMAIN_EVENTS } = require(constantsPath);
  if (!DOMAIN_EVENTS || typeof DOMAIN_EVENTS !== 'object') {
    throw new Error('DOMAIN_EVENTS export missing from constants package');
  }
  return DOMAIN_EVENTS;
}

function readExistingCatalog() {
  if (!fs.existsSync(canonicalPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
}

function buildCatalog() {
  const domainEvents = readDomainEvents();
  const existing = readExistingCatalog();
  const modules = {};

  for (const [moduleKey, events] of Object.entries(domainEvents)) {
    const catalogKey = moduleKey.toLowerCase();
    const existingModule = existing.events?.[catalogKey] ?? {};
    const moduleEvents = {};

    for (const eventName of Object.values(events)) {
      moduleEvents[eventName] = existingModule.events?.[eventName] ?? {
        description: `TODO: document ${eventName}`,
        aggregateType: 'Unknown',
        triggers: [],
        consumers: [],
      };
    }

    modules[catalogKey] = {
      module_id: existingModule.module_id ?? null,
      module_name: existingModule.module_name ?? moduleKey,
      events: moduleEvents,
    };
  }

  return {
    $schema: existing.$schema ?? 'https://json-schema.org/draft/2020-12/schema',
    title: existing.title ?? 'TTNDD_OPS Event Catalog',
    version: existing.version ?? '0.2.0',
    description:
      existing.description ??
      'Code-first event catalog extracted from packages/constants/src/events.ts (DOMAIN_EVENTS).',
    envelope: existing.envelope ?? {},
    events: modules,
  };
}

function writeCatalog(outputPath) {
  const catalog = buildCatalog();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return outputPath;
}

function main() {
  const outputIndex = process.argv.indexOf('--output');
  const outputPath =
    outputIndex >= 0
      ? path.resolve(process.argv[outputIndex + 1])
      : canonicalPath;
  const check = process.argv.includes('--check');

  if (check) {
    const tmp = path.join(root, '.contract-tmp', 'events-catalog.json');
    writeCatalog(tmp);
    const expected = fs.readFileSync(canonicalPath, 'utf8');
    const actual = fs.readFileSync(tmp, 'utf8');
    if (expected !== actual) {
      throw new Error('contracts/events/catalog.json drift detected. Run: node scripts/generate-event-catalog.js');
    }
    console.log('Event catalog drift check passed');
    return;
  }

  writeCatalog(outputPath);
  console.log(`Event catalog written to: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
