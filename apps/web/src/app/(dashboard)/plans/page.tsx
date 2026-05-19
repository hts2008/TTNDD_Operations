'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Plan {
  id: string;
  title: string;
  planType: string | null;
  status: string;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  submitted: '#f59e0b',
  approved: '#10b981',
  locked: '#6366f1',
  rejected: '#ef4444',
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<Plan[]>('/projects/plans', filter ? { status: filter } : undefined)
      .then((data) => {
        setPlans(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [filter]);

  if (loading)
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>📋 Kế hoạch</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ width: '33%', height: 120, background: '#1f2937', borderRadius: 12 }}
            />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>📋 Kế hoạch</h1>
        <div style={{ padding: 16, background: '#7f1d1d', borderRadius: 8, color: '#fecaca' }}>
          ⚠️ {error}
        </div>
      </div>
    );

  return (
    <div style={{ padding: 32 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>📋 Kế hoạch hoạt động</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'draft', 'submitted', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                background: filter === s ? '#3b82f6' : '#374151',
                color: filter === s ? '#fff' : '#9ca3af',
              }}
            >
              {s || 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {plans.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 64, color: '#6b7280' }}>
          <p style={{ fontSize: 48, marginBottom: 8 }}>📄</p>
          <p>Chưa có kế hoạch nào.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          {plans.map((plan) => (
            <a
              key={plan.id}
              href={`/plans/${plan.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  background: '#1f2937',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #374151',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600, flex: 1, marginRight: 12 }}>
                    {plan.title}
                  </h3>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: `${STATUS_COLORS[plan.status] || '#6b7280'}22`,
                      color: STATUS_COLORS[plan.status] || '#6b7280',
                    }}
                  >
                    {plan.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>
                  {plan.planType && <span style={{ marginRight: 16 }}>📁 {plan.planType}</span>}
                  <span>🕐 {new Date(plan.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
