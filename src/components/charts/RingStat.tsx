interface RingStatProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  colorClassName?: string;
}

export function RingStat({
  label,
  value,
  target,
  unit = '',
  colorClassName = 'stroke-accent',
}: RingStatProps) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * pct;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        role="img"
        aria-label={`${label}: ${value}${unit} of ${target}${unit}`}
      >
        <circle cx="36" cy="36" r={radius} strokeWidth="6" fill="none" className="stroke-card-2" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          strokeWidth="6"
          fill="none"
          className={colorClassName}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="text-center">
        <div className="tabular-nums text-h3 text-text">
          {value}
          {unit}
        </div>
        <div className="text-caption text-text-muted">{label}</div>
      </div>
    </div>
  );
}
