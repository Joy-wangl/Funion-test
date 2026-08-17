/* =========================================================
   品控管理 v2 · 轻量 SVG 图表（趋势图 / 环形图）
   ========================================================= */
import { pct, type TrendPoint } from './data';

/* ---------- 近30天退款率趋势：面积线 + 阈值虚线 + 悬浮数值 ---------- */
export function TrendChart({ points, threshold }: { points: TrendPoint[]; threshold: number }) {
  const W = 640;
  const H = 230;
  const L = 42;
  const R = 12;
  const T = 16;
  const B = 28;
  const yMax = 0.3;
  const x = (i: number) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (r: number) => T + (1 - Math.min(r, yMax) / yMax) * (H - T - B);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z`;
  const ticks = [0, 0.1, 0.2, 0.3];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#edf0f5" />
          <text x={L - 6} y={y(t) + 3} textAnchor="end" className="ax">{Math.round(t * 100)}%</text>
        </g>
      ))}
      <line
        x1={L}
        x2={W - R}
        y1={y(threshold)}
        y2={y(threshold)}
        stroke="#f53f3f"
        strokeDasharray="4 4"
      />
      <text x={W - R} y={y(threshold) - 5} textAnchor="end" className="ax red">阈值 {Math.round(threshold * 100)}%</text>
      <path d={area} fill="rgba(79,124,255,0.10)" />
      <path d={line} fill="none" stroke="#4f7cff" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.rate)} r="2.4" fill="#4f7cff">
          <title>{p.date} · 退款率 {pct(p.rate)} · 订单 {p.orders}</title>
        </circle>
      ))}
      {points.map((p, i) => (i % 6 === 0 || i === points.length - 1 ? (
        <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="ax">{p.date}</text>
      ) : null))}
    </svg>
  );
}

/* ---------- 环形分布图：中心总量 + 右侧图例 ---------- */
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function Donut({ slices, centerTop, centerSub }: {
  slices: DonutSlice[];
  centerTop: string;
  centerSub: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--fill-2)" strokeWidth="16" />
        {slices.map((s) => {
          const frac = s.value / total;
          const el = s.value > 0 ? (
            <circle
              key={s.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${(frac * C).toFixed(2)} ${C.toFixed(2)}`}
              strokeDashoffset={(-acc * C).toFixed(2)}
              transform="rotate(-90 70 70)"
            >
              <title>{s.label} {s.value}（{pct(frac)}）</title>
            </circle>
          ) : null;
          acc += frac;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="donut-n">{centerTop}</text>
        <text x="70" y="86" textAnchor="middle" className="donut-k">{centerSub}</text>
      </svg>
      <div className="donut-legend">
        {slices.map((s) => (
          <div className="dl-row" key={s.label}>
            <i style={{ background: s.color }} />
            <span className="dl-k">{s.label}</span>
            <span className="dl-v">{s.value}</span>
            <span className="dl-p">{pct(s.value / total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
