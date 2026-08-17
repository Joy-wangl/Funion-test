import { useMemo, useState } from 'react';

interface TrendModalProps {
  metric: string;
  /** 对应 KPI 卡片上的数值文本（用于生成趋势基准值） */
  kpiValueText: string;
  /** 当前统计时间文本 */
  dateText: string;
  /** 当前时间模式：realtime / 7 / 30 / custom */
  mode: string;
  onClose: () => void;
}

function parseNumberText(txt: string) {
  const s = (txt || '').replace(/[¥,%]/g, '').replace(/,/g, '').trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}
function isRateMetric(name: string) {
  return name.indexOf('率') > -1;
}
function metricUnit(name: string) {
  if (isRateMetric(name)) return '%';
  if (name.indexOf('利润') > -1 || name.indexOf('费') > -1 || name.indexOf('成本') > -1 || name === '销售金额')
    return '¥';
  return '';
}
function formatChartValue(name: string, v: number) {
  if (isRateMetric(name)) return v.toFixed(1) + '%';
  if (metricUnit(name) === '¥') return '¥' + Math.round(v).toLocaleString();
  if (name === '店铺数' || name === '下架链接数') return v.toFixed(0);
  return Math.round(v).toLocaleString();
}
function dateAdd(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function parseYmd(s: string) {
  const a = s.split('-');
  if (a.length !== 3) return null;
  return new Date(+a[0], +a[1] - 1, +a[2]);
}
function chartPeriod(dateText: string, mode: string) {
  const text = dateText.trim();
  if (text.indexOf('~') > -1) {
    const ps = text.split('~').map((x) => x.trim());
    const s = parseYmd(ps[0]);
    const e = parseYmd(ps[1]);
    if (s && e) {
      const labels: string[] = [];
      let cur = new Date(s);
      let guard = 0;
      while (cur <= e && guard < 31) {
        labels.push(cur.getMonth() + 1 + '/' + cur.getDate());
        cur = dateAdd(cur, 1);
        guard++;
      }
      return { labels, desc: text };
    }
  }
  if (mode === '7') {
    const e7 = new Date(2026, 7, 12);
    const l7: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d7 = dateAdd(e7, -i);
      l7.push(d7.getMonth() + 1 + '/' + d7.getDate());
    }
    return { labels: l7, desc: '近7天' };
  }
  if (mode === '30') {
    const e30 = new Date(2026, 7, 12);
    const l30: string[] = [];
    for (let j = 29; j >= 0; j--) {
      const d30 = dateAdd(e30, -j);
      l30.push(d30.getMonth() + 1 + '/' + d30.getDate());
    }
    return { labels: l30, desc: '近30天' };
  }
  return { labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'], desc: '实时 · ' + text };
}
function makeTrendValues(metric: string, count: number, base: number) {
  const factors = [
    0.82, 0.91, 0.88, 1.02, 0.97, 1.08, 1.0, 1.05, 0.94, 1.11, 1.03, 0.98, 1.07, 1.02, 0.96, 1.09, 1.12, 1.04,
    0.99, 1.06, 1.01, 0.95, 1.1, 1.03, 1.08, 1.0, 0.97, 1.05, 1.02, 1.0, 1.04,
  ];
  const vals: number[] = [];
  for (let i = 0; i < count; i++) {
    const f = factors[i % factors.length];
    const wave = Math.sin(i * 0.83) * 0.055;
    let v = base * (f + wave);
    if (isRateMetric(metric)) v = Math.max(0, v);
    vals.push(v);
  }
  if (vals.length) vals[vals.length - 1] = base;
  return vals;
}

function ChartSvg({
  metric,
  labels,
  values,
  type,
}: {
  metric: string;
  labels: string[];
  values: number[];
  type: 'line' | 'bar';
}) {
  const W = 820;
  const H = 320;
  const L = 58;
  const R = 18;
  const T = 22;
  const B = 54;
  const plotW = W - L - R;
  const plotH = H - T - B;
  let min = Math.min.apply(null, values);
  let max = Math.max.apply(null, values);
  if (max === min) max = min + 1;
  const pad = (max - min) * 0.15;
  min = Math.max(0, min - pad);
  max = max + pad;
  const y = (v: number) => T + ((max - v) / (max - min)) * plotH;
  const x = (i: number) => (labels.length <= 1 ? L + plotW / 2 : L + i * (plotW / (labels.length - 1)));
  // X轴标签：最多显示10个，避免30天太挤
  const step = Math.max(1, Math.ceil(labels.length / 10));
  const bw = Math.max(8, Math.min(34, plotW / (labels.length * 1.6)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* 横向网格和Y轴标签 */}
      {[0, 1, 2, 3, 4].map((g) => {
        const gy = T + g * (plotH / 4);
        const gv = max - g * ((max - min) / 4);
        return (
          <g key={`grid-${g}`}>
            <line x1={L} y1={gy} x2={W - R} y2={gy} stroke="#eef1f5" strokeWidth="1" />
            <text x={L - 8} y={gy + 4} textAnchor="end" fontSize="11" fill="#98a0ae">
              {formatChartValue(metric, gv)}
            </text>
          </g>
        );
      })}
      {labels.map((label, i) =>
        i % step === 0 || i === labels.length - 1 ? (
          <text key={`x-${i}`} x={x(i)} y={H - 20} textAnchor="middle" fontSize="11" fill="#8a91a0">
            {label}
          </text>
        ) : null,
      )}
      {type === 'bar'
        ? values.map((v, b) => {
            const bx = x(b) - bw / 2;
            const by = y(v);
            const bh = T + plotH - by;
            return <rect key={`bar-${b}`} x={bx} y={by} width={bw} height={bh} rx="4" fill="#6b8cff" opacity="0.86" />;
          })
        : [
            <polyline
              key="line"
              fill="none"
              stroke="#4f7cff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={values.map((v, p) => `${x(p)},${y(v)}`).join(' ')}
            />,
            ...values.map((v, c) => (
              <circle key={`dot-${c}`} cx={x(c)} cy={y(v)} r="3.5" fill="#fff" stroke="#4f7cff" strokeWidth="2" />
            )),
          ]}
    </svg>
  );
}

export default function TrendModal({ metric, kpiValueText, dateText, mode, onClose }: TrendModalProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const { labels, desc, values } = useMemo(() => {
    const base = parseNumberText(kpiValueText);
    const period = chartPeriod(dateText, mode);
    return { ...period, values: makeTrendValues(metric, period.labels.length, base) };
  }, [metric, kpiValueText, dateText, mode]);

  return (
    <div
      className="trend-mask show"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="trend-modal">
        <div className="trend-head">
          <div>
            <div className="trend-title">{metric}趋势</div>
            <div className="trend-sub">统计时间：{dateText}　·　{desc}</div>
          </div>
          <button className="trend-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="trend-toolbar">
          <button className={`chart-type ${chartType === 'line' ? 'active' : ''}`} onClick={() => setChartType('line')}>
            折线图
          </button>
          <button className={`chart-type ${chartType === 'bar' ? 'active' : ''}`} onClick={() => setChartType('bar')}>
            柱状图
          </button>
        </div>
        <div className="trend-body">
          <div className="trend-chart">
            <ChartSvg metric={metric} labels={labels} values={values} type={chartType} />
          </div>
          <div className="chart-tip">图表数据为当前原型示例，后续可接入真实业务数据。</div>
        </div>
      </div>
    </div>
  );
}
