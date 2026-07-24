const bandColors = {
  high: "var(--color-success)",
  mid: "var(--color-warning)",
  low: "oklch(0.7 0.01 250)",
};

const bandDot = {
  high: "bg-success",
  mid: "bg-warning",
  low: "bg-muted-foreground/40",
};

export default function PerformanceGauge({ average = 0, breakdown = [] }) {
  const radius = 72;
  const cx = 90;
  const cy = 90;
  const circumference = Math.PI * radius;
  const dash = (average / 100) * circumference;

  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">Mes performances</h3>
      </div>

      <div className="relative mx-auto flex h-[110px] w-[180px] items-end justify-center">
        <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none" stroke="var(--color-muted)" strokeWidth="14" strokeLinecap="round"
          />
          {average > 0 && (
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none" stroke={bandColors.high} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          )}
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className="text-3xl font-bold tracking-tight text-card-foreground">{average}%</span>
          <span className="text-xs text-muted-foreground">Score moyen</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {breakdown.map((row) => (
          <li key={row.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${bandDot[row.band]}`} aria-hidden="true" />
              {row.label}
            </span>
            <span className="font-semibold text-card-foreground">{row.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}