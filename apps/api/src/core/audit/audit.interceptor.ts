import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

/**
 * T-0025: AuditInterceptor — enriches audit context with IP and User-Agent.
 *
 * This interceptor sets request metadata on the request object so that
 * downstream audit.log() calls can include IP and user-agent automatically.
 *
 * Usage: Apply globally or per-controller.
 * Controller/service code can then access request['_auditMeta'].
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // Attach audit metadata to the request for downstream use
    request['_auditMeta'] = {
      ipAddress: this.extractIp(request),
      userAgent: request.headers?.['user-agent'] ?? 'unknown',
    };

    return next.handle();
  }

  private extractIp(request: Record<string, unknown>): string {
    const headers = request.headers as Record<string, string | string[]> | undefined;
    // Check common proxy headers
    const forwarded = headers?.['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ip?.trim() ?? 'unknown';
    }
    const realIp = headers?.['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? (realIp[0] ?? 'unknown') : realIp;
    }
    const ip = request.ip as string | undefined;
    if (ip) return ip;
    const socket = request.socket as { remoteAddress?: string } | undefined;
    return socket?.remoteAddress ?? 'unknown';
  }
}
