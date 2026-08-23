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

/* 按应用确定性每日波动：日粒度曲线稳定 */
const daySeries = (id: string, use: number, range: number) => {
  const avg = use / range || 0;
  const out: number[] = [];
  for (let i = 0; i < range; i++) {
    let h = 0;
    const s = `${id}:${i}`;
    for (let c = 0; c < s.length; c++) h = (h * 31 + s.charCodeAt(c)) % 997;
    out.push(avg * (0.5 + (h % 100) / 100));
  }
  return out;
};

/* 每日使用趋势图：面积+折线，末点高亮 */
const Spark = ({ id, use, range }: { id: string; use: number; range: number }) => {
  const arr = useMemo(() => daySeries(id, use, range), [id, use, range]);
  const w = 130;
  const h = 26;
  const mx = Math.max(...arr, 1);
  const pts = arr.map((v, i) => [
    (i / (arr.length - 1)) * w,
    h - 2 - (v / mx) * (h - 6),
  ]);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className="ap-dash-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-label={`近${range}天每日使用趋势`}>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill="rgba(46,124,246,.12)" />
      <polyline points={line} fill="none" stroke="#2e7cf6" strokeWidth={1.4} />
      <circle cx={last[0]} cy={last[1]} r={2} fill="#2e7cf6" />
    </svg>
  );
};

/* 使用趋势弹窗：参考品控中心趋势图——指标 pills + 周期切换 + 双线趋势 */
function AppTrendModal({ app, onClose }: { app: AppItem; onClose: () => void }) {
  const [tr, setTr] = useState<Range>(30);
  const data = useMemo(() => {
    const useN = Math.round(app.users * FACTOR[tr] * noise(app.id));
    const usePts = daySeries(app.id, useN, tr);
    const newPts = daySeries(`${app.id}:new`, Math.round(useN * 0.18), tr);
    const labels: string[] = [];
    const end = new Date();
    for (let i = tr - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    const sum = (a: number[]) => Math.round(a.reduce((s, v) => s + v, 0));
    return { usePts, newPts, labels, useSum: sum(usePts), newSum: sum(newPts) };
  }, [app, tr]);

  const W = 960;
  const H = 300;
  const L = 48;
  const R = 16;
  const T = 18;
  const B = 34;
  const n = tr;
  const mx = Math.max(...data.usePts, ...data.newPts, 1) * 1.15;
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1);
  const y = (v: number) => T + (1 - v / mx) * (H - T - B);
  const step = Math.max(1, Math.ceil(n / 8));
  const line = (pts: number[]) => pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <div className="ap-trend-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ap-trend-modal">
        <div className="ap-trend-head">
          <div>
            <b>趋势图</b>
            <i>{app.name} · {app.category}</i>
          </div>
          <button type="button" className="ap-trend-close" onClick={onClose}>×</button>
        </div>
        <div className="ap-trend-bar">
          <div className="ap-trend-chips">
            <span className="ap-trend-chip"><i style={{ background: '#f7a634' }} />版本时间段<b>v{app.version ?? '1.0.0'} · {app.release} 上线</b></span>
            <span className="ap-trend-chip"><i style={{ background: '#22a06b' }} />新增人数<b>{fmt(data.newSum)}</b></span>
            <span className="ap-trend-chip"><i style={{ background: '#2e7cf6' }} />总使用人次<b>{fmt(data.useSum)}</b></span>
          </div>
          <span className="ap-dash-range">
            {RANGES.map((r) => (
              <button key={r} type="button" className={tr === r ? 'on' : ''} onClick={() => setTr(r)}>近{r}天</button>
            ))}
          </span>
        </div>
        <svg className="ap-trend-svg" viewBox={`0 0 ${W} ${H}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const gy = T + (1 - f) * (H - T - B);
            return (
              <g key={f}>
                <line x1={L} x2={W - R} y1={gy} y2={gy} stroke="#e7eaf0" strokeDasharray="3 4" />
                <text x={L - 8} y={gy + 3} textAnchor="end" className="ax">{Math.round(f * mx)}</text>
              </g>
            );
          })}
          <polyline points={line(data.usePts)} fill="none" stroke="#2e7cf6" strokeWidth={2.2} />
          <polyline points={line(data.newPts)} fill="none" stroke="#22a06b" strokeWidth={2.2} />
          {data.usePts.map((v, i) => <circle key={`u${i}`} cx={x(i)} cy={y(v)} r={2.4} fill="#2e7cf6" />)}
          {data.newPts.map((v, i) => <circle key={`n${i}`} cx={x(i)} cy={y(v)} r={2.4} fill="#22a06b" />)}
          {data.labels.map((lb, i) => (i % step === 0 || i === n - 1 ? (
            <text key={`${lb}-${i}`} x={x(i)} y={H - 10} textAnchor="middle" className="ax">{lb}</text>
          ) : null))}
        </svg>
        <div className="ap-trend-foot">
          <span className="lg"><i style={{ background: '#2e7cf6' }} />每日使用人次</span>
          <span className="lg"><i style={{ background: '#22a06b' }} />每日新增人数</span>
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
  /* 全局人次排序 → 排名 / TOP3 重心 / 热门标记 */
  const useSorted = useMemo(() => [...rows].sort((a, b) => b.use - a.use), [rows]);
  const rankOf = useMemo(() => new Map(useSorted.map((r, i) => [r.app.id, i + 1])), [useSorted]);
  const top3 = useSorted.slice(0, 3);
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
  const hotIds = new Set(top3.map((r) => r.app.id));

  return (
    <div className="ap-dash">
      <div className="ap-dash-head">
        <button type="button" className="ap-back" onClick={onBack}><Ic d="M15 19l-7-7 7-7" size={16} /></button>
        <h2>数据看板</h2>
        <span className="ap-dash-sub">近{range}天使用人次与占比，一眼看出哪些应用好用</span>
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
            <div className="ap-dash-thead">
              <span>排名</span>
              <span>应用</span>
              <span>近{range}天使用人次</span>
              <span>应用总人次 / 日均占比</span>
              <span>使用趋势</span>
              <span>平均评分</span>
              <span>好评率</span>
              <span>标记</span>
            </div>
            <div className="ap-dash-scroll">
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
                  <button type="button" className="ap-dash-trendcell" title="点击查看使用趋势" onClick={() => setTrendApp(r.app)}>
                    <Spark id={r.app.id} use={r.use} range={range} />
                    <span>趋势图</span>
                  </button>
                  <span className="ct-strong">{r.cnt ? r.avg.toFixed(1) : '--'}</span>
                  <span className="ct-strong">{r.cnt ? `${Math.round(r.goodRate * 100)}%` : '--'}</span>
                  <span className="ap-dash-badges">
                    {r.avg >= 4.5 && r.cnt >= 3 && <em className="ap-dash-badge good">好评</em>}
                    {hotIds.has(r.app.id) && <em className="ap-dash-badge hot">热门</em>}
                  </span>
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
