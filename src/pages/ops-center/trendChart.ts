/* 驾驶舱趋势图共享逻辑：趋势弹窗单指标图与对比模式多指标图共用同一周期/取数口径 */

export function parseNumberText(txt: string) {
  const s = (txt || '').replace(/[¥,%]/g, '').replace(/,/g, '').trim();
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}
export function isRateMetric(name: string) {
  return name.indexOf('率') > -1;
}
export function metricUnit(name: string) {
  if (isRateMetric(name)) return '%';
  if (name.indexOf('利润') > -1 || name.indexOf('费') > -1 || name.indexOf('成本') > -1 || name === '销售金额')
    return '¥';
  return '';
}
export function formatChartValue(name: string, v: number) {
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

/* 统计时间文本 + 时间模式 → X 轴刻度与周期描述 */
export function chartPeriod(dateText: string, mode: string) {
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
  if (mode === 'month') {
    const mp = text.split('-');
    const my = +mp[0];
    const mm = +mp[1];
    if (my && mm) {
      const n = new Date(my, mm, 0).getDate();
      const lm: string[] = [];
      for (let i = 1; i <= n; i++) lm.push(mm + '/' + i);
      return { labels: lm, desc: text };
    }
  }
  /* 日内按小时细分（00:00~24:00 共 25 点），避免 4 小时一刻度过散 */
  const hourLabels: string[] = [];
  for (let h = 0; h <= 24; h++) hourLabels.push((h < 10 ? '0' + h : String(h)) + ':00');
  if (mode === 'day') {
    return { labels: hourLabels, desc: '日 · ' + text };
  }
  return { labels: hourLabels, desc: '实时 · ' + text };
}

/* 指标示例序列：围绕基准值波动，末点收口到基准（与卡片数值一致）；
   按指标名哈希错开系数起点与波形相位，保证多指标同框时曲线形态可区分 */
function metricSeed(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return h;
}
export function makeTrendValues(metric: string, count: number, base: number) {
  const factors = [
    0.82, 0.91, 0.88, 1.02, 0.97, 1.08, 1.0, 1.05, 0.94, 1.11, 1.03, 0.98, 1.07, 1.02, 0.96, 1.09, 1.12, 1.04,
    0.99, 1.06, 1.01, 0.95, 1.1, 1.03, 1.08, 1.0, 0.97, 1.05, 1.02, 1.0, 1.04,
  ];
  const seed = metricSeed(metric);
  const off = seed % factors.length;
  const phase = (seed % 7) * 0.53;
  const vals: number[] = [];
  for (let i = 0; i < count; i++) {
    const f = factors[(i + off) % factors.length];
    const wave = Math.sin(i * 0.83 + phase) * 0.055;
    let v = base * (f + wave);
    if (isRateMetric(metric)) v = Math.max(0, v);
    vals.push(v);
  }
  if (vals.length) vals[vals.length - 1] = base;
  return vals;
}

/* 对比模式多序列配色：按选入顺序取色 */
export const CMP_COLORS = ['#4f7cff', '#f77234', '#0fc6c2', '#722ed1', '#00b42a', '#eb4ba0', '#f53f3f', '#3491fa'];
