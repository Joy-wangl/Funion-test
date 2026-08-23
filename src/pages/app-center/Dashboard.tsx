import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppItem, AppReview } from './data';

/* 全局时间范围：所有指标按范围联动 */
const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];
const FACTOR: Record<Range, number> = { 7: 0.12, 30: 0.35, 90: 0.72 };

const fmt = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}w` : `${n}`);

/* 按应用确定性扰动：不同范围的人次拆分稳定且有差异 */
const noise = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return 0.8 + (h % 40) / 100;
};

const Ic = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

type Row = { app: AppItem; use: number; share: number; avg: number; cnt: number; goodRate: number };

/* 按应用确定性每日波动：同一日期同一值，任意窗口下曲线稳定 */
const dayFactor = (id: string, daysAgo: number) => {
  let h = 0;
  const s = `${id}:${daysAgo}`;
  for (let c = 0; c < s.length; c++) h = (h * 31 + s.charCodeAt(c)) % 997;
  return 0.5 + (h % 100) / 100;
};

const daySeries = (id: string, use: number, n: number, off: number) => {
  const avg = use / n || 0;
  return Array.from({ length: n }, (_, i) => avg * dayFactor(id, off + n - 1 - i));
};

/* 任意天数的总人次折算系数（7/30/90 锚点分段线性插值） */
const factorOf = (n: number) => (n <= 7 ? 0.12 : n <= 30 ? 0.12 + ((n - 7) / 23) * 0.23 : n <= 90 ? 0.35 + ((n - 30) / 60) * 0.37 : 0.72);

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* 自定义日期区间：点击触发器弹出日期组件（与品控趋势图交互一致） */
function ApDateRangePicker({ value, onChange }: { value: { start: string; end: string }; onChange: (v: { start: string; end: string }) => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const max = iso(new Date());
  const minD = new Date();
  minD.setDate(minD.getDate() - 89);
  const min = iso(minD);
  return (
    <div className="ap-date-picker" ref={boxRef}>
      <button type="button" className="ap-date-trigger" onClick={() => setOpen((o) => !o)}>
        {value.start}
        <span>→</span>
        {value.end}
      </button>
      {open && (
        <div className="ap-date-pop">
          <input type="date" value={value.start} min={min} max={max} onChange={(e) => onChange({ ...value, start: e.target.value })} />
          <span>→</span>
          <input type="date" value={value.end} min={min} max={max} onChange={(e) => onChange({ ...value, end: e.target.value })} />
        </div>
      )}
    </div>
  );
}

/* 使用趋势弹窗：参考品控中心趋势图——指标 pills + 周期切换 + 双线趋势 */
function AppTrendModal({ app, onClose }: { app: AppItem; onClose: () => void }) {
  const [tr, setTr] = useState<Range | 'custom'>(30);
  /* 自定义区间（限近 90 天内） */
  const [custom, setCustom] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return { start: iso(start), end: iso(end) };
  });
  /* 指标显隐（参考品控：chip 点击切换） */
  const [hidden, setHidden] = useState<Set<'use' | 'new'>>(new Set());
  const toggle = (k: 'use' | 'new') => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    return next;
  });
  const data = useMemo(() => {
    /* 窗口：预设=近 N 天；自定义=选定区间（钳制近 90 天、反序交换） */
    let n: number;
    let off: number;
    if (tr !== 'custom') {
      n = tr; off = 0;
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const parse = (s: string) => { const d = new Date(`${s}T00:00:00`); return Number.isNaN(+d) ? new Date(today) : d; };
      let s = parse(custom.start);
      let e = parse(custom.end);
      const min = new Date(today); min.setDate(min.getDate() - 89);
      if (+s < +min) s = min;
      if (+e > +today) e = today;
      if (+s > +e) { const t = s; s = e; e = t; }
      n = Math.max(2, Math.round((+e - +s) / 86400000) + 1);
      off = Math.round((+today - +e) / 86400000);
    }
    const useN = Math.round(app.users * factorOf(n) * noise(app.id));
    const usePts = daySeries(app.id, useN, n, off);
    const newPts = daySeries(`${app.id}:new`, Math.round(useN * 0.18), n, off);
    const labels: string[] = [];
    const end = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - (off + i));
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    const sum = (a: number[]) => Math.round(a.reduce((s, v) => s + v, 0));
    /* 版本上线日在图表窗口内的下标：之前=旧版完成带，之后=当前版本运行中带 */
    const first = new Date();
    first.setDate(first.getDate() - (off + n - 1));
    const relIdx = Math.round((new Date(app.release).getTime() - first.getTime()) / 86400000);
    return { usePts, newPts, labels, useSum: sum(usePts), newSum: sum(newPts), relIdx, n };
  }, [app, tr, custom]);

  const W = 960;
  const H = 300;
  const L = 48;
  const R = 16;
  const T = 18;
  const B = 34;
  const n = data.n;
  /* 悬浮提示（与品控趋势图交互一致）：竖向参考线 + 暗色 tooltip */
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setHover(null); }, [data]);
  const mx = Math.max(...(hidden.has('use') ? [] : data.usePts), ...(hidden.has('new') ? [] : data.newPts), 1) * 1.15;
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1);
  const y = (v: number) => T + (1 - v / mx) * (H - T - B);
  const step = Math.max(1, Math.ceil(n / 8));
  const line = (pts: number[]) => pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const onMove = (e: { clientX: number; clientY: number }) => {
    const wrap = wrapRef.current;
    const rect = wrap?.querySelector('svg')?.getBoundingClientRect();
    if (!wrap || !rect) return;
    const fx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((fx - L) / (W - L - R)) * (n - 1))));
    const wr = wrap.getBoundingClientRect();
    setHover({ i, px: (x(i) / W) * rect.width, py: Math.max(8, Math.min(e.clientY - wr.top, wr.height - 8)) });
  };
  const wrapW = wrapRef.current?.clientWidth ?? 800;

  /* 鼠标滚轮切换时间范围（与品控趋势图交互一致） */
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastWheel = useRef(0);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel.current < 260) return;
      lastWheel.current = now;
      setTr((prev) => {
        const idx = prev === 'custom' ? -1 : RANGES.indexOf(prev);
        return RANGES[(idx + (e.deltaY > 0 ? 1 : 2)) % RANGES.length];
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="ap-trend-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ap-trend-modal" ref={bodyRef}>
        <div className="ap-trend-head">
          <div>
            <b>趋势图</b>
            <i>{app.name} · {app.category}</i>
          </div>
          <button type="button" className="ap-trend-close" onClick={onClose}>×</button>
        </div>
        <div className="ap-trend-bar">
          <div className="ap-trend-chips">
            <button
              type="button"
              className={`ap-trend-chip ${hidden.has('new') ? 'off' : ''}`}
              title={hidden.has('new') ? '显示「新增人数」' : '隐藏「新增人数」'}
              onClick={() => toggle('new')}
            >
              <i style={{ background: hidden.has('new') ? '#d5d9e0' : '#22a06b' }} />新增人数<b>{fmt(data.newSum)}</b>
            </button>
            <button
              type="button"
              className={`ap-trend-chip ${hidden.has('use') ? 'off' : ''}`}
              title={hidden.has('use') ? '显示「总使用人次」' : '隐藏「总使用人次」'}
              onClick={() => toggle('use')}
            >
              <i style={{ background: hidden.has('use') ? '#d5d9e0' : '#2e7cf6' }} />总使用人次<b>{fmt(data.useSum)}</b>
            </button>
          </div>
          <span className="ap-dash-range">
            {RANGES.map((r) => (
              <button key={r} type="button" className={tr === r ? 'on' : ''} onClick={() => setTr(r)}>近{r}天</button>
            ))}
            <button type="button" className={tr === 'custom' ? 'on' : ''} onClick={() => setTr('custom')}>自定义</button>
          </span>
          {tr === 'custom' && <ApDateRangePicker value={custom} onChange={setCustom} />}
        </div>
        <div className="ap-trend-chartwrap" ref={wrapRef}>
        <svg className="ap-trend-svg" viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const gy = T + (1 - f) * (H - T - B);
            return (
              <g key={f}>
                <line x1={L} x2={W - R} y1={gy} y2={gy} stroke="#e7eaf0" strokeDasharray="3 4" />
                <text x={L - 8} y={gy + 3} textAnchor="end" className="ax">{Math.round(f * mx)}</text>
              </g>
            );
          })}
          {/* 版本时间段色带：参考品控中心趋势图（完成=绿 / 运行中=蓝），垫在折线下 */}
          {data.relIdx > 0 && (
            <g>
              <rect x={x(0)} y={T} width={Math.max(2, x(Math.min(data.relIdx, n - 1)) - x(0))} height={H - T - B} fill="#22a06b" opacity={0.08} />
              <line x1={x(0)} x2={x(0)} y1={T} y2={H - B} stroke="#22a06b" strokeDasharray="4 4" opacity={0.6} />
              {data.relIdx < n && <line x1={x(data.relIdx)} x2={x(data.relIdx)} y1={T} y2={H - B} stroke="#22a06b" opacity={0.6} />}
              <text x={x(0) + 4} y={T + 10} fill="#22a06b" className="band-lb">上一版·完成</text>
            </g>
          )}
          {data.relIdx < n && (
            <g>
              <rect x={x(Math.max(data.relIdx, 0))} y={T} width={Math.max(2, W - R - x(Math.max(data.relIdx, 0)))} height={H - T - B} fill="#2e7cf6" opacity={0.08} />
              <line x1={x(Math.max(data.relIdx, 0))} x2={x(Math.max(data.relIdx, 0))} y1={T} y2={H - B} stroke="#2e7cf6" strokeDasharray="4 4" opacity={0.6} />
              <text x={x(Math.max(data.relIdx, 0)) + 4} y={T + 10} fill="#2e7cf6" className="band-lb">v{app.version ?? '1.0.0'}·运行中</text>
            </g>
          )}
          {!hidden.has('use') && <polyline points={line(data.usePts)} fill="none" stroke="#2e7cf6" strokeWidth={2.2} />}
          {!hidden.has('new') && <polyline points={line(data.newPts)} fill="none" stroke="#22a06b" strokeWidth={2.2} />}
          {!hidden.has('use') && data.usePts.map((v, i) => <circle key={`u${i}`} cx={x(i)} cy={y(v)} r={hover?.i === i ? 4 : 2.4} fill="#2e7cf6" />)}
          {!hidden.has('new') && data.newPts.map((v, i) => <circle key={`n${i}`} cx={x(i)} cy={y(v)} r={hover?.i === i ? 4 : 2.4} fill="#22a06b" />)}
          {hover && (!hidden.has('use') || !hidden.has('new')) && (
            <line x1={x(hover.i)} x2={x(hover.i)} y1={T} y2={H - B} stroke="#8a94a6" strokeDasharray="4 4" opacity={0.5} />
          )}
          {data.labels.map((lb, i) => (i % step === 0 || i === n - 1 ? (
            <text key={`${lb}-${i}`} x={x(i)} y={H - 10} textAnchor="middle" className="ax">{lb}</text>
          ) : null))}
        </svg>
        {hover && (!hidden.has('use') || !hidden.has('new')) && (
          <div
            className="ap-trend-tip"
            style={{
              left: hover.px,
              top: hover.py,
              transform: hover.px > wrapW - 190 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
            }}
          >
            <div className="ap-trend-tip-date">{data.labels[hover.i]}</div>
            {!hidden.has('use') && (
              <div className="ap-trend-tip-line"><i style={{ background: '#2e7cf6' }} />总使用人次<b>{fmt(Math.round(data.usePts[hover.i]))}</b></div>
            )}
            {!hidden.has('new') && (
              <div className="ap-trend-tip-line"><i style={{ background: '#22a06b' }} />新增人数<b>{fmt(Math.round(data.newPts[hover.i]))}</b></div>
            )}
          </div>
        )}
        </div>
        <div className="ap-trend-foot">
          <span className="pd">{data.labels[0]} → {data.labels[n - 1]}</span>
          <button type="button" className="ap-trend-closebtn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
}

/* 数据看板：领导视角——哪些应用好用、范围内总人次与使用占比 */
export default function AppDashboard({ apps, reviews, onBack }: { apps: AppItem[]; reviews: AppReview[]; onBack: () => void }) {
  const [range, setRange] = useState<Range>(30);
  const [sort, setSort] = useState<'use' | 'rate'>('use');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [trendApp, setTrendApp] = useState<AppItem | null>(null);

  /* 按应用聚合评价：均分 / 条数 / 好评率 */
  const rateByApp = useMemo(() => {
    const m = new Map<string, { sum: number; cnt: number; good: number }>();
    reviews.forEach((r) => {
      const s = m.get(r.appId) ?? { sum: 0, cnt: 0, good: 0 };
      s.sum += r.stars;
      s.cnt += 1;
      if (r.stars >= 4) s.good += 1;
      m.set(r.appId, s);
    });
    return m;
  }, [reviews]);

  const rows = useMemo<Row[]>(() => {
    const raw = apps.map((a) => {
      const s = rateByApp.get(a.id);
      return {
        app: a,
        use: Math.round(a.users * FACTOR[range] * noise(a.id)),
        share: 0,
        avg: s && s.cnt ? s.sum / s.cnt : 0,
        cnt: s?.cnt ?? 0,
        goodRate: s && s.cnt ? s.good / s.cnt : 0,
      };
    });
    const total = raw.reduce((x, r) => x + r.use, 0) || 1;
    raw.forEach((r) => { r.share = r.use / total; });
    raw.sort(sort === 'use'
      ? (a, b) => b.use - a.use
      : (a, b) => (b.avg || -1) - (a.avg || -1) || b.use - a.use);
    return raw;
  }, [apps, rateByApp, range, sort]);

  const rangeTotal = rows.reduce((s, r) => s + r.use, 0);
  /* 全局人次排序 → 排名 */
  const useSorted = useMemo(() => [...rows].sort((a, b) => b.use - a.use), [rows]);
  const rankOf = useMemo(() => new Map(useSorted.map((r, i) => [r.app.id, i + 1])), [useSorted]);
  const top10 = useSorted.slice(0, 10);
  const maxUsers = Math.max(1, ...apps.map((a) => a.users));
  const cats = useMemo(() => [...new Set(apps.map((a) => a.category))], [apps]);

  /* 类目条横向滚动：仅溢出时显示左右滚动按钮（参考应用商城交互） */
  const catScrollRef = useRef<HTMLDivElement | null>(null);
  const [catNav, setCatNav] = useState({ l: false, r: false });
  const updateCatNav = () => {
    const el = catScrollRef.current;
    if (!el) { setCatNav({ l: false, r: false }); return; }
    setCatNav({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    const t = requestAnimationFrame(updateCatNav);
    window.addEventListener('resize', updateCatNav);
    return () => { cancelAnimationFrame(t); window.removeEventListener('resize', updateCatNav); };
  }, [cats]);
  const kw = q.trim().toLowerCase();
  const view = rows.filter((r) =>
    (cat === 'all' || r.app.category === cat) &&
    (!kw || r.app.name.toLowerCase().includes(kw)));
  const allTotal = apps.reduce((s, a) => s + a.users, 0);
  const avgAll = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;
  const goodAll = reviews.length ? reviews.filter((r) => r.stars >= 4).length / reviews.length : 0;
  const goodApps = rows.filter((r) => r.avg >= 4.5 && r.cnt >= 3);
  
  /* 应用数据概览：新增按上线日期判、更新按名称去重、蒙尘=日均使用不足 2 人次 */
  const newApps = apps.filter((a) => Date.now() - new Date(a.release).getTime() <= range * 86400000).length;
  const updatedApps = new Set(apps.filter((a) => a.hasUpdate || a.releaseNote).map((a) => a.name)).size;
  const dustApps = rows.filter((r) => r.use / range < 2).length;

  return (
    <div className="ap-dash">
      <div className="ap-dash-head">
        <button type="button" className="ap-back" onClick={onBack}><Ic d="M15 19l-7-7 7-7" size={16} /></button>
        <h2>数据概览</h2>
        <span className="ap-dash-sub">应用资产与使用情况，一眼看清</span>
        <span className="ap-dash-search">
          <Ic d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.35-4.35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索应用名称" />
        </span>
        <span className="ap-dash-range">
          {RANGES.map((d) => (
            <button key={d} type="button" className={range === d ? 'on' : ''} onClick={() => setRange(d)}>近{d}天</button>
          ))}
        </span>
      </div>

      <section className="ap-dash-ovmod">
        <h3>应用数据概览<span>应用资产与更新状态</span></h3>
        <div className="ap-dash-kpis">
          <div className="ap-dash-kpi">
            <span className="lb">应用总数</span>
            <span className="vl">{apps.length}</span>
            <span className="sb">覆盖 <b>{cats.length}</b> 个类目</span>
          </div>
          <div className="ap-dash-kpi">
            <span className="lb">新增应用数</span>
            <span className="vl">{newApps}</span>
            <span className="sb">近{range}天新上线</span>
          </div>
          <div className="ap-dash-kpi">
            <span className="lb">更新应用数（去重后）</span>
            <span className="vl">{updatedApps}</span>
            <span className="sb">按应用名去重的版本更新</span>
          </div>
          <div className="ap-dash-kpi">
            <span className="lb">蒙尘应用数</span>
            <span className="vl">{dustApps}</span>
            <span className="sb">近{range}天日均使用 &lt; 2 人次</span>
          </div>
        </div>
      </section>

      <section className="ap-dash-ovmod">
        <h3>使用情况概览<span>近{range}天使用与口碑</span></h3>
        <div className="ap-dash-kpis">
          <div className="ap-dash-kpi">
            <span className="lb">近{range}天总使用人次</span>
            <span className="vl">{fmt(rangeTotal)}</span>
            <span className="sb">日均约 <b>{fmt(Math.round(rangeTotal / range))}</b> 人次</span>
          </div>
          <div className="ap-dash-kpi">
            <span className="lb">累计总人次</span>
            <span className="vl">{fmt(allTotal)}</span>
            <span className="sb">近{range}天新增占 <b>{allTotal ? Math.round((rangeTotal / allTotal) * 100) : 0}%</b></span>
          </div>
          <div className="ap-dash-kpi">
            <span className="lb">总体平均评分</span>
            <span className="vl">{avgAll ? avgAll.toFixed(1) : '--'}</span>
            <span className="sb">整体好评率 <b>{Math.round(goodAll * 100)}%</b></span>
          </div>
          <div className="ap-dash-kpi">
            <span className="lb">好评应用</span>
            <span className="vl">{goodApps.length}</span>
            <span className="sb">均分 ≥ 4.5 且评价 ≥ 3 条</span>
          </div>
        </div>
      </section>

      <div className="ap-dash-duo">
        <section className="ap-dash-card ap-dash-top3-mod">
          <div className="ap-dash-top3-head">
            <h3>近{range}天使用 TOP10</h3>
            <span>按使用人次排出的头部应用</span>
          </div>
          <div className="ap-dash-top3-list">
            {top10.map((r, i) => (
              <div className={`ap-dash-top3-row r${i + 1}`} key={r.app.id}>
                <span className="medal">{i + 1}</span>
                <span className="inf">
                  <b>{r.app.name}</b>
                  <i>{r.app.category}</i>
                </span>
                <span className="nums">
                  <b>{r.use}<em>人次 / 近{range}天</em></b>
                  <i>占全盘使用 {(r.share * 100).toFixed(1)}% · 均分 {r.cnt ? r.avg.toFixed(1) : '--'}</i>
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="ap-dash-duo-right">
          <section className="ap-dash-card">
            <h3>
              应用使用明细
              <span className="ap-dash-range">
                <button type="button" className={sort === 'use' ? 'on' : ''} onClick={() => setSort('use')}>按使用人次</button>
                <button type="button" className={sort === 'rate' ? 'on' : ''} onClick={() => setSort('rate')}>按评分</button>
              </span>
            </h3>
            <div className="ap-dash-cats-row">
              <div className="ap-dash-cats-scroll" ref={catScrollRef} onScroll={updateCatNav}>
                <div className="ap-dash-range ap-dash-cats">
                  <button type="button" className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>全部</button>
                  {cats.map((c) => (
                    <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>
                  ))}
                </div>
              </div>
              {(catNav.l || catNav.r) && (
                <span className="ap-rev-nav ap-dash-cats-nav">
                  <button type="button" title="向左滚动" disabled={!catNav.l} onClick={() => catScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}><Ic d="M15 18l-6-6 6-6" size={13} /></button>
                  <button type="button" title="向右滚动" disabled={!catNav.r} onClick={() => catScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}><Ic d="M9 18l6-6-6-6" size={13} /></button>
                </span>
              )}
            </div>
            <div className="ap-dash-scroll">
              <div className="ap-dash-thead">
                <span>排名</span>
                <span>应用</span>
                <span>近{range}天使用人次</span>
                <span>应用总人次 / 日均占比</span>
                <span>平均评分</span>
                <span>好评率</span>
                <span>使用趋势</span>
              </div>
              {view.map((r) => (
                <div className="ap-dash-trow" key={r.app.id}>
                  <span className={`rk${(rankOf.get(r.app.id) ?? 0) <= 3 ? ' top' : ''}`}>{rankOf.get(r.app.id)}</span>
                  <span className="nm">
                    <b>{r.app.name}</b>
                    <i>{r.app.category}</i>
                  </span>
                  <span className="ct-strong">{r.use} 人次<i className="ap-dash-dayavg">日均 {Math.round(r.use / range)}</i></span>
                  <span className="ap-dash-share">
                    <span className="tr"><i style={{ width: `${Math.max(2, Math.round((r.app.users / maxUsers) * 100))}%` }} /></span>
                    <span className="pc">总 {fmt(r.app.users)} 人次 · 日均占 {(r.share * 100).toFixed(1)}%</span>
                  </span>
                  <span className="ct-strong">{r.cnt ? r.avg.toFixed(1) : '--'}</span>
                  <span className="ct-strong">{r.cnt ? `${Math.round(r.goodRate * 100)}%` : '--'}</span>
                  <button type="button" className="ap-dash-trendcell" title="点击查看使用趋势" onClick={() => setTrendApp(r.app)}>趋势图</button>
                </div>
              ))}
              {view.length === 0 && <div className="ap-dash-empty">未找到匹配应用，调整搜索或类目试试</div>}
            </div>
          </section>
        </div>
      </div>

      {trendApp && <AppTrendModal app={trendApp} onClose={() => setTrendApp(null)} />}
    </div>
  );
}
