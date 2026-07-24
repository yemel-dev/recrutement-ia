function barColor(score) {
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-warning";
  return "bg-muted-foreground/40";
}

export default function ScoresChart({ data = [] }) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-card-foreground">Résultats de mes analyses</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Score global par candidature analysée</p>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Aucune analyse disponible</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Ton premier score apparaîtra ici après analyse de ta candidature.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex h-44 items-end justify-between gap-3">
          {data.map((item, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-card-foreground">{item.score}%</span>
              <div className="flex h-32 w-full items-end rounded-full bg-secondary/60">
                <div
                  className={`w-full rounded-full ${barColor(item.score)}`}
                  style={{ height: `${item.score}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-[11px] text-muted-foreground text-center leading-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}