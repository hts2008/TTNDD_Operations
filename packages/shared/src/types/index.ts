export type Role = 'super_admin' | 'admin' | 'user' | 'guest';

export interface TokenPayload {
  userId: string;
  orgId: string;
  role: Role;
  scopes: string[];
}

export interface DomainEventEnvelope {
  id: string;
  orgId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  actorUserId: string;
  occurredAt: Date;
  processed: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
