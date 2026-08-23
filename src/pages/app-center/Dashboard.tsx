import { useMemo, useState } from 'react';
import type { AppItem, AppReview } from './data';

/* 确定性伪随机：保证每次打开趋势曲线一致 */
const seeded = (seed: number) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const fmt = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}w` : `${n}`);

const DONUT_COLORS = ['#2e7cf6', '#f7ba1e', '#00b42a', '#f53f3f', '#722ed1', '#0fc6c2'];

const Ic = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* 数据看板：应用使用统计二级页 */
export default function AppDashboard({ apps, reviews, onBack }: { apps: AppItem[]; reviews: AppReview[]; onBack: () => void }) {
  const [range, setRange] = useState<7 | 30>(30);

  const totalUsers = apps.reduce((s, a) => s + a.users, 0);
  const avgStars = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;
  const pending = reviews.filter((r) => !r.reply).length;
  const repliedRate = reviews.length ? Math.round(((reviews.length - pending) / reviews.length) * 100) : 100;
  const newThisMonth = apps.filter((a) => Date.now() - new Date(a.release.replace(/\//g, '-')).getTime() <= 30 * 86400000).length;

  /* 使用趋势序列（按范围确定性生成） */
  const series = useMemo(() => {
    const rand = seeded(42);
    const base = Math.max(40, totalUsers / 260);
    return Array.from({ length: range }, (_, i) => {
      const wave = 1 + 0.35 * Math.sin(i / 3.1) + 0.18 * Math.sin(i / 1.7 + 2);
      return Math.round(base * wave * (0.8 + rand() * 0.5));
    });
  }, [range, totalUsers]);

  const topApps = useMemo(() => [...apps].sort((a, b) => b.users - a.users).slice(0, 8), [apps]);
  const catDist = useMemo(() => {
    const m = new Map<string, number>();
    apps.forEach((a) => m.set(a.category, (m.get(a.category) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [apps]);
  const starDist = useMemo(() => {
    const arr = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { arr[r.stars - 1] += 1; });
    return arr;
  }, [reviews]);
  const starMax = Math.max(1, ...starDist);
  const topMax = Math.max(1, ...topApps.map((a) => a.users));

  /* 趋势图几何 */
  const W = 640, H = 220, PL = 42, PR = 12, PT = 14, PB = 26;
  const max = Math.max(...series) * 1.15;
  const px = (i: number) => PL + (i * (W - PL - PR)) / (series.length - 1);
  const py = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  const line = series.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
  const area = `${line} L${px(series.length - 1).toFixed(1)} ${H - PB} L${px(0).toFixed(1)} ${H - PB} Z`;
  const dayLabel = (i: number) => {
    const d = new Date(Date.now() - (series.length - 1 - i) * 86400000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const ticks = [0, Math.floor((series.length - 1) / 3), Math.floor((2 * (series.length - 1)) / 3), series.length - 1];

  /* 环形图几何 */
  const R = 56, C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div className="ap-dash">
      <div className="ap-dash-head">
        <button type="button" className="ap-back" onClick={onBack}><Ic d="M15 19l-7-7 7-7" size={16} /></button>
        <h2>数据看板</h2>
        <span className="ap-dash-sub">应用使用情况与运营数据总览，支持定期复盘</span>
      </div>

      <div className="ap-dash-kpis">
        <div className="ap-dash-kpi">
          <span className="lb">上架应用</span>
          <span className="vl">{apps.length}</span>
          <span className="sb">近30天新增 <b>{newThisMonth}</b> 个</span>
        </div>
        <div className="ap-dash-kpi">
          <span className="lb">累计使用人次</span>
          <span className="vl">{fmt(totalUsers)}</span>
          <span className="sb">日均约 <b>{fmt(Math.round(totalUsers / 90))}</b> 人次</span>
        </div>
        <div className="ap-dash-kpi">
          <span className="lb">平均评分</span>
          <span className="vl">{avgStars ? avgStars.toFixed(1) : '--'}</span>
          <span className="sb">共 <b>{reviews.length}</b> 条评价</span>
        </div>
        <div className="ap-dash-kpi">
          <span className="lb">待回复反馈</span>
          <span className="vl">{pending}</span>
          <span className="sb">反馈回复率 <b>{repliedRate}%</b></span>
        </div>
      </div>

      <div className="ap-dash-row">
        <section className="ap-dash-card">
          <h3>
            使用趋势
            <span className="ap-dash-range">
              <button type="button" className={range === 7 ? 'on' : ''} onClick={() => setRange(7)}>近7天</button>
              <button type="button" className={range === 30 ? 'on' : ''} onClick={() => setRange(30)}>近30天</button>
            </span>
          </h3>
          <svg className="ap-dash-chart" viewBox={`0 0 ${W} ${H}`}>
            {[0, 0.5, 1].map((t) => (
              <g key={t}>
                <line x1={PL} x2={W - PR} y1={PT + t * (H - PT - PB)} y2={PT + t * (H - PT - PB)} stroke="#ececf0" strokeDasharray={t === 1 ? '' : '4 4'} />
                <text x={PL - 6} y={PT + t * (H - PT - PB) + 4} textAnchor="end" fontSize={10} fill="#98a0b3">{fmt(Math.round(max * (1 - t)))}</text>
              </g>
            ))}
            <path d={area} fill="rgba(46,124,246,0.10)" />
            <path d={line} fill="none" stroke="#2e7cf6" strokeWidth={2} strokeLinecap="round" />
            {ticks.map((i) => (
              <g key={i}>
                <circle cx={px(i)} cy={py(series[i])} r={3} fill="#fff" stroke="#2e7cf6" strokeWidth={2} />
                <text x={px(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#98a0b3">{dayLabel(i)}</text>
              </g>
            ))}
          </svg>
        </section>

        <section className="ap-dash-card">
          <h3>类目分布</h3>
          <div className="ap-dash-donut">
            <svg width={150} height={150} viewBox="0 0 160 160">
              <g transform="rotate(-90 80 80)">
                {catDist.map(([name, n], i) => {
                  const frac = n / apps.length;
                  const el = (
                    <circle
                      key={name}
                      cx={80} cy={80} r={R} fill="none"
                      stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth={22}
                      strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`}
                      strokeDashoffset={(-acc * C).toFixed(1)}
                    />
                  );
                  acc += frac;
                  return el;
                })}
              </g>
              <text x={80} y={76} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1f2329">{apps.length}</text>
              <text x={80} y={94} textAnchor="middle" fontSize={11} fill="#98a0b3">应用总数</text>
            </svg>
            <div className="ap-dash-legend">
              {catDist.map(([name, n], i) => (
                <span className="li" key={name}>
                  <i style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {name}
                  <span className="pc">{n} 个 · {Math.round((n / apps.length) * 100)}%</span>
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="ap-dash-row">
        <section className="ap-dash-card">
          <h3>应用使用排行 TOP{topApps.length}</h3>
          <div className="ap-dash-bars">
            {topApps.map((a, i) => (
              <div className="ap-dash-bar-row" key={a.id}>
                <span className={`rk${i < 3 ? ' top' : ''}`}>{i + 1}</span>
                <span className="nm" title={a.name}>{a.name}</span>
                <span className="tr"><i style={{ width: `${Math.round((a.users / topMax) * 100)}%` }} /></span>
                <span className="ct">{a.users} 人使用</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ap-dash-card">
          <h3>评分分布</h3>
          <div className="ap-dash-bars">
            {[5, 4, 3, 2, 1].map((s) => (
              <div className="ap-dash-star-row" key={s}>
                <span className="st">{s} 星</span>
                <span className="tr"><i style={{ width: `${Math.round((starDist[s - 1] / starMax) * 100)}%` }} /></span>
                <span className="ct">{starDist[s - 1]}</span>
              </div>
            ))}
          </div>
          <div className="ap-dash-good">好评率 {reviews.length ? Math.round(((starDist[3] + starDist[4]) / reviews.length) * 100) : 100}%</div>
        </section>
      </div>
    </div>
  );
}
