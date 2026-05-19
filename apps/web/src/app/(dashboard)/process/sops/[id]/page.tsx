'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Archive, CheckCircle2, Clock, FileText, Send, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SopVersion {
  id: string;
  versionNo: number;
  status: string;
  content?: unknown;
  changeNotes?: string | null;
  attachmentFileRefIds?: string[];
  createdBy?: string | null;
  createdAt: string;
  publishedAt?: string | null;
}

interface SopApproval {
  id: string;
  versionNo?: number | null;
  decision?: string | null;
  comments?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

interface SopDocument {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  status: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  versions: SopVersion[];
  approvals: SopApproval[];
}

const DOC_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  published: {
    label: 'Published',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  superseded: { label: 'Superseded', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  archived: { label: 'Archived', className: 'bg-red-100 text-red-700 border-red-200' },
};

const VERSION_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  review: { label: 'Review', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  published: {
    label: 'Published',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function shortId(value?: string | null) {
  if (!value) return '-';
  return value.length > 10 ? value.slice(0, 10) : value;
}

function textFromContent(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const record = input as Record<string, unknown>;
  const parts: string[] = [];

  function visit(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const item = node as Record<string, unknown>;
    if (typeof item.text === 'string') parts.push(item.text);
    const content = item.content;
    if (Array.isArray(content)) content.forEach(visit);
  }

  visit(record);
  return parts.join(' ').trim();
}

function statusBadge(status: string, config: Record<string, { label: string; className: string }>) {
  const item = config[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  return (
    <Badge variant="outline" className={cn('border text-[11px]', item.className)}>
      {item.label}
    </Badge>
  );
}

export default function SopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [sop, setSop] = useState<SopDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadSop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SopDocument>(`/process/sops/${id}`);
      setSop(data);
    } catch (err) {
      setSop(null);
      setError(err instanceof Error ? err.message : 'Khong tai duoc SOP');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSop();
  }, [loadSop]);

  const latestVersion = useMemo(() => sop?.versions?.[0], [sop]);
  const latestText = textFromContent(latestVersion?.content);

  async function runAction(action: string, fn: () => Promise<unknown>) {
    if (busyAction) return;
    setBusyAction(action);
    setActionError(null);
    setActionStatus(null);
    try {
      await fn();
      setActionStatus('Da cap nhat SOP.');
      await loadSop();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Khong thuc hien duoc thao tac');
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Dang tai SOP...</div>;
  }

  if (error || !sop) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-4 p-6 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <div>
            <p className="font-semibold">Khong tai duoc SOP</p>
            <p className="mt-1 text-sm text-muted-foreground">{error ?? 'SOP khong ton tai'}</p>
          </div>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => router.push('/process')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Quay lai
            </Button>
            <Button onClick={loadSop}>Thu lai</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Link href="/process">
          <Button variant="ghost" size="sm" className="w-fit">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Quay lai
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {statusBadge(sop.status, DOC_STATUS)}
            {sop.category && <Badge variant="secondary">{sop.category}</Badge>}
            {latestVersion && statusBadge(latestVersion.status, VERSION_STATUS)}
          </div>
          <h1 className="text-2xl font-bold">{sop.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sop.description || 'Chua co mo ta.'}
          </p>
        </div>
        {sop.status !== 'archived' && (
          <Button
            variant="outline"
            className="w-fit border-red-200 text-red-600 hover:bg-red-50"
            disabled={Boolean(busyAction)}
            onClick={() => runAction('archive', () => api.post(`/process/sops/${sop.id}/archive`))}
          >
            <Archive className="mr-1 h-4 w-4" />
            {busyAction === 'archive' ? 'Dang luu' : 'Archive'}
          </Button>
        )}
      </div>

      {(actionStatus || actionError) && (
        <div
          className={cn(
            'rounded-md border px-4 py-3 text-sm',
            actionError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          {actionError ?? actionStatus}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Noi dung phien ban moi nhat
              </CardTitle>
              {latestVersion && (
                <Badge variant="outline" className="font-mono text-[11px]">
                  v{latestVersion.versionNo}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {!latestVersion ? (
                <p className="text-sm text-muted-foreground">SOP nay chua co phien ban.</p>
              ) : latestText ? (
                <p className="whitespace-pre-wrap text-sm leading-6">{latestText}</p>
              ) : (
                <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-4 text-xs">
                  {JSON.stringify(latestVersion.content ?? {}, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lich su phien ban</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sop.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chua co version nao.</p>
              ) : (
                sop.versions.map((version) => (
                  <div key={version.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          v{version.versionNo}
                        </Badge>
                        {statusBadge(version.status, VERSION_STATUS)}
                        {version.attachmentFileRefIds?.length ? (
                          <Badge variant="secondary">
                            {version.attachmentFileRefIds.length} file refs
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                    {version.changeNotes && (
                      <p className="mt-2 text-sm text-muted-foreground">{version.changeNotes}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thong tin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Nguoi tao</span>
                <span>{shortId(sop.createdBy)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Ngay tao</span>
                <span>{formatDate(sop.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Cap nhat</span>
                <span>{formatDate(sop.updatedAt)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {sop.tags.length ? sop.tags.map((tag) => <Badge key={tag}>{tag}</Badge>) : null}
              </div>
            </CardContent>
          </Card>

          {latestVersion && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lifecycle action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {latestVersion.status === 'draft' && (
                  <Button
                    className="w-full"
                    disabled={Boolean(busyAction)}
                    onClick={() =>
                      runAction('submit', () =>
                        api.post(
                          `/process/sops/${sop.id}/versions/${latestVersion.versionNo}/submit`,
                        ),
                      )
                    }
                  >
                    <Send className="mr-1 h-4 w-4" />
                    {busyAction === 'submit' ? 'Dang gui' : 'Submit review'}
                  </Button>
                )}
                {latestVersion.status === 'review' && (
                  <>
                    <Button
                      className="w-full"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        runAction('approve', () =>
                          api.post(
                            `/process/sops/${sop.id}/versions/${latestVersion.versionNo}/approve`,
                            {
                              approved: true,
                            },
                          ),
                        )
                      }
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {busyAction === 'approve' ? 'Dang duyet' : 'Approve'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={Boolean(busyAction)}
                      onClick={() =>
                        runAction('reject', () =>
                          api.post(
                            `/process/sops/${sop.id}/versions/${latestVersion.versionNo}/approve`,
                            {
                              approved: false,
                            },
                          ),
                        )
                      }
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      {busyAction === 'reject' ? 'Dang tu choi' : 'Reject'}
                    </Button>
                  </>
                )}
                {latestVersion.status === 'approved' && (
                  <Button
                    className="w-full"
                    disabled={Boolean(busyAction)}
                    onClick={() =>
                      runAction('publish', () =>
                        api.post(
                          `/process/sops/${sop.id}/versions/${latestVersion.versionNo}/publish`,
                        ),
                      )
                    }
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    {busyAction === 'publish' ? 'Dang ban hanh' : 'Publish'}
                  </Button>
                )}
                {['published', 'rejected'].includes(latestVersion.status) && (
                  <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    Version hien tai khong co action tiep theo trong man hinh nay.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sop.approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chua co quyet dinh duyet.</p>
              ) : (
                sop.approvals.map((approval) => (
                  <div key={approval.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{approval.decision ?? 'Decision'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(approval.decidedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      v{approval.versionNo ?? '-'} by {shortId(approval.decidedBy)}
                    </p>
                    {approval.comments && <p className="mt-2 text-sm">{approval.comments}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Runtime note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Man hinh nay doc va cap nhat truc tiep qua SOP API. Khong con fallback demo data.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
