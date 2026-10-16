import type { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}

export function Switch({ checked, onCheckedChange, label, className, ...props }: SwitchProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2', className)}>
      <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-card-2 transition-colors duration-base peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="pointer-events-none absolute left-0.5 h-4 w-4 rounded-full bg-text-subtle transition-transform duration-base peer-checked:translate-x-4 peer-checked:bg-accent-ink" />
      </span>
      <span className="text-body-sm text-text-muted">{label}</span>
    </label>
  );
}
