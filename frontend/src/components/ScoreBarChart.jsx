/**
 * Petit graphique en barres verticales, en SVG pur (aucune librairie externe).
 * data : [{ label: string, value: number }] — value attendu entre 0 et 1.
 */
export default function ScoreBarChart({ data, height = 160 }) {
  const width = Math.max(data.length * 64, 240);
  const barWidth = 34;
  const chartHeight = height - 36; // laisse la place aux labels en bas

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Lignes de repère horizontales (0.25 / 0.5 / 0.75 / 1.0) */}
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1="0" x2={width}
          y1={chartHeight - chartHeight * t}
          y2={chartHeight - chartHeight * t}
          className="stroke-gray-100"
          strokeWidth="1"
        />
      ))}

      {data.map((d, i) => {
        const x = i * 64 + 16;
        const barHeight = Math.max(chartHeight * Math.min(d.value, 1), 3);
        const y = chartHeight - barHeight;
        const couleur =
          d.value >= 0.7 ? "fill-lime-500" :
          d.value >= 0.4 ? "fill-amber-400" :
          "fill-red-400";

        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" className={couleur} />
            <text
              x={x + barWidth / 2} y={y - 8}
              textAnchor="middle"
              className="fill-gray-700 text-[11px] font-bold"
            >
              {d.value.toFixed(2)}
            </text>
            <text
              x={x + barWidth / 2} y={chartHeight + 18}
              textAnchor="middle"
              className="fill-gray-400 text-[10px]"
            >
              {d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}