import { useEffect, useRef, useState } from 'react';
import { kpiItems, lossRows, metricNames, stockRows } from './data';
import TrendModal from './TrendModal';
import BubbleSelect from '../../components/BubbleSelect';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const same = (a: Date | null, b: Date | null) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
const dayMs = (d: Date) => +new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysDiff = (a: Date, b: Date) => Math.round((dayMs(b) - dayMs(a)) / 86400000) + 1;

const profitOptions = [
  { key: 'all', text: '全部' },
  { key: 'negative', text: '新毛六利润负' },
  { key: 'positive', text: '新毛六利润正' },
];

export default function DashboardPage() {
  /* ----- 时间栏 / 日历 ----- */
  const [mode, setMode] = useState('realtime');
  const [gran, setGran] = useState('d');
  const [dateText, setDateText] = useState('2026-08-12');
  const [active, setActive] = useState(() => new Date(2026, 7, 12));
  const [cursor, setCursor] = useState(() => new Date(2026, 7, 1));
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  /* ----- 指标选择 / 平台 / 利润分析 ----- */
  const [metricOpen, setMetricOpen] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([...metricNames]);
  const [profitOpen, setProfitOpen] = useState(false);
  const [profitFilter, setProfitFilter] = useState('all');
  const [profitText, setProfitText] = useState<string | null>('全部');

  /* ----- 趋势弹窗 ----- */
  const [trendMetric, setTrendMetric] = useState<string | null>(null);

  const timebarRef = useRef<HTMLDivElement>(null);
  const metricWrapRef = useRef<HTMLDivElement>(null);
  const profitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (timebarRef.current && !timebarRef.current.contains(t)) setCalOpen(false);
      if (metricWrapRef.current && !metricWrapRef.current.contains(t)) setMetricOpen(false);
      if (profitRef.current && !profitRef.current.contains(t)) setProfitOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function pickDate(d: Date) {
    let s = start;
    let e = end;
    if (!s || e) {
      s = d;
      e = null;
    } else {
      if (d < s) {
        e = s;
        s = d;
      } else e = d;
      if (daysDiff(s, e) > 31) {
        if (d >= s) {
          e = new Date(s);
          e.setDate(s.getDate() + 30);
        } else {
          s = new Date(e);
          s.setDate(e.getDate() - 30);
        }
        alert('最多选择 31 天');
      }
    }
    setStart(s);
    setEnd(e);
    const base = s ?? d;
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
  }

  const onMode = (m: string) => {
    setMode(m);
    if (m === 'realtime') setDateText('2026-08-12');
    if (m === '7') setDateText('2026-08-06 ~ 2026-08-12');
    if (m === '30') setDateText('2026-07-14 ~ 2026-08-12');
  };

  const onApply = () => {
    if (!start) return;
    let e = end;
    if (!e) {
      e = new Date(start);
      setEnd(e);
    }
    setDateText(same(start, e) ? fmt(start) : `${fmt(start)} ~ ${fmt(e)}`);
    setCalOpen(false);
    setMode('custom');
  };

  const onPrevDay = () => {
    const d = new Date(active);
    d.setDate(d.getDate() - 1);
    setActive(d);
    setDateText(fmt(d));
  };
  const onNextDay = () => {
    const d = new Date(active);
    d.setDate(d.getDate() + 1);
    setActive(d);
    setDateText(fmt(d));
  };

  const toggleMetric = (name: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name],
    );
  };

  const pickProfit = (key: string, text: string) => {
    setProfitFilter(key);
    setProfitText(text);
    setProfitOpen(false);
  };

  /* 渲染单个月份面板的 42 天 */
  function renderDays(base: Date) {
    const y = base.getFullYear();
    const m = base.getMonth();
    const first = new Date(y, m, 1);
    const off = (first.getDay() + 6) % 7;
    const gs = new Date(y, m, 1 - off);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gs);
      d.setDate(gs.getDate() + i);
      let cls = 'day' + (d.getMonth() !== m ? ' muted' : '');
      const t = dayMs(d);
      const a = start ? dayMs(start) : 0;
      const b = end ? dayMs(end) : 0;
      if (same(d, start) || same(d, end)) cls += ' sel';
      else if (start && end && t > Math.min(a, b) && t < Math.max(a, b)) cls += ' range';
      cells.push(
        <button key={`d-${y}-${m}-${i}`} className={cls} onClick={() => pickDate(d)}>
          {d.getDate()}
        </button>,
      );
    }
    return cells;
  }

  const nextMonthBase = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  let rangeText = '已选择：--';
  if (start && end) rangeText = `已选择：${fmt(start)} 至 ${fmt(end)}`;
  else if (start) rangeText = `已选择：${fmt(start)}`;

  const trendKpi = trendMetric ? kpiItems.find((k) => k.metric === trendMetric) : undefined;

  return (
    <>
      <div className="dash-toolbar">
        <div className="timebar" ref={timebarRef}>
            <span className="label">统计时间</span>
            <span className="date">{dateText}</span>
            <button className={`tb mode ${mode === 'realtime' ? 'active' : ''}`} onClick={() => onMode('realtime')}>
              实时
            </button>
            <button className={`tb mode ${mode === '7' ? 'active' : ''}`} onClick={() => onMode('7')}>
              7天
            </button>
            <button className={`tb mode ${mode === '30' ? 'active' : ''}`} onClick={() => onMode('30')}>
              30天
            </button>
            <button className={`tb gran ${gran === 'd' ? 'active' : ''}`} onClick={() => setGran('d')}>
              日
            </button>
            <button className={`tb gran ${gran === 'w' ? 'active' : ''}`} onClick={() => setGran('w')}>
              周
            </button>
            <button className={`tb gran ${gran === 'm' ? 'active' : ''}`} onClick={() => setGran('m')}>
              月
            </button>
            <button
              className="tb"
              onClick={() => setCalOpen((v) => !v)}
            >
              自定义ⓘ
            </button>
            <button className="tb" onClick={onPrevDay}>
              ‹
            </button>
            <button className="tb" onClick={onNextDay}>
              ›
            </button>
            <div className={`calendar ${calOpen ? 'show' : ''}`}>
              <div className="calendar-panels">
                <div className="cal-panel">
                  <div className="chead">
                    <div>
                      <button
                        className="cnav"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCursor((c) => new Date(c.getFullYear() - 1, c.getMonth(), 1));
                        }}
                      >
                        «
                      </button>
                      <button
                        className="cnav"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
                        }}
                      >
                        ‹
                      </button>
                    </div>
                    <div className="ctitle">
                      <span>{cursor.getFullYear()}年</span>
                      <span>{cursor.getMonth() + 1}月</span>
                    </div>
                    <div></div>
                  </div>
                  <div className="week">
                    <span>一</span>
                    <span>二</span>
                    <span>三</span>
                    <span>四</span>
                    <span>五</span>
                    <span>六</span>
                    <span>日</span>
                  </div>
                  <div className="days">{renderDays(cursor)}</div>
                </div>
                <div className="cal-panel">
                  <div className="chead">
                    <div></div>
                    <div className="ctitle">
                      <span>{nextMonthBase.getFullYear()}年</span>
                      <span>{nextMonthBase.getMonth() + 1}月</span>
                    </div>
                    <div>
                      <button
                        className="cnav"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
                        }}
                      >
                        ›
                      </button>
                      <button
                        className="cnav"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCursor((c) => new Date(c.getFullYear() + 1, c.getMonth(), 1));
                        }}
                      >
                        »
                      </button>
                    </div>
                  </div>
                  <div className="week">
                    <span>一</span>
                    <span>二</span>
                    <span>三</span>
                    <span>四</span>
                    <span>五</span>
                    <span>六</span>
                    <span>日</span>
                  </div>
                  <div className="days">{renderDays(nextMonthBase)}</div>
                </div>
              </div>
              <div className="cnote">* 最少选择 1 天 最多选择 31 天</div>
              <div className="cfoot">
                <div className="rangeText">{rangeText}</div>
                <div>
                  <button
                    className="smallBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStart(null);
                      setEnd(null);
                    }}
                  >
                    清除
                  </button>{' '}
                  <button
                    className="smallBtn primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApply();
                    }}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
        </div>
        <button className="refresh">刷新数据</button>
        <div className="metric-wrap" ref={metricWrapRef}>
          <button
            className="metric-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setMetricOpen((v) => !v);
            }}
          >
            指标选择 ▾
          </button>
          <div className={`metric-dropdown ${metricOpen ? 'show' : ''}`}>
            <div className="metrics">
              <span className="mtitle">指标选择</span>
              {metricNames.map((name) => (
                <button
                  key={name}
                  className={`chip ${selectedMetrics.includes(name) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMetric(name);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <BubbleSelect
            className="platformSelect"
            defaultValue="视图模式"
            onChange={(v) => {
              if (v && v !== '视图模式') {
                console.log('已切换视图模式：' + v);
              }
            }}
            options={['视图模式', '列表模式']}
          />
        </div>
        <div>
          <BubbleSelect
            className="platformSelect"
            defaultValue="平台"
            onChange={(v) => {
              if (v && v !== '平台') {
                console.log('已切换平台：' + v);
              }
            }}
            options={['平台', '全部', '淘宝C店', '视频号']}
          />
        </div>
        <div className="profit-filter" ref={profitRef}>
          <button
            className="profit-btn"
            onClick={(e) => {
              e.stopPropagation();
              setProfitOpen((v) => !v);
            }}
          >
            {profitText ? `利润分析：${profitText} ▾` : '利润分析 ▾'}
          </button>
          <div className={`profit-menu ${profitOpen ? 'show' : ''}`}>
            {profitOptions.map((opt) => (
              <div
                key={opt.key}
                className={`profit-option ${profitFilter === opt.key ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  pickProfit(opt.key, opt.text);
                }}
              >
                {opt.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="kpis">
        {kpiItems.map((kpi) => (
          <div
            key={kpi.metric}
            className={`card kpi ${selectedMetrics.includes(kpi.metric) ? '' : 'hidden'}`}
            onClick={() => setTrendMetric(kpi.metric)}
          >
            <div className="klabel">{kpi.metric}</div>
            <div className="kval">{kpi.value}</div>
            {kpi.foot.map((seg, i) => (
              <div key={i} className={`kfoot ${seg.cls ?? ''}`}>
                {seg.lines.map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {line}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="dashboard-lists">
        <div className="list-card">
          <div className="list-head">
            <div>
              <h3>亏损商品</h3>
              <div className="sub">仅展示利润异常商品，便于快速排查和处理</div>
            </div>
          </div>
          <table className="list-table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>序号</th>
                <th>商品信息</th>
                <th>店铺</th>
                <th>平台</th>
                <th>销售金额</th>
                <th>新毛六利润</th>
                <th>新毛六利润率</th>
                <th>核心问题</th>
                <th>状态</th>
                <th style={{ width: 90 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {lossRows.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="item-info">
                    <div className="item-title">{row.title}</div>
                    <div className="item-meta">
                      {row.meta[0]}
                      <br />
                      {row.meta[1]}
                    </div>
                  </td>
                  <td>{row.store}</td>
                  <td>{row.platform}</td>
                  <td>{row.amount}</td>
                  <td>
                    <span className="badge-red">{row.profit}</span>
                  </td>
                  <td>
                    <span className="badge-red">{row.rate}</span>
                  </td>
                  <td>{row.problem}</td>
                  <td>
                    <span className={row.statusCls}>{row.status}</span>
                  </td>
                  <td>
                    <a className="action-link" href="javascript:void(0)">
                      查看
                    </a>
                    <a className="action-link" href="javascript:void(0)">
                      处理
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="list-card">
          <div className="list-head">
            <div>
              <h3>缺货商品</h3>
              <div className="sub">仅展示库存紧张或已缺货商品，便于补货跟进</div>
            </div>
          </div>
          <table className="list-table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>序号</th>
                <th>商品信息</th>
                <th>店铺</th>
                <th>平台</th>
                <th>昨日销量</th>
                <th>近7日销量</th>
                <th>库存数</th>
                <th>风险说明</th>
                <th>状态</th>
                <th style={{ width: 90 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((row, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="item-info">
                    <div className="item-title">{row.title}</div>
                    <div className="item-meta">
                      {row.meta[0]}
                      <br />
                      {row.meta[1]}
                    </div>
                  </td>
                  <td>{row.store}</td>
                  <td>{row.platform}</td>
                  <td>{row.yesterday}</td>
                  <td>{row.week7}</td>
                  <td>
                    <span className={row.stockCls}>{row.stock}</span>
                  </td>
                  <td>{row.risk}</td>
                  <td>
                    <span className={row.statusCls}>{row.status}</span>
                  </td>
                  <td>
                    <a className="action-link" href="javascript:void(0)">
                      查看
                    </a>
                    <a className="action-link" href="javascript:void(0)">
                      补货
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {trendMetric && trendKpi && (
        <TrendModal
          metric={trendMetric}
          kpiValueText={trendKpi.value}
          dateText={dateText}
          mode={mode}
          onClose={() => setTrendMetric(null)}
        />
      )}
    </>
  );
}
