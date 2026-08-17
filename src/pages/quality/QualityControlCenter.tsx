/* =========================================================
   Funion 品控管理 v2 · 独立模块外壳
   左侧边栏导航（对齐运营中心）+ 右侧内容区整页滚动
   信息架构：概览 / 商品监控(系列·商品) / 问题核查(聊天·售后) / 治理闭环(审核·任务)
   ========================================================= */
import { useMemo, useState } from 'react';
import {
  AFTER_SALES_ORDERS,
  AFTER_SALES_TYPES,
  CHAT_SESSIONS,
  DEFAULT_THRESHOLDS,
  INITIAL_REVIEWS,
  INITIAL_TASKS,
  OWNERS,
  PRE_REVIEWS,
  PRODUCT_CODES,
  REVIEW_STATUSES,
  SERIES,
  aggPlatformStats,
  junkStatus,
  markedByReviews,
  mergeByPlatform,
  pct,
  preReviewOf,
  rateCls,
  typeHitRanking,
  typeMetricsOfCodes,
  type OptTask,
  type QcThresholds,
  type Review,
  type ReviewDecision,
  type SeriesView,
  type TaskStatus,
} from './data';
import { Checkbox, IconSearch, IconX, ToastWrap, useToasts } from '../permission/shared';
import BubbleSelect from '../../components/BubbleSelect';
import '../permission/style.css';
import './style.css';
import {
  CreateTaskModal,
  PlatformMatrix,
  PreReviewTag,
  ProblemDiagnosis,
  ReviewStatusTag,
  SessionCard,
  StatusTag,
  TaskStatusTag,
  TypeBars,
} from './qcParts';
import { CodeTable, SeriesTable, TaskTable } from './qcTables';
import { AfterSalesView, ChatAuditView, OverviewDashboard, ReviewManageView, ReviewModal } from './qcExtra';
import { ThresholdConfigView, TypeManageView } from './qcRules';

type Dim = 'overview' | 'series' | 'code' | 'chat' | 'aftersales' | 'review' | 'task' | 'threshold' | 'types';

const DIM_META: Record<Dim, { title: string; desc: string }> = {
  overview: { title: '数据概览', desc: '品控全局态势 · 退款率趋势 · 问题结构 · 聚焦商品' },
  series: { title: '系列编码维度', desc: '系列级聚合监控 · 支持批量提交审核' },
  code: { title: '商品编码维度', desc: '多维度阈值判定疑似 · 标记经审核流确认后生效' },
  chat: { title: '聊天记录核查', desc: '多轮会话原文 · 问题短语自动高亮' },
  aftersales: { title: '售后单分析', desc: '售后类型命中统计 · 与单据明细同源' },
  review: { title: '审核管理', desc: '系统预审核 → 指派审核人复核 → 品控状态联动' },
  task: { title: '优化任务', desc: '创建 → 处理 → 验证 → 关闭 闭环' },
  threshold: { title: '阈值配置', desc: '退款率 / 问题数量 / 类型命中 三维度判定 · 调整后全局实时生效' },
  types: { title: '问题类型管理', desc: '内置 + 自定义问题类型 · 贯通筛选 / 图表 / 诊断 / 任务' },
};

