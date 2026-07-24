import { useMemo, useState } from "react";
import { monthKey, monthLabel, dayKey, dayLabel } from "../../utils/format";

const ranges = [
  { id: "12m", label: "12 mois" },
  { id: "30d", label: "30 jours" },
  { id: "7d",  label: "7 jours"  },
];

const W = 720;
const H = 240;
const PAD_X = 8;
const PAD_Y = 24;

function buildPaths(values) {
  const max = Math.max(...values, 1) * 1.12;
  const min = Math.min(...values, 0) * 0.8;
  const stepX = values.length > 1 ? (W - PAD_X * 2) / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = PAD_X + i * stepX;
    const y = PAD_Y + (1 - (v - min) / (max - min || 1)) * (H - PAD_Y * 2);
    return { x, y };
  });

  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    line += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  const area = `${line} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;
  return { line, area, points };
}

/** Regroupe les utilisateurs par mois (12 derniers mois) ou par jour (7 / 30 derniers jours). */
function buildSeries(utilisateurs, range) {
  const now = new Date();

  if (range === "12m") {
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: monthKey(d), label: monthLabel(d), value: 0 });
    }
    utilisateurs.forEach((u) => {
      const k = monthKey(new Date(u.created_at));
      const b = buckets.find((x) => x.key === k);
      if (b) b.value += 1;
    });
    return buckets;
  }

  const nbJours = range === "7d" ? 7 : 30;
  const buckets = [];
  for (let i = nbJours - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({ key: dayKey(d), label: dayLabel(d), value: 0 });
  }
  utilisateurs.forEach((u) => {
    const k = dayKey(new Date(u.created_at));
    const b = buckets.find((x) => x.key === k);
    if (b) b.value += 1;
  });
  return buckets;
}

export default function ActivityChart({ utilisateurs }) {
  const [range, setRange] = useState("12m");

  const series = useMemo(() => buildSeries(utilisateurs, range), [utilisateurs, range]);
  const values = series.map((d) => d.value);
  const { line, area, points } = buildPaths(values);
  const peakIndex = values.indexOf(Math.max(...values));
  const peak = points[peakIndex];

  // N'affiche pas tous les labels si la série est longue (30 jours) pour éviter le chevauchement.
  const showEveryNth = range === "30d" ? 3 : 1;

  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Nouvelles inscriptions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Évolution des comptes créés sur la plateforme</p>
        </div>
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                range === r.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Graphique des nouvelles inscriptions"
        >
          <defs>
            <linearGradient id="areaFillAdmin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1={PAD_X} x2={W - PAD_X}
              y1={PAD_Y + g * (H - PAD_Y * 2)} y2={PAD_Y + g * (H - PAD_Y * 2)}
              stroke="var(--color-border)"
              strokeDasharray="4 6"
            />
          ))}

          <path d={area} fill="url(#areaFillAdmin)" />
          <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={3} strokeLinecap="round" />

          {peak && (
            <>
              <line x1={peak.x} x2={peak.x} y1={peak.y} y2={H - PAD_Y} stroke="var(--color-primary)" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.5} />
              <circle cx={peak.x} cy={peak.y} r={6} fill="var(--color-card)" stroke="var(--color-primary)" strokeWidth={3} />
            </>
          )}
        </svg>

        <div className="mt-2 flex justify-between px-1 text-[11px] text-muted-foreground">
          {series.map((d, i) => (
            <span key={d.key}>{i % showEveryNth === 0 ? d.label : ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}