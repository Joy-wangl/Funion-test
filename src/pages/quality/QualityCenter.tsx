/* =========================================================
   品控中心 v3
   1. 问题类型看板：数据总览 · 问题类型占比 · 问题趋势（今日/近7天/自定义）
   2. 系列编码列表：复刻品控管理系列维度 · 展开各平台数据 · 命中问题类型列
   ========================================================= */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  QC_CENTER_SERIES,
  QC_PLATFORMS,
  QC_PROBLEM_TYPES,
  PROBLEM_TYPE_COLOR,
  RANGE_LABELS,
  DEFAULT_CUSTOM_RANGE,
  DEPT_COLOR,
  QC_DEPTS,
  applySeriesView,
  defaultDutyDept,
  deptsOfTypes,
  DATE_AXIS,
  windowOf,
  junkStatusOf,
  markedJunkCount,
  metricTrend,
  orderTrendData,
  pct,
  platformProblemHits,
  problemTrendData,
  problemTypeRanking,
  rangeDeptCounts,
  rangeEventTotals,
  rangeTypeCounts,
  rateCls,
  topProblemCodes,
  totalCodes,
  TREND_RANGE_LABELS,
  type DateRange,
  type MetricKey,
  type QcCenterCode,
  type QcCenterSeries,
  type RangeKey,
  type ScopeTotals,
  type TrendRangeKey,
} from './qcCenterData';
import { ProblemTrendChart, PieChart, MetricTrendChart } from './qcCenterCharts';
import { ChatFullModal, PlatLogo, PlatformMatrix, SessionCard, StatusTag, TypeBars } from './qcParts';
import OptTaskView from './qcOptPage';
import { OPT_STATUS_LABELS, OPT_PROBLEMS, OPT_DEMANDS, OPT_GROUPS, OPT_PICKERS, QC_OPT_TASKS, type OptTask, type OptStatus, type StatusTab } from './qcOptData';
import MoreActions from '../../components/MoreActions';
import { AFTER_SALES_ORDERS, CHAT_SESSIONS, SHOP_NAME, type ChatHit, type ChatSession, type Platform, type PlatformStat } from './data';
import { IconArrow, IconX, Modal, ToastWrap, useToasts } from '../permission/shared';
import BubbleSelect from '../../components/BubbleSelect';
import './style.css';
import './qcCenter.css';

type View = 'dashboard' | 'series' | 'opt';
type SortKey = 'orders' | 'refundRate' | 'afterSales' | 'chatRiskHits';

/** 系列编码列表筛选条件（草稿/生效分离，与任务中心等模块交互一致） */
type SeriesFilter = { q: string; platform: string; type: string; dept: string; duty: string; range: RangeKey; custom: DateRange };
const DEFAULT_SERIES_FILTER: SeriesFilter = { q: '', platform: '全部平台', type: '全部类型', dept: '全部部门', duty: '全部部门', range: 'custom', custom: DEFAULT_CUSTOM_RANGE };

