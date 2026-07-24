type TTProgressProps = {
  value: number;
  max?: number;
  label?: string;
  compact?: boolean;
};

export function TTProgress({ value, max = 100, label, compact = false }: TTProgressProps) {
  const percent = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className={`tt-progress-wrap ${compact ? "is-compact" : ""}`}>
      {label ? <span className="sr-only">{label}</span> : null}
      <div className="tt-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
        <div className="tt-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
