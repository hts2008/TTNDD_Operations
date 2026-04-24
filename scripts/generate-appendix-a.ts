// generate-appendix-a.ts
// Parses Prisma schema and generates contracts/db/appendix-a.yaml
// Usage: npx ts-node scripts/generate-appendix-a.ts
// Ref: STORY-009 / WP-9.2 / T-0906→T-0910

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = dirname(__filename_esm);

const SCHEMA_PATH = join(__dirname_esm, '..', 'apps', 'api', 'prisma', 'schema.prisma');
const OUTPUT_PATH = join(__dirname_esm, '..', 'contracts', 'db', 'appendix-a.yaml');

interface ModelField {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  isRelation: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
  defaultValue?: string;
  attributes: string[];
}

interface ModelDef {
  name: string;
  fields: ModelField[];
  indexes: string[];
  module: string;
  hasOrgId: boolean;
  piiFields: string[];
}

const MODULE_MAP: Record<string, string> = {
  Organization: 'OrgConfig', Branch: 'OrgConfig', Unit: 'OrgConfig',
  User: 'Auth', OrgMember: 'HRM', MemberProfile: 'HRM',
  GuardianLink: 'HRM', MemberBranchHistory: 'HRM', OrgChartNode: 'HRM',
  AuditLog: 'System',
  ExpConfig: 'Rewards', ExpVisualConfig: 'Rewards', ExpTransaction: 'Rewards',
  MemberExpSummary: 'Rewards', BadgeDefinition: 'Rewards', MemberBadge: 'Rewards',
  RewardItem: 'Rewards', RewardRedemption: 'Rewards', LeaderboardSnapshot: 'Rewards',
  PeerRecognition: 'Rewards',
  RankDefinition: 'Scout', SkillGroup: 'Scout', Skill: 'Scout',
  MemberSkillProgress: 'Scout', MemberRank: 'Scout', SkillEvidence: 'Scout',
  Session: 'Sessions', SessionAttendance: 'Sessions', AnnualProgram: 'Sessions',
  Event: 'Events', EventRegistration: 'Events',
  Course: 'LMS', CourseModule: 'LMS', Lesson: 'LMS', LessonProgress: 'LMS',
  Competency: 'LMS', CourseCompetency: 'LMS', CompletionRule: 'LMS',
  Quiz: 'LMS', QuizQuestion: 'LMS', QuizAttempt: 'LMS', QuizBattle: 'LMS',
  MemberCourseProgress: 'LMS',
  SpiritualLog: 'Enrichment', NguGioiAssessment: 'Enrichment',
  Evaluation: 'Enrichment', MentoringRelationship: 'Enrichment', MentoringLog: 'Enrichment',
  Plan: 'Projects', Project: 'Projects', ProjectTask: 'Projects',
  Ticket: 'Tickets', TicketComment: 'Tickets', TicketStatusHistory: 'Tickets',
  FinancialAccount: 'Finance', FinancialTransaction: 'Finance', MemberFee: 'Finance',
  AssetCategory: 'Assets', Asset: 'Assets', AssetLoan: 'Assets',
  AssetCustomField: 'Assets', KitTemplate: 'Assets', KitTemplateItem: 'Assets',
  MaintenanceSchedule: 'Assets', UniformIssue: 'Assets',
  WorkflowDefinition: 'Process', WorkflowRun: 'Process',
  WorkflowRunLog: 'Process', WorkflowTemplate: 'Process',
  SopDocument: 'Process', SopVersion: 'Process', SopApproval: 'Process',
  Notification: 'Notifications', NotificationPreference: 'Notifications',
  NotificationTemplate: 'Notifications', NotificationDeliveryLog: 'Notifications',
  DomainEvent: 'System', FileObjectRef: 'FileStorage',
  ReleaseGateReport: 'System', ImportBatch: 'DataImport',
};

const PII_PATTERNS = ['email', 'phone', 'address', 'name', 'dob', 'dateOfBirth', 'medicalNotes', 'emergencyContact'];