export default function QualityCenter({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const [view, setView] = useState<View>('dashboard');
  const [sortKey, setSortKey] = useState<SortKey>('orders');
  const [sortDesc, setSortDesc] = useState(true);
  const [detail, setDetail] = useState<{ series: QcCenterSeries; code?: string } | null>(null);
  const [chatCtx, setChatCtx] = useState<{ codes: QcCenterCode[]; platforms: Platform[]; platform: Platform } | null>(null);
  /** 趋势图弹层上下文：系列维度 / 平台维度（数据口径不同，交互一致） */
  const [trendCtx, setTrendCtx] = useState<{ title: string; totals: ScopeTotals; seriesCode: string } | null>(null);
  /** 优化任务数据与状态 tab（概览点击可跳转列表对应状态） */
  const [optTasks, setOptTasks] = useState<OptTask[]>(QC_OPT_TASKS);
  const [optStatusTab, setOptStatusTab] = useState<StatusTab>('all');
  /** 创建优化任务弹层上下文（监控列表操作列 / 详情抽屉入口） */
  const [createCtx, setCreateCtx] = useState<QcCenterSeries | null>(null);
  /** 聊天会话（上提：全屏弹窗修改命中类型后卡片 / 统计同步闭环） */
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(CHAT_SESSIONS);
  const updateSessionHits = (id: string, hits: ChatHit[]) => setChatSessions((prev) => prev.map((x) => (x.id === id ? { ...x, hits } : x)));
  const { toasts, pushToast } = useToasts();
  const [draft, setDraft] = useState<SeriesFilter>(DEFAULT_SERIES_FILTER);
  const [applied, setApplied] = useState<SeriesFilter>(DEFAULT_SERIES_FILTER);
  /** 责任部门绑定（全局式，持久化）：系列编码 → 部门；未绑定回退默认责任部门 */
  const [dutyMap, setDutyMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('funion:dutyDepts') || '{}'); } catch { return {}; }
  });
  const changeDuty = (code: string, dept: string | null) => setDutyMap((m) => {
    const next = { ...m };
    if (dept === null) delete next[code];
    else next[code] = dept;
    localStorage.setItem('funion:dutyDepts', JSON.stringify(next));
    return next;
  });

  const patchDraft = (patch: Partial<SeriesFilter>) => setDraft((d) => ({ ...d, ...patch }));

  /** 创建优化任务：仅采集问题点/需求/凭证，写入优化任务列表（待认领），监控列表关联数同步 */
  const submitCreateOpt = (form: { problem: string; demand: string; evidence: string[] }) => {
    if (!createCtx) return;
    const series = createCtx;
    setOptTasks((prev) => {
      const nextId = prev.reduce((m, t) => {
        const n = parseInt(t.id.replace('OT-', ''), 10);
        return Number.isFinite(n) ? Math.max(m, n) : m;
      }, 1000) + 1;
      const d = new Date();
      const p = (x: number) => String(x).padStart(2, '0');
      const task: OptTask = {
        id: `OT-${nextId}`,
        createdAt: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
        seriesCode: series.seriesCode,
        seriesName: series.name,
        status: 'pendingClaim',
        optType: form.problem,
        optDirection: form.demand,
        optLevel: 'P1',
        picker: OPT_PICKERS[0],
        orders30d: series.orders,
        gross30d: Math.round(series.orders * 0.52),
        refundRate: series.refundRate,
        group: OPT_GROUPS[0],
        assignStatus: '待处理',
        evidence: form.evidence,
      };
      return [task, ...prev];
    });
    setCreateCtx(null);
    pushToast('已创建优化任务，可在「优化任务」列表查看');
  };

  const viewSeries = useMemo(() => QC_CENTER_SERIES
    .map((s) => applySeriesView(s, {
      platform: applied.platform === '全部平台' ? null : (applied.platform as Platform),
      range: applied.range,
      custom: applied.custom,
      problemType: applied.type === '全部类型' ? null : applied.type,
    }))
    .filter((x): x is QcCenterSeries => x !== null), [applied]);

  const filtered = useMemo(() => {
    let list = viewSeries;
    if (applied.dept !== '全部部门') {
      list = list.filter((s) => deptsOfTypes(s.problemHits.map((h) => h.type)).includes(applied.dept));
    }
    if (applied.duty !== '全部部门') {
      list = list.filter((s) => (dutyMap[s.seriesCode] ?? defaultDutyDept(s)) === applied.duty);
    }
    const kw = applied.q.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (s) => s.seriesCode.toLowerCase().includes(kw)
        || s.name.toLowerCase().includes(kw)
        || s.codes.some((c) => c.code.toLowerCase().includes(kw) || c.name.toLowerCase().includes(kw))
        || s.platforms.some((p) => p.includes(applied.q.trim()) || SHOP_NAME[p].toLowerCase().includes(kw)),
    );
  }, [applied, viewSeries, dutyMap]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDesc ? -diff : diff;
  }), [filtered, sortKey, sortDesc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc((v) => !v);
    else { setSortKey(key); setSortDesc(true); }
  };

  return (
    <div className="pm-page qc-page qc-center-page">
      <aside className={`qc-side ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="qc-side-brand">
          品控中心
          <span>问题类型驱动 · 系列编码追踪</span>
        </div>
        <div
          className={`qc-nav ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setView('dashboard'); setDraft((d) => ({ ...d, q: '' })); }}
        >
          <span className="qc-nav-ico">▦</span>
          <span className="qc-nav-text">数据概览</span>
        </div>
        <div
          className={`qc-nav ${view === 'series' ? 'active' : ''}`}
          onClick={() => { setView('series'); setDraft((d) => ({ ...d, q: '' })); }}
        >
          <span className="qc-nav-ico">▤</span>
          <span className="qc-nav-text">监控列表</span>
        </div>
        <div
          className={`qc-nav ${view === 'opt' ? 'active' : ''}`}
          onClick={() => setView('opt')}
        >
          <span className="qc-nav-ico">⚑</span>
          <span className="qc-nav-text">优化任务</span>
        </div>
      </aside>

      <div className="qc-main">
        {view === 'dashboard' ? (
          <ProblemTypeDashboard
            optTasks={optTasks}
            onOpenOptStatus={(s) => { setOptStatusTab(s); setView('opt'); }}
            onPickType={(t) => {
              setDraft((d) => ({ ...d, type: t }));
              setApplied((a) => ({ ...a, type: t }));
              setView('series');
            }}
            onOpenCode={(seriesCode, code) => {
              const s = QC_CENTER_SERIES.find((x) => x.seriesCode === seriesCode);
              if (s) setDetail({ series: s, code });
            }}
          />
        ) : view === 'series' ? (
          <SeriesListView
            series={sorted}
            sortKey={sortKey}
            sortDesc={sortDesc}
            onToggleSort={toggleSort}
            draft={draft}
            onDraft={patchDraft}
            onQuery={() => setApplied(draft)}
            onReset={() => { setDraft(DEFAULT_SERIES_FILTER); setApplied(DEFAULT_SERIES_FILTER); }}
            onDetail={(s) => setDetail({ series: s })}
            onChat={(codes, platforms, platform) => setChatCtx({ codes, platforms, platform })}
            onTrend={(s) => setTrendCtx({
              title: `系列 ${s.seriesCode} · ${s.name}`,
              totals: { orders: s.orders, refundRate: s.refundRate, afterSales: s.afterSales, chatRisks: s.chatRiskHits },
              seriesCode: s.seriesCode,
            })}
            onTrendStat={(st, label, seriesCode) => setTrendCtx({
              title: `${label} · ${st.platform}`,
              totals: { orders: st.orders, refundRate: st.refundRate, afterSales: st.afterSales, chatRisks: st.chatRisks },
              seriesCode,
            })}
            dutyMap={dutyMap}
            onDuty={changeDuty}
            optTasks={optTasks}
            onCreateOpt={(s) => setCreateCtx(s)}
          />
        ) : (
          <OptTaskView
            tasks={optTasks}
            setTasks={setOptTasks}
            statusTab={optStatusTab}
            setStatusTab={setOptStatusTab}
          />
        )}
      </div>

      {detail && (
        <SeriesDetailDrawer
          key={`${detail.series.seriesCode}-${detail.code ?? 'all'}`}
          series={detail.series}
          initialCode={detail.code}
          optTasks={optTasks.filter((t) => t.seriesCode === detail.series.seriesCode)}
          onCreateOpt={() => setCreateCtx(detail.series)}
          onClose={() => setDetail(null)}
          allSessions={chatSessions}
          onUpdateHits={updateSessionHits}
        />
      )}
      {chatCtx && (
        <PlatformChatModal
          codes={chatCtx.codes}
          platforms={chatCtx.platforms}
          initialPlatform={chatCtx.platform}
          sessions={chatSessions}
          onUpdateHits={updateSessionHits}
          onClose={() => setChatCtx(null)}
        />
      )}
      {trendCtx && (
        <MetricTrendModal
          title={trendCtx.title}
          totals={trendCtx.totals}
          optTasks={optTasks.filter((t) => t.seriesCode === trendCtx.seriesCode)}
          onClose={() => setTrendCtx(null)}
        />
      )}
      {createCtx && (
        <CreateOptTaskModal
          series={createCtx}
          onClose={() => setCreateCtx(null)}
          onSubmit={submitCreateOpt}
        />
      )}
      <ToastWrap toasts={toasts} />
    </div>
  );
}

