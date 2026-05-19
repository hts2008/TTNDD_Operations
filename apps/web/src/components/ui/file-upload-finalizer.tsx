'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface UploadRequestResponse {
  fileRefId: string;
  uploadUrl: string;
  objectKey: string;
  expiresAt: string;
}

interface FinalizeResponse {
  fileRefId: string;
  status: 'READY' | 'INFECTED' | 'FAILED';
  scanStatus: 'CLEAN' | 'INFECTED' | 'FAILED';
  checksum?: string | null;
  finalizedAt?: string | null;
}

interface FileUploadFinalizerProps {
  entityType: string;
  entityId?: string;
  accept?: string;
  maxSizeBytes?: number;
  buttonLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  testId?: string;
  onReady?: (result: FinalizeResponse, file: File) => Promise<void> | void;
}

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024;

async function sha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `sha256:${hex}`;
}

export function FileUploadFinalizer({
  entityType,
  entityId,
  accept,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  buttonLabel = 'Upload file',
  compact,
  disabled,
  className,
  testId = 'file-upload-finalizer',
  onReady,
}: FileUploadFinalizerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file?: File) {
    if (!file || disabled || status === 'uploading') return;
    if (file.size <= 0) {
      setStatus('error');
      setMessage('File is empty');
      return;
    }
    if (file.size > maxSizeBytes) {
      setStatus('error');
      setMessage('File exceeds size limit');
      return;
    }

    setStatus('uploading');
    setMessage('Requesting upload');

    try {
      const upload = await api.post<UploadRequestResponse>('/file-storage/upload-request', {
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        entityType,
        entityId,
      });

      setMessage('Uploading object');
      const uploadResponse = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Object upload failed (${uploadResponse.status})`);
      }

      setMessage('Finalizing scan');
      const checksum = await sha256(file);
      const finalized = await api.post<FinalizeResponse>('/file-storage/finalize', {
        fileRefId: upload.fileRefId,
        objectKey: upload.objectKey,
        checksum,
        sizeBytes: file.size,
      });

      if (finalized.status !== 'READY') {
        throw new Error(`File is ${finalized.status}`);
      }

      await onReady?.(finalized, file);
      setStatus('ready');
      setMessage(`${file.name} ready`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        data-testid={`${testId}-input`}
        disabled={disabled || status === 'uploading'}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <Button
        type="button"
        size={compact ? 'sm' : 'default'}
        variant="outline"
        data-testid={`${testId}-button`}
        className={cn('motion-pressable gap-2', compact && 'w-full text-xs')}
        disabled={disabled || status === 'uploading'}
        onClick={() => inputRef.current?.click()}
      >
        {status === 'uploading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status === 'ready' ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : status === 'error' ? (
          <XCircle className="h-4 w-4 text-red-600" />
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        {status === 'uploading' ? 'Uploading' : buttonLabel}
      </Button>
      {message && (
        <p
          className={cn(
            'text-xs',
            status === 'error'
              ? 'text-red-600'
              : status === 'ready'
                ? 'text-emerald-700'
                : 'text-muted-foreground',
          )}
          data-testid={`${testId}-status`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