export default function QualityControlCenter() {
  const [dim, setDim] = useState<Dim>('overview');
  const [q, setQ] = useState('');
  const [onlyJunk, setOnlyJunk] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [tasks, setTasks] = useState<OptTask[]>(INITIAL_TASKS);
  const [drawerCode, setDrawerCode] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState<{ code?: string; problemType?: string; action?: string } | null>(null);
  const [reviewCode, setReviewCode] = useState<string | null>(null);
  /* 商品编码维度：审核三维度筛选 */
  const [fStatus, setFStatus] = useState('全部审核状态');
  const [fReviewer, setFReviewer] = useState('全部审核人');
  const [fPre, setFPre] = useState('全部预审核建议');
  /* 规则配置：多维度阈值 + 自定义问题类型 */
  const [thresholds, setThresholds] = useState<QcThresholds>(DEFAULT_THRESHOLDS);
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const { toasts, pushToast } = useToasts();

  const markedCodes = useMemo(() => markedByReviews(reviews), [reviews]);
  const allTypes = useMemo(() => [...AFTER_SALES_TYPES, ...customTypes], [customTypes]);
  const typeRankMap = useMemo(
    () => new Map(typeHitRanking(allTypes).map((r) => [r.type, r.count])),
    [allTypes],
  );
  const typeUsage = (t: string) => ({
    hits: typeRankMap.get(t) ?? 0,
    tasks: tasks.filter((x) => x.problemType === t).length,
  });

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* 搜索匹配：编码 / 系列编码 / 名称 / 商品ID */
  const match = (c: (typeof PRODUCT_CODES)[number]) => {
    const kw = q.trim().toLowerCase();
    if (!kw) return true;
    return (
      c.code.toLowerCase().includes(kw) ||
      c.seriesCode.toLowerCase().includes(kw) ||
      c.name.toLowerCase().includes(kw) ||
      c.platforms.some((p) => p.productIds.some((id) => id.toLowerCase().includes(kw)))
    );
  };

  /* 商品编码维度 */
  const codeViews = useMemo(() => PRODUCT_CODES.map((c) => {
    const agg = aggPlatformStats(c.platforms);
    const status = junkStatus(markedCodes.has(c.code), agg, typeMetricsOfCodes([c]), thresholds);
    return { code: c, agg, status };
  }), [markedCodes, thresholds]);

  const filteredCodes = codeViews
    .filter((v) => match(v.code))
    .filter((v) => !onlyJunk || v.status !== 'normal')
    .filter((v) => {
      const rv = reviews.find((r) => r.code === v.code.code);
      if (fStatus !== '全部审核状态' && rv?.status !== fStatus) return false;
      if (fReviewer === '未指派') {
        if (rv?.reviewer) return false;
      } else if (fReviewer !== '全部审核人' && rv?.reviewer !== fReviewer) return false;
      if (fPre !== '全部预审核建议' && rv?.preReview !== fPre) return false;
      return true;
    });

  /* 系列维度 */
  const seriesViews = useMemo(() => {
    const out: SeriesView[] = [];
    SERIES.forEach((s) => {
      const codes = PRODUCT_CODES.filter((c) => c.seriesCode === s.seriesCode && match(c));
      if (!codes.length) return;
      const agg = aggPlatformStats(codes.flatMap((c) => c.platforms));
      const marked = codes.some((c) => markedCodes.has(c.code));
      out.push({
        series: s,
        codes,
        agg,
        merged: mergeByPlatform(codes.map((c) => c.platforms)),
        status: junkStatus(marked, agg, typeMetricsOfCodes(codes), thresholds),
      });
    });
    return out.filter((v) => !onlyJunk || v.status !== 'normal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, onlyJunk, markedCodes, thresholds]);

  /* 全局概览 */
  const overall = useMemo(() => {
    const all = codeViews.map((v) => v.agg);
    const orders = all.reduce((s, a) => s + a.orders, 0);
    const refunds = PRODUCT_CODES.reduce(
      (s, c) => s + c.platforms.reduce((x, p) => x + p.orders * p.refundRate, 0), 0,
    );
    return {
      seriesCount: SERIES.length,
      codeCount: PRODUCT_CODES.length,
      orders,
      refundRate: orders ? refunds / orders : 0,
      junkCount: codeViews.filter((v) => v.status !== 'normal').length,
      chatHits: CHAT_SESSIONS.reduce((s, x) => s + x.hits.length, 0),
      afterSalesTotal: AFTER_SALES_ORDERS.length,
      pendingReview: reviews.filter((r) => r.status === '待审核').length,
    };
  }, [codeViews, reviews]);

  const drawerView = drawerCode ? codeViews.find((v) => v.code.code === drawerCode) : null;
  const drawerReview = drawerCode ? reviews.find((r) => r.code === drawerCode) : null;
  const reviewModal = reviewCode ? reviews.find((r) => r.code === reviewCode) : null;

  /* ---------- 审核流 ---------- */
  const submitReview = (code: string) => {
    const rv = reviews.find((r) => r.code === code);
    if (rv && (rv.status === '待审核' || rv.status === '审核中')) {
      pushToast(`已提醒审核人尽快处理：${code}${rv.reviewer ? `（${rv.reviewer}）` : ''}`);
      return;
    }
    setReviews((rs) => rs.map((r) => (r.code === code
      ? { ...r, status: '待审核' as const, reviewer: '', decision: undefined, submittedAt: '2026-08-14 10:30' }
      : r)));
    pushToast(`已提交审核：${code}，等待指派审核人`);
  };

  const submitSeriesReview = (sc: string) => {
    const codes = PRODUCT_CODES.filter((c) => c.seriesCode === sc).map((c) => c.code);
    setReviews((rs) => rs.map((r) => (codes.includes(r.code)
      ? { ...r, status: '待审核' as const, reviewer: '', decision: undefined, submittedAt: '2026-08-14 10:30' }
      : r)));
    pushToast(`系列 ${sc} 下 ${codes.length} 个商品编码已批量提交审核`);
  };

  const assignReview = (code: string, reviewer: string) => {
    setReviews((rs) => rs.map((r) => {
      if (r.code !== code) return r;
      let status = r.status;
      if (r.status === '待审核' && reviewer) status = '审核中';
      else if (r.status === '审核中' && !reviewer) status = '待审核';
      return { ...r, reviewer, status };
    }));
    pushToast(reviewer ? `已指派审核人：${code} → ${reviewer}` : `已取消指派：${code}`);
  };

  const decideReview = (code: string, ok: boolean, decision: ReviewDecision, opinion: string) => {
    setReviews((rs) => rs.map((r) => (r.code === code
      ? {
        ...r,
        status: ok ? '已通过' as const : '已驳回' as const,
        decision: ok ? decision : undefined,
        opinion: opinion || r.opinion,
        reviewedAt: '2026-08-14 11:20',
      }
      : r)));
    setReviewCode(null);
    pushToast(ok
      ? (decision === '标记垃圾品' ? `审核通过：${code} 已标记为垃圾品` : `审核通过：${code} 维持观察`)
      : `已驳回：${code}`);
  };

  /* ---------- 规则配置：阈值 & 问题类型 ---------- */
  const applyThresholds = (next: QcThresholds) => {
    setThresholds(next);
    setReviews((rs) => rs.map((r) => {
      const c = PRODUCT_CODES.find((x) => x.code === r.code);
      return c ? { ...r, preReview: preReviewOf(c, next), preReviewAt: '2026-08-14 12:00' } : r;
    }));
    pushToast(`阈值已更新：退款率 ≥ ${Math.round(next.refundRate * 100)}% / 问题数量 ≥ ${next.problemCount} / 单类型 ≥ ${next.typeHitCount}，状态与预审核已重算`);
  };

  const addCustomType = (name: string): boolean => {
    if (!name) { pushToast('请输入类型名称', 'error'); return false; }
    if (allTypes.includes(name)) { pushToast(`类型已存在：${name}`, 'error'); return false; }
    setCustomTypes((ts) => [...ts, name]);
    pushToast(`已新增问题类型：${name} · 已贯通筛选 / 图表 / 任务`);
    return true;
  };

  const removeCustomType = (name: string) => {
    const taskCnt = tasks.filter((t) => t.problemType === name).length;
    if (taskCnt) { pushToast(`无法删除：存在 ${taskCnt} 个关联优化任务，请先处理`, 'error'); return; }
    if (typeRankMap.get(name)) { pushToast('无法删除：该类型存在售后命中记录', 'error'); return; }
    setCustomTypes((ts) => ts.filter((t) => t !== name));
    pushToast(`已删除问题类型：${name}`);
  };

  /* ---------- 优化任务闭环 ---------- */
  const addTask = (payload: { code: string; problemType: string; action: string; owner: string; deadline: string }) => {
    const row = PRODUCT_CODES.find((c) => c.code === payload.code);
    const t: OptTask = {
      id: `T-0814-${String(tasks.length + 1).padStart(2, '0')}`,
      seriesCode: row?.seriesCode ?? '-',
      status: 'todo',
      createdAt: '2026-08-14 10:00',
      ...payload,
    };
    setTasks([t, ...tasks]);
    setTaskModal(null);
    pushToast(`已创建优化任务：${payload.code} · ${payload.problemType}`);
  };

  const advanceTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    if (t.status === 'todo') {
      setTasks(tasks.map((x) => (x.id === id ? { ...x, status: 'doing' as TaskStatus } : x)));
      pushToast(`已开始处理：${t.action}`);
    } else if (t.status === 'doing') {
      const before = codeViews.find((v) => v.code.code === t.code)?.agg.refundRate ?? 0.2;
      const after = Math.max(0.04, Math.round(before * 0.42 * 1000) / 1000);
      setTasks(tasks.map((x) => (x.id === id ? { ...x, status: 'verifying' as TaskStatus, beforeRate: before, afterRate: after } : x)));
      pushToast('优化完成，进入效果验证期');
    } else if (t.status === 'verifying') {
      setTasks(tasks.map((x) => (x.id === id ? { ...x, status: 'closed' as TaskStatus } : x)));
      pushToast(`任务 ${id} 已确认效果并关闭`);
    }
  };

  const showGlobalFilters = dim === 'series' || dim === 'code';

  /* 侧边栏导航（分组 = 品控工作流：监控 → 核查 → 治理） */
  const navGroups: { grp?: string; items: { key: Dim; label: string; ico: string; badge?: number; badgeCls?: string }[] }[] = [
    { items: [{ key: 'overview', label: '数据概览', ico: '▦' }] },
    {
      grp: '商品监控',
      items: [
        { key: 'series', label: '系列编码维度', ico: '▤' },
        { key: 'code', label: '商品编码维度', ico: '▥', badge: overall.junkCount, badgeCls: 'red' },
      ],
    },
    {
      grp: '问题核查',
      items: [
        { key: 'chat', label: '聊天记录核查', ico: '✉' },
        { key: 'aftersales', label: '售后单分析', ico: '￥' },
      ],
    },
    {
      grp: '治理闭环',
      items: [
        { key: 'review', label: '审核管理', ico: '✔', badge: overall.pendingReview, badgeCls: 'orange' },
        { key: 'task', label: '优化任务', ico: '⚑' },
      ],
    },
    {
      grp: '规则配置',
      items: [
        { key: 'threshold', label: '阈值配置', ico: '⚙' },
        { key: 'types', label: '问题类型管理', ico: '✚' },
      ],
    },
  ];

  /* 头部标题：商品编码维度动态展示当前多维阈值 */
  const headMeta = dim === 'code'
    ? { title: '商品编码维度', desc: `退款率 ≥ ${Math.round(thresholds.refundRate * 100)}% / 问题数量 ≥ ${thresholds.problemCount} / 单类型 ≥ ${thresholds.typeHitCount}，任一超标标记疑似` }
    : DIM_META[dim];

  return (
    <div className="pm-page qc-page">
      {/* 左侧边栏 */}
      <aside className="qc-side">
        <div className="qc-side-brand">
          品控管理中心
          <span>垃圾品治理 · 审核闭环</span>
        </div>
        {navGroups.map((g, gi) => (
          <div key={gi}>
            {g.grp && <div className="qc-grp">{g.grp}</div>}
            {g.items.map((it) => (
              <div
                key={it.key}
                className={`qc-nav ${dim === it.key ? 'active' : ''}`}
                onClick={() => setDim(it.key)}
              >
                <span className="qc-nav-ico">{it.ico}</span>
                <span className="qc-nav-text">{it.label}</span>
                {it.badge ? <span className={`qc-badge ${it.badgeCls}`}>{it.badge}</span> : null}
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* 右侧内容区 */}
      <div className="qc-main">
        <div className="qc-head">
          <div className="qc-title">
            {headMeta.title}
            <span className="qc-desc">{headMeta.desc}</span>
          </div>
          {showGlobalFilters && (
            <div className="qc-filters">
              <div className="input-icon" style={{ width: 280 }}>
                <span className="ic"><IconSearch /></span>
                <input className="input" placeholder="搜索编码 / 名称 / 商品ID" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="qc-junk">
                <Checkbox checked={onlyJunk} onChange={setOnlyJunk} />
                <span onClick={() => setOnlyJunk(!onlyJunk)}>只看垃圾品</span>
              </div>
            </div>
          )}
        </div>

        {dim === 'overview' && (
          <div className="qc-stats">
            <div className="qc-stat"><div className="k">监控商品编码</div><div className="v">{overall.codeCount}</div><div className="s">{overall.seriesCount} 个系列 · 全平台</div></div>
            <div className="qc-stat"><div className="k">近30天订单量</div><div className="v">{overall.orders.toLocaleString()}</div><div className="s">全平台合计</div></div>
            <div className="qc-stat"><div className="k">综合退款率</div><div className={`v ${rateCls(overall.refundRate, thresholds.refundRate)}`}>{pct(overall.refundRate)}</div><div className="s">退款率阈值 {Math.round(thresholds.refundRate * 100)}% · 按订单量加权</div></div>
            <div className="qc-stat"><div className="k">垃圾品 / 疑似</div><div className="v danger">{overall.junkCount}</div><div className="s">审核通过后生效</div></div>
            <div className="qc-stat"><div className="k">聊天问题命中</div><div className="v">{overall.chatHits}</div><div className="s">售后单 {overall.afterSalesTotal} 单</div></div>
            <div className="qc-stat"><div className="k">待审核</div><div className="v warn">{overall.pendingReview}</div><div className="s">前往「审核管理」处理</div></div>
          </div>
        )}

        {/* 视图主体 */}
        <div className="qc-body">
          {dim === 'overview' && (
            <OverviewDashboard reviews={reviews} views={codeViews} onOpenCode={(c) => setDrawerCode(c)} thresholds={thresholds} types={allTypes} />
          )}

          {dim === 'threshold' && (
            <ThresholdConfigView
              key={JSON.stringify(thresholds)}
              thresholds={thresholds}
              onApply={applyThresholds}
              onReset={() => applyThresholds(DEFAULT_THRESHOLDS)}
            />
          )}

          {dim === 'types' && (
            <TypeManageView
              types={allTypes}
              builtinCount={AFTER_SALES_TYPES.length}
              usage={typeUsage}
              onAdd={addCustomType}
              onRemove={removeCustomType}
            />
          )}

          {dim === 'series' && (
            <SeriesTable views={seriesViews} expanded={expanded} onToggle={toggleExpand} onSubmitReview={submitSeriesReview} threshold={thresholds.refundRate} />
          )}

          {dim === 'code' && (
            <>
              <div className="qc-filters">
                <BubbleSelect className="input" style={{ width: 140 }} value={fStatus} onChange={setFStatus} options={['全部审核状态', ...REVIEW_STATUSES]} />
                <BubbleSelect className="input" style={{ width: 140 }} value={fReviewer} onChange={setFReviewer} options={['全部审核人', '未指派', ...OWNERS]} />
                <BubbleSelect className="input" style={{ width: 160 }} value={fPre} onChange={setFPre} options={['全部预审核建议', ...PRE_REVIEWS]} />
                <span className="qc-count">共 {filteredCodes.length} 个编码</span>
              </div>
              <CodeTable
                views={filteredCodes}
                expanded={expanded}
                reviews={reviews}
                onToggle={toggleExpand}
                onDetail={(code) => setDrawerCode(code)}
                onAddTask={(code) => setTaskModal({ code })}
                onSubmitReview={submitReview}
                threshold={thresholds.refundRate}
              />
            </>
          )}

          {dim === 'chat' && <ChatAuditView types={allTypes} />}

          {dim === 'aftersales' && <AfterSalesView types={allTypes} />}

          {dim === 'review' && <ReviewManageView reviews={reviews} onOpen={(code) => setReviewCode(code)} />}

          {dim === 'task' && (
            <TaskTable tasks={tasks} onAdvance={advanceTask} onDetail={(code) => setDrawerCode(code)} onCreate={() => setTaskModal({})} threshold={thresholds.refundRate} />
          )}
        </div>
      </div>

      {/* 商品编码详情抽屉 */}
      {drawerView && (
        <>
          <div className="drawer-mask" onClick={() => setDrawerCode(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <div className="d-title">商品编码详情</div>
              <span className="x" onClick={() => setDrawerCode(null)}><IconX /></span>
            </div>
            <div className="drawer-body">
              <div className="detail-hero">
                <div className="av">{drawerView.code.name.slice(0, 1)}</div>
                <div className="info">
                  <div className="n">{drawerView.code.code} · {drawerView.code.name}</div>
                  <div className="m">系列 {drawerView.code.seriesCode} · <StatusTag status={drawerView.status} /></div>
                </div>
              </div>

              <div className="section-title">核心指标（近30天）</div>
              <div className="desc-list">
                <div className="row"><span className="k">订单量</span><span className="v">{drawerView.agg.orders.toLocaleString()}</span></div>
                <div className="row"><span className="k">综合退款率</span><span className="v"><span className={`rate ${rateCls(drawerView.agg.refundRate, thresholds.refundRate)}`}>{pct(drawerView.agg.refundRate)}</span></span></div>
                <div className="row"><span className="k">售后单</span><span className="v">{AFTER_SALES_ORDERS.filter((o) => o.code === drawerView.code.code).length} 单</span></div>
                <div className="row"><span className="k">聊天会话</span><span className="v">{CHAT_SESSIONS.filter((s) => s.code === drawerView.code.code).length} 个 · 命中 {CHAT_SESSIONS.filter((s) => s.code === drawerView.code.code && s.hits.length).length} 个</span></div>
              </div>

              <div className="section-title">审核流</div>
              {drawerReview ? (
                <div className="desc-list">
                  <div className="row"><span className="k">系统预审核</span><span className="v"><PreReviewTag v={drawerReview.preReview} /> <span style={{ color: 'var(--text-3)', fontSize: 12, marginLeft: 6 }}>{drawerReview.preReviewAt}</span></span></div>
                  <div className="row"><span className="k">审核人</span><span className="v">{drawerReview.reviewer || <span style={{ color: 'var(--text-4)' }}>未指派</span>}</span></div>
                  <div className="row"><span className="k">审核状态</span><span className="v"><ReviewStatusTag v={drawerReview.status} /></span></div>
                  {(drawerReview.status === '已通过' && drawerReview.decision) && (
                    <div className="row"><span className="k">审核决定</span><span className="v">{drawerReview.decision}</span></div>
                  )}
                  {drawerReview.opinion && (
                    <div className="row"><span className="k">审核意见</span><span className="v" style={{ color: 'var(--text-3)' }}>{drawerReview.opinion}</span></div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-4)', fontSize: 12 }}>尚未提交审核，可在底部一键提交</div>
              )}

              <div className="section-title">售后类型命中</div>
              <TypeBars
                types={drawerView.code.afterSalesTypes}
                total={drawerView.code.afterSalesTypes.reduce((s, [, n]) => s + n, 0)}
              />

              <div className="section-title">问题诊断与优化建议</div>
              <ProblemDiagnosis
                view={drawerView}
                onCreateTask={(problemType, action) => setTaskModal({ code: drawerView.code.code, problemType, action })}
              />

              <div className="section-title">聊天记录核查（命中短语高亮）</div>
              {CHAT_SESSIONS.filter((s) => s.code === drawerView.code.code).length ? (
                <div className="drawer-sessions">
                  {CHAT_SESSIONS.filter((s) => s.code === drawerView.code.code).map((s) => (
                    <SessionCard key={s.id} s={s} orders={AFTER_SALES_ORDERS.filter((o) => o.sessionId === s.id).map((o) => o.id)} />
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-4)', fontSize: 12 }}>暂无聊天会话</div>
              )}

              <div className="section-title">各平台数据</div>
              <PlatformMatrix stats={drawerView.code.platforms} threshold={thresholds.refundRate} />

              <div className="section-title">关联优化任务</div>
              {tasks.filter((t) => t.code === drawerView.code.code).length ? tasks.filter((t) => t.code === drawerView.code.code).map((t) => (
                <div className="rel-task" key={t.id}>
                  <span style={{ color: 'var(--text-3)' }}>{t.id}</span>
                  <span>{t.problemType} · {t.action}</span>
                  <span style={{ color: 'var(--text-3)' }}>{t.owner}</span>
                  <TaskStatusTag status={t.status} />
                  {t.status !== 'closed' && (
                    <a className="op-a" onClick={() => advanceTask(t.id)}>
                      {t.status === 'todo' ? '开始处理' : t.status === 'doing' ? '提交验证' : '确认关闭'}
                    </a>
                  )}
                </div>
              )) : (
                <div style={{ color: 'var(--text-4)', fontSize: 12 }}>暂无关联任务，可在上方问题诊断中一键创建</div>
              )}
            </div>
            <div className="drawer-foot">
              <button className="btn" onClick={() => setDrawerCode(null)}>关闭</button>
              <button className="btn" onClick={() => setTaskModal({ code: drawerView.code.code })}>创建优化任务</button>
              <button className="btn primary" onClick={() => submitReview(drawerView.code.code)}>
                {drawerReview && (drawerReview.status === '待审核' || drawerReview.status === '审核中') ? '催促审核' : '提交审核'}
              </button>
            </div>
          </div>
        </>
      )}

      {taskModal && (
        <CreateTaskModal
          initial={taskModal}
          onClose={() => setTaskModal(null)}
          onSubmit={addTask}
          notify={pushToast}
          allTypes={allTypes}
        />
      )}

      {reviewModal && (
        <ReviewModal
          review={reviewModal}
          onClose={() => setReviewCode(null)}
          onAssign={assignReview}
          onDecide={decideReview}
          notify={pushToast}
        />
      )}

      <ToastWrap toasts={toasts} />
    </div>
  );
}
