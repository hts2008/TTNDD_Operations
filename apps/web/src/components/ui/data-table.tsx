'use client';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({ columns, data, onRowClick, className }: DataTableProps<T>) {
  return (
    <div className={cn('overflow-auto rounded-lg border', className)}>
      <table className="w-full text-sm">
        <thead className="bg-[hsl(var(--muted))]">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-[hsl(var(--muted-foreground))]">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={i}
              className={cn('border-t hover:bg-[hsl(var(--muted)_/_0.5)] transition-colors', onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(item) : String(item[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">
                No data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