/* ---------- 自定义日期区间：点击触发器弹出日期组件（看板与筛选表单共用） ---------- */
function DateRangePicker({ custom, onChange }: { custom: DateRange; onChange: (d: DateRange) => void }) {
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
  return (
    <div className="qc-date-picker" ref={boxRef}>
      <button type="button" className="qc-date-trigger" onClick={() => setOpen((o) => !o)}>
        {custom.start}
        <span>→</span>
        {custom.end}
      </button>
      {open && (
        <div className="qc-date-pop qc-date-range">
          <input
            type="date"
            className="sg-input"
            value={custom.start}
            min={DEFAULT_CUSTOM_RANGE.start}
            max={DEFAULT_CUSTOM_RANGE.end}
            onChange={(e) => onChange({ ...custom, start: e.target.value })}
          />
          <span>→</span>
          <input
            type="date"
            className="sg-input"
            value={custom.end}
            min={DEFAULT_CUSTOM_RANGE.start}
            max={DEFAULT_CUSTOM_RANGE.end}
            onChange={(e) => onChange({ ...custom, end: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- 时间范围切换（自定义=点击触发器弹出日期组件选择区间） ---------- */
function RangeToggle({ value, custom, onChange, onCustom }: {
  value: RangeKey;
  custom: DateRange;
  onChange: (r: RangeKey) => void;
  onCustom: (d: DateRange) => void;
}) {
  return (
    <div className="qc-range-wrap">
      <div className="qc-range-toggle">
        {RANGE_LABELS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={value === r.key ? 'active' : ''}
            onClick={() => onChange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>
      {value === 'custom' && <DateRangePicker custom={custom} onChange={onCustom} />}
    </div>
  );
}

/* ---------- 区块标题 + 时间范围 ---------- */
function SectionHead({ title, range, custom, onRange, onCustom }: {
  title: string;
  range: RangeKey;
  custom: DateRange;
  onRange: (r: RangeKey) => void;
  onCustom: (d: DateRange) => void;
}) {
  return (
    <div className="qc-sec-head">
      <div className="qc-sec-title">{title}</div>
      <RangeToggle value={range} custom={custom} onChange={onRange} onCustom={onCustom} />
    </div>
  );
}

/* ---------- 问题类型看板 ---------- */
function ProblemTypeDashboard({ optTasks, onOpenOptStatus, onOpenCode, onPickType }: {
  optTasks: OptTask[];
  onOpenOptStatus: (s: OptStatus) => void;
  onOpenCode: (seriesCode: string, code: string) => void;
  onPickType: (type: string) => void;
}) {
  const [rangeOv, setRangeOv] = useState<RangeKey>('custom');
  const [rangeShare, setRangeShare] = useState<RangeKey>('custom');
  const [rangeTrend, setRangeTrend] = useState<RangeKey>('custom');
  const [rangeOpt, setRangeOpt] = useState<RangeKey>('custom');
  const [customOv, setCustomOv] = useState<DateRange>(DEFAULT_CUSTOM_RANGE);
  const [customShare, setCustomShare] = useState<DateRange>(DEFAULT_CUSTOM_RANGE);
  const [customTrend, setCustomTrend] = useState<DateRange>(DEFAULT_CUSTOM_RANGE);
  const [customOpt, setCustomOpt] = useState<DateRange>(DEFAULT_CUSTOM_RANGE);

  const ranking = useMemo(() => problemTypeRanking(), []);
  const [topKey, setTopKey] = useState<'refundRate' | 'chatRate'>('refundRate');
  const top = useMemo(() => topProblemCodes(5, topKey), [topKey]);
  const ovTotals = useMemo(() => rangeEventTotals(rangeOv, customOv), [rangeOv, customOv]);
  const shareCounts = useMemo(() => rangeTypeCounts(rangeShare, customShare), [rangeShare, customShare]);
  const shareTotals = useMemo(() => rangeEventTotals(rangeShare, customShare), [rangeShare, customShare]);
  const deptCounts = useMemo(() => rangeDeptCounts(rangeShare, customShare), [rangeShare, customShare]);
  const trend = useMemo(() => problemTrendData(rangeTrend, customTrend), [rangeTrend, customTrend]);
  const trendOrders = useMemo(() => orderTrendData(rangeTrend, customTrend), [rangeTrend, customTrend]);

  const shareItems = ranking.map((r) => ({
    label: r.type,
    value: shareCounts[r.type] ?? 0,
    color: PROBLEM_TYPE_COLOR[r.type] || '#4f7cff',
  }));
  const deptItems = QC_DEPTS.map((d) => ({
    label: d,
    value: deptCounts[d] ?? 0,
    color: DEPT_COLOR[d] || '#4f7cff',
  }));
  const deptTotal = deptItems.reduce((s, i) => s + i.value, 0);
  const shareTotal = shareItems.reduce((s, i) => s + i.value, 0);
  const trendSeries = trend.series.map((s) => ({ ...s, color: PROBLEM_TYPE_COLOR[s.type] || '#4f7cff' }));

  /* 优化数据概览：周期内各状态任务分布，点击跳转优化任务列表对应状态 */
  const optWin = useMemo(() => windowOf(rangeOpt, customOpt), [rangeOpt, customOpt]);
  const optInWin = useMemo(() => optTasks.filter((t) => {
    const day = t.createdAt.slice(0, 10);
    return day >= DATE_AXIS[optWin[0]] && day <= DATE_AXIS[optWin[1]];
  }), [optTasks, optWin]);
  const optItems = OPT_STATUS_LABELS.map((s) => ({
    ...s,
    value: optInWin.filter((t) => t.status === s.key).length,
  }));
  const optTotal = optInWin.length;

  return (
    <>
      {/* 数据总览 + 问题类型占比：共用一块白色面板 */}
      <div className="qc-ov-panel">
        <SectionHead title="数据总览" range={rangeOv} custom={customOv} onRange={setRangeOv} onCustom={setCustomOv} />
        <div className="qc-flat-grid cols-4">
          <div className="flat-card">
            <div className="k">监控系列编码数</div>
            <div className="v">{totalCodes()}</div>
          </div>
          <div className="flat-card" title="风险占比 = 风险品数量 ÷ 监控系列编码数">
            <div className="k">风险品数量</div>
            <div className="v">
              {markedJunkCount()}
              <span className="dept-pct">{`${((markedJunkCount() / totalCodes()) * 100).toFixed(1)}%`}</span>
            </div>
          </div>
          <div className="flat-card">
            <div className="k">监控编码订单量</div>
            <div className="v">{ovTotals.orders.toLocaleString()}</div>
          </div>
          <div className="flat-card" title="聊天风险率 = 聊天问题命中次数 ÷ 周期订单量">
            <div className="k">聊天问题命中次数</div>
            <div className="v">
              {ovTotals.chatHits}
              <span className="dept-pct">{ovTotals.orders ? `${((ovTotals.chatHits / ovTotals.orders) * 100).toFixed(1)}%` : '0.0%'}</span>
            </div>
          </div>
        </div>
        <div className="qc-ov-divider" />
        <SectionHead title="问题类型占比" range={rangeShare} custom={customShare} onRange={setRangeShare} onCustom={setCustomShare} />
        <div className="qc-share-row">
          <div className="qc-flat-grid cols-3 qc-share-cards">
            {shareItems.map((i) => (
              <div
                className="flat-card type-card"
                key={i.label}
                title={`查看「${i.label}」相关系列编码`}
                onClick={() => onPickType(i.label)}
              >
                <div className="k"><i className="type-dot" style={{ background: i.color }} />{i.label}</div>
                <div className="v">
                  {i.value}
                  <span className="dept-pct">{shareTotal ? `${((i.value / shareTotal) * 100).toFixed(1)}%` : '0.0%'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="qc-share-pie">
            <PieChart items={shareItems} totalOrders={shareTotals.orders} />
          </div>
        </div>
        <div className="qc-ov-divider" />
        <div className="qc-sec-head"><div className="qc-sec-title">问题涉及部门占比</div></div>
        <div className="qc-flat-grid cols-6">
          {deptItems.map((i) => (
            <div className="flat-card dept-card" key={i.label}>
              <div className="k"><i className="type-dot" style={{ background: i.color }} />{i.label}</div>
              <div className="v">
                {i.value}
                <span className="dept-pct">{deptTotal ? `${((i.value / deptTotal) * 100).toFixed(1)}%` : '0.0%'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 优化数据概览：独立白底模块，卡片点击跳转优化任务列表对应状态 */}
      <div className="qc-ov-panel">
        <SectionHead title="优化数据概览" range={rangeOpt} custom={customOpt} onRange={setRangeOpt} onCustom={setCustomOpt} />
        <div className="qc-flat-grid cols-6">
          {optItems.map((i) => (
            <div
              className="flat-card dept-card opt-ov-card"
              key={i.key}
              title={`查看「${i.label}」状态任务`}
              onClick={() => onOpenOptStatus(i.key)}
            >
              <div className="k"><i className="type-dot" style={{ background: i.color }} />{i.label}</div>
              <div className="v">
                {i.value}
                <span className="dept-pct">{optTotal ? `${((i.value / optTotal) * 100).toFixed(1)}%` : '0.0%'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 问题趋势与 TOP 问题商品：整体置入白底模块，与上方模块一致 */}
      <div className="qc-ov-panel qc-trend-ov">
        <SectionHead title="问题趋势与 TOP 问题商品" range={rangeTrend} custom={customTrend} onRange={setRangeTrend} onCustom={setCustomTrend} />
        <div className="qc-trend-row">
          <div className="qc-trend-panel">
            <ProblemTrendChart labels={trend.labels} series={trendSeries} orders={trendOrders.points} />
          </div>
          <div className="qc-panel">
            <div className="p-title top-head">TOP 问题商品
              <div className="qc-range-toggle">
                <button type="button" className={topKey === 'refundRate' ? 'active' : ''} onClick={() => setTopKey('refundRate')}>按退款率</button>
                <button type="button" className={topKey === 'chatRate' ? 'active' : ''} onClick={() => setTopKey('chatRate')}>按聊天风险率</button>
              </div>
            </div>
            {top.map((v, i) => (
              <div className="top-row" key={v.code.code} onClick={() => onOpenCode(v.seriesCode, v.code.code)}>
                <span className={`top-rank ${i < 3 ? 'hot' : ''}`}>{i + 1}</span>
                <div className="top-info">
                  <div className="n">{v.code.code}</div>
                  <div className="m">{v.code.name}</div>
                </div>
                {topKey === 'refundRate'
                  ? <span className={`rate ${rateCls(v.refundRate)}`}>{pct(v.refundRate)}</span>
                  : <span className={`rate ${v.chatRate > 0 ? 'bad' : ''}`}>{pct(v.chatRate)}</span>}
                <StatusTag status={junkStatusOf(v.refundRate)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 排序图标：统一双箭头 SVG，激活方向主色高亮 ---------- */
function SortIcon({ state }: { state: 'none' | 'desc' | 'asc' }) {
  return (
    <svg className="sort-ico" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
      <path d="M6 1.2l3.4 4H2.6l3.4-4z" fill={state === 'asc' ? 'var(--primary)' : '#c3c9d4'} />
      <path d="M6 12.8l-3.4-4h6.8l-3.4 4z" fill={state === 'desc' ? 'var(--primary)' : '#c3c9d4'} />
    </svg>
  );
}

/* ---------- 系列编码列表 ---------- */
function SeriesListView({ series, sortKey, sortDesc, onToggleSort, draft, onDraft, onQuery, onReset, onDetail, onChat, onTrend, onTrendStat, dutyMap, onDuty, optTasks, onCreateOpt }: {
  series: QcCenterSeries[];
  sortKey: SortKey;
  sortDesc: boolean;
  onToggleSort: (key: SortKey) => void;
  draft: SeriesFilter;
  onDraft: (patch: Partial<SeriesFilter>) => void;
  onQuery: () => void;
  onReset: () => void;
  onDetail: (s: QcCenterSeries) => void;
  onChat: (codes: QcCenterCode[], platforms: Platform[], platform: Platform) => void;
  onTrend: (s: QcCenterSeries) => void;
  onTrendStat: (stat: PlatformStat, label: string, seriesCode: string) => void;
  dutyMap: Record<string, string>;
  onDuty: (code: string, dept: string | null) => void;
  optTasks: OptTask[];
  onCreateOpt: (s: QcCenterSeries) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const sortState = (key: SortKey): 'none' | 'desc' | 'asc' =>
    sortKey !== key ? 'none' : sortDesc ? 'desc' : 'asc';

  const SortableTh = ({ k, children, align = 'left' }: { k: SortKey; children: ReactNode; align?: 'left' | 'right' }) => (
    <th
      onClick={() => onToggleSort(k)}
      style={{ cursor: 'pointer', userSelect: 'none', textAlign: align }}
      title="点击排序"
    >
      <span className="th-sort">
        {children}
        <SortIcon state={sortState(k)} />
      </span>
    </th>
  );

  return (
    <>
      <div className="qc-head">
        <div className="qc-title">
          监控列表
          <span className="qc-desc">共 {series.length} 个系列 · 展开查看各平台数据与下属商品编码</span>
        </div>
      </div>
      <div className="sg-filter">
        <div className="sg-grid">
          <div className="sg-field">
            <label>搜索</label>
            <input
              className="sg-input"
              placeholder="请输入店铺 / 系列编码 / 商品编码"
              value={draft.q}
              onChange={(e) => onDraft({ q: e.target.value })}
            />
          </div>
          <div className="sg-field">
            <label>平台</label>
            <BubbleSelect className="sg-select" value={draft.platform} onChange={(v) => onDraft({ platform: v })} options={['全部平台', ...QC_PLATFORMS]} />
          </div>
          <div className="sg-field">
            <label>问题类型</label>
            <BubbleSelect className="sg-select" value={draft.type} onChange={(v) => onDraft({ type: v })} options={['全部类型', ...QC_PROBLEM_TYPES]} />
          </div>
          <div className="sg-field">
            <label>问题涉及部门</label>
            <BubbleSelect className="sg-select" value={draft.dept} onChange={(v) => onDraft({ dept: v })} options={['全部部门', ...QC_DEPTS]} />
          </div>
          <div className="sg-field">
            <label>责任部门</label>
            <BubbleSelect className="sg-select" value={draft.duty} onChange={(v) => onDraft({ duty: v })} options={['全部部门', ...QC_DEPTS]} />
          </div>
          <div className="sg-field">
            <label>时间范围</label>
            <BubbleSelect
              className="sg-select"
              value={RANGE_LABELS.find((r) => r.key === draft.range)?.label ?? '自定义'}
              onChange={(v) => onDraft({ range: RANGE_LABELS.find((r) => r.label === v)?.key ?? 'custom' })}
              options={RANGE_LABELS.map((r) => r.label)}
            />
          </div>
          {draft.range === 'custom' && (
            <div className="sg-field">
              <label>日期区间</label>
              <DateRangePicker custom={draft.custom} onChange={(d) => onDraft({ custom: d })} />
            </div>
          )}
          <div className="sg-field-actions">
            <button className="sg-btn" onClick={onReset}>
              重置
            </button>
            <button className="sg-btn primary" onClick={onQuery}>
              查询
            </button>
          </div>
        </div>
      </div>
      <div className="qc-body">
        <table className="table qc-wide">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>系列编码</th>
              <SortableTh k="orders" align="right">订单量</SortableTh>
              <SortableTh k="refundRate">退款率</SortableTh>
              <SortableTh k="afterSales">售后单</SortableTh>
              <SortableTh k="chatRiskHits">聊天风险</SortableTh>
              <th>聊天风险率</th>
              <th>关联优化任务数</th>
              <th>上架平台</th>
              <th>命中问题类型</th>
              <th>问题涉及部门</th>
              <th>责任部门</th>
              <th style={{ width: 140 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <CenterSeriesRow
                key={s.seriesCode}
                series={s}
                open={expanded.has(s.seriesCode)}
                onToggle={() => toggle(s.seriesCode)}
                onDetail={() => onDetail(s)}
                onChat={(codes, platforms, platform) => onChat(codes, platforms, platform)}
                onTrend={() => onTrend(s)}
                onTrendStat={onTrendStat}
                duty={dutyMap[s.seriesCode] ?? defaultDutyDept(s)}
                hasOverride={!!dutyMap[s.seriesCode]}
                onDuty={onDuty}
                optCount={optTasks.filter((t) => t.seriesCode === s.seriesCode).length}
                onCreateOpt={() => onCreateOpt(s)}
              />
            ))}
            {series.length === 0 && (
              <tr><td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>无匹配系列</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CenterSeriesRow({ series, open, onToggle, onDetail, onChat, onTrend, onTrendStat, duty, hasOverride, onDuty, optCount, onCreateOpt }: {
  series: QcCenterSeries;
  open: boolean;
  onToggle: () => void;
  onDetail: () => void;
  onChat: (codes: QcCenterCode[], platforms: Platform[], platform: Platform) => void;
  onTrend: () => void;
  onTrendStat: (stat: PlatformStat, label: string, seriesCode: string) => void;
  duty: string;
  hasOverride: boolean;
  onDuty: (code: string, dept: string | null) => void;
  optCount: number;
  onCreateOpt: () => void;
}) {
  const [codeTab, setCodeTab] = useState<string>('all');
  const [dutyOpen, setDutyOpen] = useState(false);
  const dutyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dutyOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (dutyRef.current && !dutyRef.current.contains(e.target as Node)) setDutyOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDutyOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [dutyOpen]);
  const selCode = codeTab === 'all' ? null : series.codes.find((c) => c.code === codeTab) ?? null;
  const hits = useMemo(
    () => platformProblemHits(selCode ? [selCode] : series.codes),
    [selCode, series.codes],
  );
  return (
    <>
      <tr>
        <td>
          <span className={`arrow ${open ? 'open' : ''}`} onClick={onToggle} style={{ cursor: 'pointer', display: 'inline-flex' }}><IconArrow /></span>
        </td>
        <td className="col-name">
          <div>{series.seriesCode}</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{series.name}</div>
        </td>
        <td className="td-num-right">{series.orders.toLocaleString()}</td>
        <td><span className={`rate ${rateCls(series.refundRate)}`}>{pct(series.refundRate)}</span></td>
        <td>{series.afterSales}</td>
        <td>{series.chatRiskHits ? <span className="rate bad">{series.chatRiskHits}</span> : 0}</td>
        <td>{series.orders ? pct(series.chatRiskHits / series.orders) : '0.0%'}</td>
        <td>{optCount > 0 ? <span className="opt-cnt">{optCount}</span> : <span style={{ color: 'var(--text-4)' }}>0</span>}</td>
        <td>
          <div className="plat-chips">
            {series.platforms.map((p) => (
              <span key={p} className="plat-chip">
                <PlatLogo platform={p} />
                {p}
              </span>
            ))}
          </div>
        </td>
        <td>
          <div className="prob-tags">
            {series.problemHits.map((h) => (
              <span
                key={h.type}
                className="tag"
                style={{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }}
              >
                {h.type} {h.count}
              </span>
            ))}
          </div>
        </td>
        <td>
          <div className="prob-tags">
            {deptsOfTypes(series.problemHits.map((h) => h.type)).map((d) => (
              <span key={d} className="tag">{d}</span>
            ))}
          </div>
        </td>
        <td>
          <div className="prob-tags">
            <span className="tag duty-tag" title={hasOverride ? '已手动绑定' : '默认责任部门（问题数最多部门）'}>{duty}</span>
          </div>
        </td>
        <td>
          <div className="qc-op-col">
            <a onClick={onDetail}>查看详情</a>
            <a onClick={onTrend}>趋势图</a>
            <MoreActions
              items={[
                { label: '创建优化任务', onClick: onCreateOpt },
                { label: '修改责任部门', onClick: () => setDutyOpen(true) },
              ]}
            />
            <div className="duty-edit" ref={dutyRef}>
              {dutyOpen && (
                <div className="duty-pop">
                  {QC_DEPTS.map((d) => (
                    <span
                      key={d}
                      className={`duty-opt ${d === duty ? 'active' : ''}`}
                      onClick={() => { onDuty(series.seriesCode, d); setDutyOpen(false); }}
                    >
                      {d}
                    </span>
                  ))}
                  {hasOverride && (
                    <span className="duty-opt reset" onClick={() => { onDuty(series.seriesCode, null); setDutyOpen(false); }}>恢复默认</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="expand-row">
          <td colSpan={13}>
            <div className="qc-range-toggle qc-code-tabs">
              <button type="button" className={codeTab === 'all' ? 'active' : ''} onClick={() => setCodeTab('all')}>全部</button>
              {series.codes.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={codeTab === c.code ? 'active' : ''}
                  onClick={() => setCodeTab(c.code)}
                >
                  {c.code}
                </button>
              ))}
            </div>
            <PlatformMatrix
              stats={selCode ? selCode.platforms : series.merged}
              threshold={0.25}
              problemHits={hits}
              showLastOrder={false}
              onChat={(p) => onChat(
                selCode ? [selCode] : series.codes,
                selCode ? selCode.platforms.map((x) => x.platform) : series.platforms,
                p,
              )}
              onTrend={(st) => onTrendStat(st, selCode ? selCode.code : series.seriesCode, series.seriesCode)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------- 平台聊天记录弹窗（按平台 tab 切换） ---------- */
function PlatformChatModal({ codes, platforms, initialPlatform, sessions: allSessions, onUpdateHits, onClose }: {
  codes: QcCenterCode[];
  platforms: Platform[];
  initialPlatform: Platform;
  sessions: ChatSession[];
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
  onClose: () => void;
}) {
  const [plat, setPlat] = useState<Platform>(initialPlatform);
  const [fullId, setFullId] = useState<string | null>(null);
  const sessions = useMemo(() => {
    const codeSet = new Set(codes.map((c) => c.code));
    return allSessions.filter((s) => codeSet.has(s.code));
  }, [allSessions, codes]);
  const tabs = platforms.map((p) => ({ platform: p, count: sessions.filter((s) => s.platform === p).length }));
  const list = sessions.filter((s) => s.platform === plat);
  return (
    <Modal
      title="聊天记录"
      sub={`按平台查看 ${codes.length} 个商品编码的聊天会话`}
      size="lg"
      onClose={onClose}
      foot={<button className="btn" onClick={onClose}>关闭</button>}
    >
      <div className="qc-range-toggle qc-code-tabs" style={{ margin: '0 0 14px' }}>
        {tabs.map((t) => (
          <button
            key={t.platform}
            type="button"
            className={plat === t.platform ? 'active' : ''}
            onClick={() => setPlat(t.platform)}
          >
            {t.platform} {t.count}
          </button>
        ))}
      </div>
      {list.length ? (
        <div className="drawer-sessions">
          {list.map((s) => (
            <SessionCard key={s.id} s={s} orders={AFTER_SALES_ORDERS.filter((o) => o.sessionId === s.id).map((o) => o.id)} onFullScreen={() => setFullId(s.id)} onUpdateHits={onUpdateHits} />
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--text-4)', fontSize: 12 }}>该平台暂无聊天记录</div>
      )}
      {fullId && (
        <ChatFullModal sessions={list} currentId={fullId} onNav={setFullId} onClose={() => setFullId(null)} onUpdateHits={onUpdateHits} />
      )}
    </Modal>
  );
}

/* ---------- 系列编码详情抽屉（无任务/审核维度） ---------- */
function SeriesDetailDrawer({ series, initialCode, onClose, optTasks, onCreateOpt, allSessions, onUpdateHits }: {
  series: QcCenterSeries;
  initialCode?: string;
  onClose: () => void;
  optTasks: OptTask[];
  onCreateOpt: () => void;
  allSessions: ChatSession[];
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
}) {
  const [codeTab, setCodeTab] = useState<string>(initialCode ?? 'all');
  const [chatTab, setChatTab] = useState<string>('all');
  const [fullId, setFullId] = useState<string | null>(null);
  const selCode = codeTab === 'all' ? null : series.codes.find((c) => c.code === codeTab) ?? null;
  const selCodes = selCode ? [selCode] : series.codes;

  const stats = useMemo(() => {
    const orders = selCodes.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.orders, 0), 0);
    const refundWeighted = selCodes.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.refundRate * p.orders, 0), 0);
    const afterSales = selCodes.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.afterSales, 0), 0);
    return { orders, refundRate: orders ? refundWeighted / orders : 0, afterSales };
  }, [selCode, series.codes]);

  const codeSet = useMemo(() => new Set(selCodes.map((c) => c.code)), [selCode, series.codes]);
  const sessions = useMemo(() => allSessions.filter((s) => codeSet.has(s.code)), [allSessions, codeSet]);
  const sessionTabs = useMemo(() => {
    const counts = new Map<string, number>();
    sessions.forEach((s) => counts.set(s.platform, (counts.get(s.platform) ?? 0) + 1));
    return [...counts.entries()];
  }, [sessions]);
  const shownSessions = chatTab === 'all' ? sessions : sessions.filter((s) => s.platform === chatTab);
  const problemHits = selCode ? selCode.problemHits : series.problemHits;
  const hitsTotal = problemHits.reduce((s, h) => s + h.count, 0);
  const hits = useMemo(() => platformProblemHits(selCodes), [selCode, series.codes]);

  return (
    <>
      <div className="drawer-mask" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div className="d-title">系列编码详情</div>
          <span className="x" onClick={onClose}><IconX /></span>
        </div>
        <div className="drawer-body">
          <div className="detail-hero">
            <div className="av">{series.name.slice(0, 1)}</div>
            <div className="info">
              <div className="n">{series.seriesCode} · {series.name}</div>
              <div className="m">{series.codes.length} 个商品编码 · {series.platforms.length} 个平台</div>
            </div>
          </div>

          <div className="qc-range-toggle qc-code-tabs">
            <button type="button" className={codeTab === 'all' ? 'active' : ''} onClick={() => { setCodeTab('all'); setChatTab('all'); }}>全部</button>
            {series.codes.map((c) => (
              <button
                key={c.code}
                type="button"
                className={codeTab === c.code ? 'active' : ''}
                onClick={() => { setCodeTab(c.code); setChatTab('all'); }}
              >
                {c.code}
              </button>
            ))}
          </div>

          <div className="section-title">核心指标（近30天）</div>
          <div className="desc-list">
            <div className="row"><span className="k">订单量</span><span className="v">{stats.orders.toLocaleString()}</span></div>
            <div className="row"><span className="k">综合退款率</span><span className="v"><span className={`rate ${rateCls(stats.refundRate)}`}>{pct(stats.refundRate)}</span></span></div>
            <div className="row"><span className="k">售后单</span><span className="v">{stats.afterSales} 单</span></div>
            <div className="row"><span className="k">聊天会话</span><span className="v">{sessions.length} 个 · 命中 {sessions.filter((s) => s.hits.length).length} 个</span></div>
          </div>

          <div className="section-title">问题类型命中</div>
          {problemHits.length ? (
            <TypeBars
              types={problemHits.map((h) => [h.type, h.count] as [string, number])}
              total={hitsTotal}
            />
          ) : (
            <div style={{ color: 'var(--text-4)', fontSize: 12 }}>暂无问题命中</div>
          )}

          <div className="section-title">关联优化任务（{optTasks.length}）</div>
          {optTasks.length ? (
            <div className="qc-opt-mini">
              {optTasks.map((t) => {
                const meta = OPT_STATUS_LABELS.find((x) => x.key === t.status)!;
                return (
                  <div className="qc-opt-mini-item" key={t.id}>
                    <span className="tid">{t.id}</span>
                    <span className="tag" style={{ background: `${meta.color}1a`, color: meta.color }}>{meta.label}</span>
                    <span>{t.optLevel}</span>
                    <span className="tag" style={{ background: `${PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff' }}>{t.optType}</span>
                    <span>{t.optDirection}</span>
                    <span className="who">{t.assignStatus === '已分配' ? `${t.assignee ?? ''} · ${t.group}` : t.group}</span>
                    <span className="at">{t.createdAt}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-4)', fontSize: 12 }}>暂无关联优化任务，可点击底部操作栏「创建优化任务」发起</div>
          )}

          <div className="section-title">聊天记录核查（命中短语高亮）</div>
          {sessions.length ? (
            <>
              <div className="qc-range-toggle qc-code-tabs" style={{ margin: '0 0 12px' }}>
                <button type="button" className={chatTab === 'all' ? 'active' : ''} onClick={() => setChatTab('all')}>全部 {sessions.length}</button>
                {sessionTabs.map(([p, n]) => (
                  <button key={p} type="button" className={chatTab === p ? 'active' : ''} onClick={() => setChatTab(p)}>{p} {n}</button>
                ))}
              </div>
              <div className="drawer-sessions">
                {shownSessions.map((s) => (
                  <SessionCard key={s.id} s={s} orders={AFTER_SALES_ORDERS.filter((o) => o.sessionId === s.id).map((o) => o.id)} onFullScreen={() => setFullId(s.id)} onUpdateHits={onUpdateHits} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-4)', fontSize: 12 }}>暂无聊天会话</div>
          )}

          <div className="section-title">各平台数据</div>
          <PlatformMatrix
            stats={selCode ? selCode.platforms : series.merged}
            threshold={0.25}
            problemHits={hits}
            showLastOrder={false}
          />
        </div>
        <div className="drawer-foot">
          <button className="btn primary" onClick={onCreateOpt}>创建优化任务</button>
          <button className="btn" onClick={onClose}>关闭</button>
        </div>
      </div>
      {fullId && (
        <ChatFullModal sessions={shownSessions} currentId={fullId} onNav={setFullId} onClose={() => setFullId(null)} onUpdateHits={onUpdateHits} />
      )}
    </>
  );
}

/* ---------- 创建优化任务弹窗（仅问题点/需求/凭证，对齐原系统表单） ---------- */
function CreateOptTaskModal({ series, onClose, onSubmit }: {
  series: QcCenterSeries;
  onClose: () => void;
  onSubmit: (form: { problem: string; demand: string; evidence: string[] }) => void;
}) {
  const [problem, setProblem] = useState('');
  const [demand, setDemand] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [errs, setErrs] = useState<{ problem?: string; demand?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const e: typeof errs = {};
    if (!problem) e.problem = '请选择问题点';
    if (!demand) e.demand = '请选择需求';
    setErrs(e);
    if (e.problem || e.demand) return;
    onSubmit({ problem, demand, evidence });
  };

  return (
    <Modal
      title="创建优化任务"
      sub={`系列 ${series.seriesCode} · ${series.name}`}
      size="md"
      onClose={onClose}
      foot={
        <>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={submit}>创建任务</button>
        </>
      }
    >
      <div className="qc-create-form">
        <div className="qc-create-grid">
          <div className="form-item">
            <label><span className="req">*</span>问题点</label>
            <div className="fi-ctrl">
              <BubbleSelect
                className="sg-select"
                options={[...OPT_PROBLEMS]}
                value={problem || '请选择问题点'}
                onChange={(v) => { setProblem(v); setErrs((x) => ({ ...x, problem: undefined })); }}
              />
              {errs.problem && <div className="form-err">{errs.problem}</div>}
            </div>
          </div>
          <div className="form-item">
            <label><span className="req">*</span>需求</label>
            <div className="fi-ctrl">
              <BubbleSelect
                className="sg-select"
                options={[...OPT_DEMANDS]}
                value={demand || '请选择需求'}
                onChange={(v) => { setDemand(v); setErrs((x) => ({ ...x, demand: undefined })); }}
              />
              {errs.demand && <div className="form-err">{errs.demand}</div>}
            </div>
          </div>
        </div>
        <div className="form-item">
          <label>凭证</label>
          <div className="fi-ctrl">
            <input
              ref={fileRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const names = [...(e.target.files ?? [])].map((f) => f.name);
                if (names.length) setEvidence((prev) => [...prev, ...names.filter((n) => !prev.includes(n))]);
                e.target.value = '';
              }}
            />
            <div className="ev-line">
              <button className="btn primary sm" type="button" onClick={() => fileRef.current?.click()}>
                点击上传
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polyline points="16 16 12 12 8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {evidence.map((n) => (
                <span className="ev-thumb" key={n} title={n}>
                  {n.split('.').pop()?.toUpperCase().slice(0, 4) || '附件'}
                  <i className="x" onClick={() => setEvidence((prev) => prev.filter((x) => x !== n))}>×</i>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- 趋势图弹层：周期内订单量/退款率/售后单/聊天风险数/聊天风险占比（昨日/前3日/前7日/自定义） ---------- */
const METRIC_PANELS: { key: MetricKey; name: string; color: string; rate?: boolean }[] = [
  { key: 'orders', name: '订单量', color: '#4f7cff' },
  { key: 'refundRate', name: '退款率', color: '#e6455c', rate: true },
  { key: 'afterSales', name: '售后单', color: '#ff9a2e' },
  { key: 'chatRisks', name: '聊天风险数', color: '#f53f3f' },
  { key: 'chatRatio', name: '聊天风险占比', color: '#722ed1', rate: true },
];

function MetricTrendModal({ title, totals, optTasks, onClose }: {
  title: string;
  totals: ScopeTotals;
  /** 当前系列的优化任务（用于优化效果趋势：优化中 → 优化完成区间带） */
  optTasks: OptTask[];
  onClose: () => void;
}) {
  const [range, setRange] = useState<TrendRangeKey>('d7');
  const [custom, setCustom] = useState<DateRange>(DEFAULT_CUSTOM_RANGE);
  /** 隐藏维度（图例点击切换显隐） */
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const data = useMemo(() => metricTrend(totals, range, custom), [totals, range, custom]);
  const toggle = (key: string) => setHidden((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const fmtOf = (m: { rate?: boolean }) => (m.rate ? pct : (v: number) => Math.round(v).toLocaleString());
  /* 鼠标滚轮切换时间范围（昨日/前3日/前7日 循环；自定义仅手动点选） */
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
      const order: TrendRangeKey[] = ['yesterday', 'd3', 'd7'];
      setRange((prev) => {
        const idx = prev === 'custom' ? 2 : order.indexOf(prev);
        return order[(idx + (e.deltaY > 0 ? 1 : 2)) % order.length];
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  /* 优化过程记录：进入优化中即有起点，提交审核/完结后有终点；区间带叠加在各指标趋势上展示优化效果 */
  const optRecords = useMemo(() => optTasks.filter((t) => t.optStartAt), [optTasks]);
  const bands = optRecords.map((t) => ({
    start: t.optStartAt as string,
    end: t.optEndAt,
    label: t.optDirection,
    color: OPT_STATUS_LABELS.find((s) => s.key === t.status)?.color ?? '#4f7cff',
  }));
  const fmtDay = (d: string) => d.slice(5).replace('-', '/');
  return (
    <Modal
      title="趋势图"
      sub={title}
      size="xl"
      onClose={onClose}
      foot={<button className="btn" onClick={onClose}>关闭</button>}
    >
      <div ref={bodyRef}>
      <div className="mt-head">
        <div className="mt-legend">
          {METRIC_PANELS.map((m) => {
            const off = hidden.has(m.key);
            return (
              <button
                key={m.key}
                type="button"
                className={`mt-chip ${off ? 'off' : ''}`}
                title={off ? `显示「${m.name}」` : `隐藏「${m.name}」`}
                onClick={() => toggle(m.key)}
              >
                <i style={{ background: off ? '#d5d9e0' : m.color }} />
                {m.name}
                <b>{fmtOf(m)(data.sums[m.key])}</b>
              </button>
            );
          })}
        </div>
        <div className="mt-range">
          <span className="mt-wheel-tip">滚轮切换时间范围</span>
          <div className="qc-range-toggle">
            {TREND_RANGE_LABELS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={range === r.key ? 'active' : ''}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === 'custom' && <DateRangePicker custom={custom} onChange={setCustom} />}
        </div>
      </div>
      <div className="mt-chart-card">
        <MetricTrendChart
          labels={data.labels}
          series={METRIC_PANELS.map((m) => ({
            key: m.key,
            name: m.name,
            color: m.color,
            points: data.series[m.key],
            format: fmtOf(m),
            axis: m.rate ? ('right' as const) : ('left' as const),
          }))}
          hidden={hidden}
          bands={bands}
        />
        {optRecords.length > 0 && (
          <div className="mt-opt-list">
            {optRecords.map((t) => (
              <div className="mt-opt-item" key={t.id}>
                <i className="type-dot" style={{ background: OPT_STATUS_LABELS.find((s) => s.key === t.status)?.color }} />
                <span className="dir">{t.optDirection}</span>
                <span className="typ">{t.optType}</span>
                <span className="period">{fmtDay(t.optStartAt as string)} → {t.optEndAt ? fmtDay(t.optEndAt) : '进行中'}</span>
                <span className="st">{OPT_STATUS_LABELS.find((s) => s.key === t.status)?.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </Modal>
  );
}
