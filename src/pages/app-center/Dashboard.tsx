import { useMemo, useState } from 'react';
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

/* 数据看板：领导视角——哪些应用好用、范围内总人次与使用占比 */
export default function AppDashboard({ apps, reviews, onBack }: { apps: AppItem[]; reviews: AppReview[]; onBack: () => void }) {
  const [range, setRange] = useState<Range>(30);
  const [sort, setSort] = useState<'use' | 'rate'>('use');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

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
  const maxUse = useSorted[0]?.use ?? 1;
  const cats = useMemo(() => [...new Set(apps.map((a) => a.category))], [apps]);
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

      <section className="ap-dash-top3">
        {top3.map((r, i) => (
          <div className={`ap-dash-top3-card r${i + 1}`} key={r.app.id}>
            <span className="medal">{i + 1}</span>
            <span className="inf">
              <b>{r.app.name}</b>
              <i>{r.app.category}</i>
            </span>
            <span className="nums">
              <b>{r.use}<em>人次</em></b>
              <i>占比 {(r.share * 100).toFixed(1)}% · 均分 {r.cnt ? r.avg.toFixed(1) : '--'}</i>
            </span>
          </div>
        ))}
      </section>

      <section className="ap-dash-card">
        <h3>
          应用使用明细
          <span className="ap-dash-cnt">{view.length} 个应用</span>
          <span className="ap-dash-range">
            <button type="button" className={sort === 'use' ? 'on' : ''} onClick={() => setSort('use')}>按使用人次</button>
            <button type="button" className={sort === 'rate' ? 'on' : ''} onClick={() => setSort('rate')}>按评分</button>
          </span>
        </h3>
        <div className="ap-dash-cats">
          <button type="button" className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>全部</button>
          {cats.map((c) => (
            <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div className="ap-dash-thead">
          <span>排名</span>
          <span>应用</span>
          <span>近{range}天使用人次</span>
          <span>使用人次占比</span>
          <span>平均评分</span>
          <span>好评率</span>
          <span>标记</span>
        </div>
        {view.map((r) => (
          <div className="ap-dash-trow" key={r.app.id}>
            <span className={`rk${(rankOf.get(r.app.id) ?? 0) <= 3 ? ' top' : ''}`}>{rankOf.get(r.app.id)}</span>
            <span className="nm">
              <b>{r.app.name}</b>
              <i>{r.app.category}</i>
            </span>
            <span className="ct-strong">{r.use} 人次</span>
            <span className="ap-dash-share">
              <span className="tr"><i style={{ width: `${Math.max(2, Math.round((r.use / maxUse) * 100))}%` }} /></span>
              <span className="pc">{(r.share * 100).toFixed(1)}%</span>
            </span>
            <span className="ct-strong">{r.cnt ? r.avg.toFixed(1) : '--'}</span>
            <span className="ct-strong">{r.cnt ? `${Math.round(r.goodRate * 100)}%` : '--'}</span>
            <span className="ap-dash-badges">
              {r.avg >= 4.5 && r.cnt >= 3 && <em className="ap-dash-badge good">好评</em>}
              {hotIds.has(r.app.id) && <em className="ap-dash-badge hot">热门</em>}
            </span>
          </div>
        ))}
        {view.length === 0 && <div className="ap-dash-empty">未找到匹配应用，调整搜索或类目试试</div>}
      </section>
    </div>
  );
}
