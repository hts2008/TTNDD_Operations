'use client';

import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Tab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

export function Tabs({ tabs, defaultValue, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue || tabs[0]?.value);
  const current = tabs.find((t) => t.value === active);

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-[hsl(var(--border))]">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActive(tab.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-colors relative',
              active === tab.value
                ? 'text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
            )}
          >
            {tab.label}
            {active === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]" />
            )}
          </button>
        ))}
      </div>
      <div className="pt-4">{current?.content}</div>
    </div>
  );
}