function parseSchema(content: string): ModelDef[] {
  const models: ModelDef[] = [];
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields: ModelField[] = [];
    const indexes: string[] = [];

    const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

    for (const line of lines) {
      if (line.startsWith('@@')) {
        indexes.push(line);
        continue;
      }

      const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?\??/);
      if (fieldMatch) {
        const [, name, type, isArr] = fieldMatch;
        fields.push({
          name,
          type,
          isOptional: line.includes('?'),
          isArray: !!isArr,
          isRelation: /^[A-Z]/.test(type) && type !== 'String' && type !== 'Int' && type !== 'Boolean' && type !== 'DateTime' && type !== 'Float' && type !== 'Json' && type !== 'BigInt' && type !== 'Decimal',
          isPrimaryKey: line.includes('@id'),
          isUnique: line.includes('@unique'),
          defaultValue: line.match(/@default\(([^)]+)\)/)?.[1],
          attributes: (line.match(/@\w+/g) || []),
        });
      }
    }

    const hasOrgId = fields.some(f => f.name === 'orgId');
    const piiFields = fields
      .filter(f => PII_PATTERNS.some(p => f.name.toLowerCase().includes(p.toLowerCase())))
      .map(f => f.name);

    models.push({
      name: modelName,
      fields,
      indexes,
      module: MODULE_MAP[modelName] || 'Unknown',
      hasOrgId,
      piiFields,
    });
  }

  return models;
}

function generateYaml(models: ModelDef[]): string {
  const lines: string[] = [
    '# TTNDD_OPS Appendix A — All Modules Database Schemas',
    '# Auto-generated from prisma/schema.prisma',
    `# Generated: ${new Date().toISOString().split('T')[0]}`,
    '# Ref: STORY-009 / WP-9.2 / T-0906→T-0910',
    '',
    `spec_version: 'V10 FINAL'`,
    `total_models: ${models.length}`,
    `total_fields: ${models.reduce((acc, m) => acc + m.fields.filter(f => !f.isRelation).length, 0)}`,
    `rls_coverage: ${models.filter(m => m.hasOrgId).length}/${models.length} models have orgId`,
    '',
    'modules:',
  ];

  const byModule = new Map<string, ModelDef[]>();
  for (const m of models) {
    const arr = byModule.get(m.module) || [];
    arr.push(m);
    byModule.set(m.module, arr);
  }

  for (const [mod, modModels] of byModule) {
    lines.push(`  ${mod}:`);
    for (const model of modModels) {
      lines.push(`    ${model.name}:`);
      lines.push(`      rls_required: ${model.hasOrgId}`);
      if (model.piiFields.length > 0) {
        lines.push(`      pii_fields: [${model.piiFields.join(', ')}]`);
      }
      lines.push(`      columns:`);
      for (const f of model.fields.filter(ff => !ff.isRelation)) {
        const attrs = [];
        if (f.isPrimaryKey) attrs.push('PK');
        if (f.isUnique) attrs.push('UNIQUE');
        if (f.isOptional) attrs.push('NULLABLE');
        if (f.defaultValue) attrs.push(`default=${f.defaultValue}`);
        const attrStr = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
        lines.push(`        - ${f.name}: ${f.type}${f.isArray ? '[]' : ''}${attrStr}`);
      }
      if (model.indexes.length > 0) {
        lines.push(`      indexes:`);
        for (const idx of model.indexes) {
          lines.push(`        - "${idx.replace(/"/g, '\\"')}"`);
        }
      }
    }
  }

  return lines.join('\n') + '\n';
}

function main() {
  const schemaContent = readFileSync(SCHEMA_PATH, 'utf-8');
  const models = parseSchema(schemaContent);
  const yaml = generateYaml(models);
  writeFileSync(OUTPUT_PATH, yaml, 'utf-8');
  console.log(`✅ Generated appendix-a.yaml: ${models.length} models across ${new Set(models.map(m => m.module)).size} modules`);
}

main();
