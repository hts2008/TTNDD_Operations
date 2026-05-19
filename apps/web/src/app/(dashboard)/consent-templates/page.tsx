'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageError, PageLoading } from '@/components/ui/page-states';
import { api } from '@/lib/api';
import { CheckCircle2, FileText, Search } from 'lucide-react';

interface ConsentTemplate {
  key: string;
  title: string;
  description: string;
  category: string;
}

export default function ConsentTemplatesPage() {
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await api.get<ConsentTemplate[]>('/tickets/consent-templates'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the tai consent templates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  async function createConsentTicket(templateKey: string) {
    const guardianName = window.prompt('Ten phu huynh / nguoi giam ho');
    if (!guardianName) return;
    setCreating(templateKey);
    try {
      await api.post(`/tickets/consent/${templateKey}`, { guardianName });
    } finally {
      setCreating(null);
    }
  }

  const filtered = useMemo(
    () =>
      templates.filter((t) => {
        const q = search.trim().toLowerCase();
        return !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      }),
    [templates, search],
  );

  if (loading) return <PageLoading message="Dang tai consent templates..." />;
  if (error) return <PageError message={error} onRetry={loadTemplates} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mau dong y</h1>
          <p className="text-muted-foreground">Nguon du lieu: /tickets/consent-templates.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm"
            placeholder="Tim mau dong y..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.key} className="transition-shadow hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-blue-500" />
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Active
                </span>
              </div>
              <CardTitle className="mt-2 text-base">{t.title}</CardTitle>
              <CardDescription className="text-xs">{t.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <span className="text-xs text-muted-foreground">{t.category}</span>
              <Button
                size="sm"
                onClick={() => void createConsentTicket(t.key)}
                disabled={creating === t.key}
              >
                Tao ticket
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">Khong co template phu hop.</div>
      )}
    </div>
  );
}
