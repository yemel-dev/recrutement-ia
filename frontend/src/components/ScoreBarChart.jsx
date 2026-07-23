import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const color = val >= 0.7 ? "#84cc16" : val >= 0.4 ? "#f59e0b" : "#f87171";
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2.5">
      <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>
      <p className="text-sm font-extrabold" style={{ color }}>
        {(val * 100).toFixed(0)}%
      </p>
      <p className="text-xs text-gray-400">
        {val >= 0.7 ? "✅ Excellent" : val >= 0.4 ? "⚠️ Moyen" : "❌ Faible"}
      </p>
    </div>
  );
};

export default function ScoreBarChart({ data, height = 200 }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    ...d,
    pct: Math.round(d.value * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 10 }}
        barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => v.length > 12 ? v.slice(0, 11) + "…" : v}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb", radius: 8 }} />
        <ReferenceLine y={70} stroke="#84cc16" strokeDasharray="4 4" strokeWidth={1.5}
          label={{ value: "Seuil 70%", position: "right", fontSize: 10, fill: "#84cc16" }} />
        <Bar dataKey="pct" radius={[8, 8, 0, 0]} maxBarSize={52}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.value >= 0.7 ? "#84cc16" : entry.value >= 0.4 ? "#f59e0b" : "#f87171"}
            />
          ))}
          <LabelList
            dataKey="pct"
            position="top"
            formatter={(v) => `${v}%`}
            style={{ fontSize: 11, fontWeight: 700, fill: "#374151" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}