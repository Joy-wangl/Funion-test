/* =========================================================
   品控中心 v3 · 轻量 SVG 图表
   问题类型占比（图例 + 堆叠条） / 问题趋势（多系列平滑面积图 · 图例点击显隐）
   ========================================================= */
import { useRef, useState } from 'react';

export interface ShareItem {
  label: string;
  value: number;
  color: string;
}

/* ---------- 问题类型占比：图例 + 堆叠占比条 ---------- */
export function StackedShareBar({ items }: { items: ShareItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="share-bar-wrap">
      <div className="share-legend">
        {items.map((i) => (
          <span className="sl-item" key={i.label}>
            <i style={{ background: i.color }} />
            {i.label}
          </span>
        ))}
      </div>
      <div className="share-bar">
        {items.filter((i) => i.value > 0).map((i) => (
          <span
            key={i.label}
            style={{ width: `${((i.value / total) * 100).toFixed(2)}%`, background: i.color }}
            title={`${i.label} ${i.value}（${Math.round((i.value / total) * 100)}%）`}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- 问题类型占比：环形饼图（中心问题总数；图例点击显隐；悬浮色块气泡展示类型/占比/订单风险率） ---------- */
export function PieChart({ items, totalOrders }: { items: ShareItem[]; totalOrders?: number }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toggle = (label: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    return next;
  });
  const moveTip = (label: string) => (e: { clientX: number; clientY: number }) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ label, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const size = 190;
  const cx = size / 2;
  const cy = size / 2;
  const R = 88;
  const r = 54;
  const allTotal = items.reduce((s, i) => s + i.value, 0);
  const visible = items.filter((i) => !hidden.has(i.label) && i.value > 0);
  const total = visible.reduce((s, i) => s + i.value, 0);
  const sharePct = (v: number) => `${allTotal ? ((v / allTotal) * 100).toFixed(1) : '0.0'}%`;
  const riskPct = (v: number) => `${totalOrders ? ((v / totalOrders) * 100).toFixed(1) : '0.0'}%`;
  let angle = -Math.PI / 2;
  const slices = visible.map((i) => {
    const a0 = angle;
    const a1 = angle + (i.value / total) * Math.PI * 2;
    angle = a1;
    return { ...i, a0, a1 };
  });
  const wedge = (a0: number, a1: number) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + R * Math.cos(a0);
    const y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1);
    const y1 = cy + R * Math.sin(a1);
    return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
  };
  return (
    <div className="pie-wrap" ref={wrapRef}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="pie-svg">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={R} fill="#eef0f4" />
        ) : slices.length === 1 ? (
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill={slices[0].color}
            className="pie-slice"
            onClick={() => toggle(slices[0].label)}
            onMouseMove={moveTip(slices[0].label)}
            onMouseLeave={() => setTip(null)}
          />
        ) : (
          slices.map((s) => (
            <path
              key={s.label}
              d={wedge(s.a0, s.a1)}
              fill={s.color}
              className="pie-slice"
              onClick={() => toggle(s.label)}
              onMouseMove={moveTip(s.label)}
              onMouseLeave={() => setTip(null)}
            />
          ))
        )}
        <circle cx={cx} cy={cy} r={r} fill="#f7f8fa" pointerEvents="none" />
        <text x={cx} y={cy - 2} textAnchor="middle" className="pie-total">{total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" className="pie-sub">问题数</text>
      </svg>
      {tip && !hidden.has(tip.label) && (() => {
        const it = items.find((i) => i.label === tip.label);
        if (!it) return null;
        return (
          <div className="pie-tip" style={{ left: tip.x, top: tip.y }}>
            <div className="pie-tip-line">
              <i style={{ background: it.color }} />
              {it.label}
              <b>{sharePct(it.value)}</b>
            </div>
            {totalOrders ? <div className="pie-tip-risk">订单风险率 {riskPct(it.value)}</div> : null}
          </div>
        );
      })()}
      <div className="pie-legend">
        {items.map((i) => {
          const off = hidden.has(i.label);
          return (
            <span
              key={i.label}
              className={`pie-leg ${off ? 'off' : ''}`}
              title={off ? `显示「${i.label}」` : `隐藏「${i.label}」`}
              onClick={() => toggle(i.label)}
            >
              <i style={{ background: off ? '#d5d9e0' : i.color }} />
              {i.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 指标趋势大图（趋势图弹层：多维度双轴曲线 · 图例显隐 · 悬浮气泡多行数值） ---------- */
export type OptBand = {
  /** 优化开始日期（YYYY-MM-DD） */
  start: string;
  /** 优化完成日期；缺省=进行中，带延伸至右缘 */
  end?: string;
  label: string;
  color: string;
};

export interface MetricSeriesDef {
  key: string;
  name: string;
  color: string;
  points: number[];
  format: (v: number) => string;
  /** 左轴=计数类 / 右轴=比率类 */
  axis: 'left' | 'right';
}

export function MetricTrendChart({ labels, series, hidden, bands }: {
  labels: string[];
  /** 全部维度序列（显隐由 hidden 控制） */
  series: MetricSeriesDef[];
  /** 隐藏的维度 key（图例点击切换） */
  hidden: Set<string>;
  /** 优化过程区间带（优化中 → 优化完成） */
  bands?: OptBand[];
}) {
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const W = 1000;
  const H = 340;
  const L = 56;
  const R = 56;
  const T = 18;
  const B = 36;
  const n = labels.length;
  const visible = series.filter((s) => !hidden.has(s.key));
  const lefts = visible.filter((s) => s.axis === 'left');
  const rights = visible.filter((s) => s.axis === 'right');
  const lMax = lefts.length ? niceMax(Math.max(...lefts.flatMap((s) => s.points), 1e-9) * 1.1) : 0;
  const rMax = rights.length ? niceMax(Math.max(...rights.flatMap((s) => s.points), 1e-9) * 1.1) : 0;
  const x = (i: number) => (n === 1 ? (W - L - R) / 2 + L : L + (i * (W - L - R)) / (n - 1));
  const yL = (v: number) => T + (1 - v / (lMax || 1)) * (H - T - B);
  const yR = (v: number) => T + (1 - v / (rMax || 1)) * (H - T - B);
  const yOf = (s: MetricSeriesDef) => (s.axis === 'left' ? yL : yR);
  const lFmt = lefts[0]?.format ?? ((v: number) => Math.round(v).toLocaleString());
  const rFmt = rights[0]?.format ?? ((v: number) => `${Math.round(v * 100)}%`);
  const fracs = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.ceil(n / 8));
  const onMove = (e: { clientX: number; clientY: number }) => {
    const wrap = wrapRef.current;
    const rect = wrap?.querySelector('svg')?.getBoundingClientRect();
    if (!wrap || !rect) return;
    const fx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((fx - L) / (W - L - R)) * (n - 1))));
    const wr = wrap.getBoundingClientRect();
    setHover({ i, px: (x(i) / W) * rect.width, py: Math.max(8, Math.min(e.clientY - wr.top, wr.height - 8)) });
  };
  /* 日期 → 轴下标：标签为 MM/DD 或小时制，按 MMDD 匹配；区间带起点早于窗口时左钳制 */
  const bandIdx = (d?: string) => {
    if (!d) return -1;
    const key = d.slice(5).replace(/\D/g, '');
    return labels.findIndex((lb) => lb.replace(/\D/g, '').slice(-4) === key);
  };
  const wrapW = wrapRef.current?.clientWidth ?? 800;
  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="metric-trend" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {fracs.map((f) => {
          const yy = T + (1 - f) * (H - T - B);
          return (
            <g key={f}>
              <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="#e7eaf0" strokeDasharray="3 4" />
              {lMax > 0 && <text x={L - 8} y={yy + 3} textAnchor="end" className="ax">{lFmt(f * lMax)}</text>}
              {rMax > 0 && <text x={W - R + 8} y={yy + 3} textAnchor="start" className="ax ax-r">{rFmt(f * rMax)}</text>}
            </g>
          );
        })}
        {lMax > 0 && <text x={L} y={T - 6} className="ax-cap">数量</text>}
        {rMax > 0 && <text x={W - R} y={T - 6} textAnchor="end" className="ax-cap ax-r">比率</text>}
        {(bands ?? []).map((b, bi) => {
          let i0 = bandIdx(b.start);
          const i1 = bandIdx(b.end);
          if (i0 < 0 && (b.end ? i1 >= 0 : true)) i0 = 0;
          if (i0 < 0) return null;
          const x1 = x(i0);
          const x2 = i1 >= 0 ? x(i1) : W - R;
          return (
            <g key={bi}>
              <rect x={x1} y={T} width={Math.max(2, x2 - x1)} height={H - T - B} fill={b.color} opacity={0.08} />
              <line x1={x1} x2={x1} y1={T} y2={H - B} stroke={b.color} strokeDasharray="4 4" opacity={0.6} />
              {i1 >= 0 && <line x1={x2} x2={x2} y1={T} y2={H - B} stroke={b.color} opacity={0.6} />}
              <text x={x1 + 4} y={T + 10} fill={b.color} className="band-lb">{b.label}{i1 >= 0 ? '·完成' : '·进行中'}</text>
            </g>
          );
        })}
        {visible.map((s) => {
          const y = yOf(s);
          const pts = s.points.map((v, i) => ({ x: x(i), y: y(v) }));
          return (
            <g key={s.key}>
              {n > 1 && <path d={smoothPath(pts)} fill="none" stroke={s.color} strokeWidth={2.2} />}
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hover?.i === i ? 4 : 2.4} fill={s.color} />)}
            </g>
          );
        })}
        {hover && visible.length > 0 && (
          <line x1={x(hover.i)} x2={x(hover.i)} y1={T} y2={H - B} stroke="#8a94a6" strokeDasharray="4 4" opacity={0.5} />
        )}
        {labels.map((lb, i) => ((i % step === 0 || i === n - 1) ? (
          <text key={`${lb}-${i}`} x={x(i)} y={H - 10} textAnchor="middle" className="ax">{lb}</text>
        ) : null))}
      </svg>
      {visible.length === 0 && <div className="mt-empty">已隐藏全部维度，点击上方图例恢复显示</div>}
      {hover && visible.length > 0 && (
        <div
          className="mt-tip"
          style={{
            left: hover.px,
            top: hover.py,
            transform: hover.px > wrapW - 190 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
          }}
        >
          <div className="mt-tip-date">{labels[hover.i]}</div>
          {visible.map((s) => (
            <div className="mt-tip-line" key={s.key}>
              <i style={{ background: s.color }} />
              {s.name}
              <b>{s.format(s.points[hover.i])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 平滑路径（Catmull-Rom → 贝塞尔） ---------- */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  const u = v / p;
  const m = u <= 1 ? 1 : u <= 2 ? 2 : u <= 5 ? 5 : 10;
  return m * p;
}

/* ---------- 问题趋势：多系列平滑面积图 + 订单量对照曲线（右轴） + 底部图例 ---------- */
export function ProblemTrendChart({ labels, series, orders }: {
  labels: string[];
  series: { type: string; color: string; points: number[] }[];
  /** 订单量对照序列（与 labels 对齐，右轴刻度） */
  orders?: number[];
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hideOrders, setHideOrders] = useState(false);
  const toggle = (type: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    return next;
  });
  const W = 960;
  const H = 300;
  const L = 48;
  const R = 48;
  const T = 14;
  const B = 34;
  const n = labels.length;
  const visible = series.filter((s) => !hidden.has(s.type));
  const showOrders = !!orders && !hideOrders;
  const yMax = niceMax(Math.max(...visible.flatMap((s) => s.points), 1) * 1.05);
  const oMax = showOrders && orders ? niceMax(Math.max(...orders, 1) * 1.05) : 0;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(n - 1, 1);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const yO = (v: number) => T + (1 - v / oMax) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax));
  const oTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * oMax));
  const step = Math.max(1, Math.ceil(n / 7));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#edf0f5" strokeDasharray="3 4" />
            <text x={L - 8} y={y(t) + 3} textAnchor="end" className="ax">{t}</text>
          </g>
        ))}
        {showOrders && oTicks.map((t) => (
          <text key={`o-${t}`} x={W - R + 8} y={yO(t) + 3} textAnchor="start" className="ax ax-right">{t}</text>
        ))}
        {showOrders && orders && (
          <path
            d={smoothPath(orders.map((v, i) => ({ x: x(i), y: yO(v) })))}
            fill="none"
            stroke="#232b3a"
            strokeWidth={1.6}
            strokeDasharray="5 4"
            opacity={0.75}
          />
        )}
        {visible.map((s) => {
          const pts = s.points.map((v, i) => ({ x: x(i), y: y(v) }));
          const line = smoothPath(pts);
          const area = `${line} L${x(n - 1).toFixed(1)},${(H - B).toFixed(1)} L${x(0).toFixed(1)},${(H - B).toFixed(1)} Z`;
          return (
            <g key={s.type}>
              <path d={area} fill={s.color} opacity={0.12} />
              <path d={line} fill="none" stroke={s.color} strokeWidth={2} />
            </g>
          );
        })}
        {labels.map((lb, i) => (i % step === 0 || i === n - 1 ? (
          <text key={`${lb}-${i}`} x={x(i)} y={H - 10} textAnchor="middle" className="ax">{lb}</text>
        ) : null))}
      </svg>
      <div className="trend-legend-bottom">
        {orders && (
          <span
            className={`tl-item ${hideOrders ? 'off' : ''}`}
            title={hideOrders ? '显示「订单量」' : '隐藏「订单量」'}
            onClick={() => setHideOrders((v) => !v)}
          >
            <i className="dash" style={{ background: hideOrders ? '#d5d9e0' : '#232b3a' }} />
            订单量（右轴）
          </span>
        )}
        {series.map((s) => {
          const off = hidden.has(s.type);
          return (
            <span
              className={`tl-item ${off ? 'off' : ''}`}
              key={s.type}
              title={off ? `显示「${s.type}」` : `隐藏「${s.type}」`}
              onClick={() => toggle(s.type)}
            >
              <i style={{ background: off ? '#d5d9e0' : s.color }} />
              {s.type}
            </span>
          );
        })}
      </div>
    </div>
  );
}
