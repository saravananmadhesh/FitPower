import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** id of the element with role="tabpanel" that these tabs control. */
  panelId: string;
  className?: string;
}

/** Chip-style tablist: roving tabindex, ←/→/Home/End move and select. */
export function Tabs({ tabs, value, onChange, ariaLabel, panelId, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((tab) => tab.id === value);
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex gap-2 overflow-x-auto p-1', className)}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${panelId}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={onKeyDown}
            className={cn(
              'h-8 shrink-0 whitespace-nowrap rounded-full border px-3 text-body-sm font-medium transition-colors duration-base',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              selected
                ? 'border-accent bg-accent-soft text-text'
                : 'border-border bg-card-2 text-text-muted hover:border-border-strong hover:text-text',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
