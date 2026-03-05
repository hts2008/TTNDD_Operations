import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

const variants: Record<string, string> = {
  default: 'border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
  secondary: 'border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
  destructive: 'border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]',
  outline: 'text-[hsl(var(--foreground))]',
  success: 'border-transparent bg-emerald-100 text-emerald-800',
  warning: 'border-transparent bg-amber-100 text-amber-800',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', variants[variant], className)} {...props} />
  );
}
