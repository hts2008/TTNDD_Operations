import { ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role' },
    { key: 'status', header: 'Status' },
  ];

  const sampleData = [
    { name: 'Đoàn A', role: 'scout', status: 'active' },
    { name: 'Trưởng B', role: 'leader', status: 'active' },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    service = new ExportService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ── CSV Export ─────────────────────────────────────────

  describe('exportCSV', () => {
    it('should produce valid CSV with BOM and header', () => {
      const buffer = service.exportCSV(sampleData, columns);
      const content = buffer.toString('utf-8');
      expect(content.startsWith('\uFEFF')).toBe(true);
      expect(content).toContain('Name,Role,Status');
      expect(content).toContain('Đoàn A,scout,active');
    });

    it('should escape fields containing commas', () => {
      const data = [{ name: 'Nguyễn, Văn A', role: 'scout', status: 'active' }];
      const buffer = service.exportCSV(data, columns);
      const content = buffer.toString('utf-8');
      expect(content).toContain('"Nguyễn, Văn A"');
    });

    it('should handle empty data', () => {
      const buffer = service.exportCSV([], columns);
      const content = buffer.toString('utf-8');
      expect(content).toContain('Name,Role,Status');
      const lines = content.trim().split('\r\n');
      expect(lines).toHaveLength(1);
    });

    it('should apply column transforms', () => {
      const cols = [
        { key: 'name', header: 'Name' },
        { key: 'status', header: 'Status', transform: (v: unknown) => String(v).toUpperCase() },
      ];
      const buffer = service.exportCSV(sampleData, cols);
      const content = buffer.toString('utf-8');
      expect(content).toContain('ACTIVE');
    });
  });

  // ── Excel Export ───────────────────────────────────────

  describe('exportExcel', () => {
    it('should produce TSV format with BOM', () => {
      const buffer = service.exportExcel(sampleData, columns);
      const content = buffer.toString('utf-8');
      expect(content.startsWith('\uFEFF')).toBe(true);
      expect(content).toContain('Name\tRole\tStatus');
      expect(content).toContain('Đoàn A\tscout\tactive');
    });

    it('should strip tabs and newlines from values', () => {
      const data = [{ name: 'Line1\tLine2', role: 'scout\nleader', status: 'active' }];
      const buffer = service.exportExcel(data, columns);
      const content = buffer.toString('utf-8');
      expect(content).not.toContain('\t\t');
      expect(content).toContain('Line1 Line2');
    });
  });

  // ── PDF Export ─────────────────────────────────────────

  describe('exportPDF', () => {
    it('should produce text-based table output', () => {
      const buffer = service.exportPDF(sampleData, columns);
      const content = buffer.toString('utf-8');
      expect(content).toContain('Name');
      expect(content).toContain('Role');
      expect(content).toContain('---');
      expect(content.split('\n').length).toBeGreaterThanOrEqual(3);
    });

    it('should truncate long values to 20 chars', () => {
      const data = [{ name: 'A very long name that exceeds the limit', role: 'scout', status: 'active' }];
      const buffer = service.exportPDF(data, columns);
      const content = buffer.toString('utf-8');
      const lines = content.split('\n');
      const dataLine = lines[2];
      expect(dataLine.substring(0, 20).trim().length).toBeLessThanOrEqual(20);
    });
  });

  // ── Signed URL ─────────────────────────────────────────

  describe('generateSignedUrl', () => {
    it('should generate URL with token and expiry', () => {
      const buffer = Buffer.from('test content');
      const result = service.generateSignedUrl(buffer, 'test.csv', 5);
      expect(result.url).toMatch(/^\/exports\/.+\.csv$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
