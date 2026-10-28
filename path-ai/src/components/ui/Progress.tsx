export function Progress({ value, 'aria-label': ariaLabel }: { value: number; 'aria-label'?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={ariaLabel}
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${clamped}%` }} />
    </div>
  );
}
