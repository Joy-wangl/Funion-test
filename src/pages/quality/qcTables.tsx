/* =========================================================
   品控管理 v2 · 三张主表
   系列编码维度 / 商品编码维度(含预审核·审核人·审核状态) / 优化任务
   ========================================================= */
import {
  pct,
  rateCls,
  sessionsOf,
  type AggStat,
  type JunkStatus,
  type OptTask,
  type ProductCodeRow,
  type Review,
  type SeriesView,
} from './data';
import { IconArrow } from '../permission/shared';
import { PlatformChips, PlatformMatrix, StatusTag, TaskStatusTag, TypeBars, PreReviewTag, ReviewStatusTag } from './qcParts';

export interface CodeView {
  code: ProductCodeRow;
  agg: AggStat;
  status: JunkStatus;
}

/* ---------- 系列编码维度 ---------- */
export function SeriesTable({ views, expanded, onToggle, onSubmitReview, threshold }: {
  views: SeriesView[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onSubmitReview: (seriesCode: string) => void;
  threshold: number;
}) {
  return (
    <table className="table qc-wide">
      <thead>
        <tr>
          <th style={{ width: 40 }}></th>
          <th>系列编码</th>
          <th>包含商品编码</th>
          <th>商品ID</th>
          <th>平台覆盖</th>
          <th>订单量</th>
          <th>退款率</th>
          <th>售后单</th>
          <th>聊天风险</th>
          <th>品控状态</th>
          <th style={{ width: 110 }}>操作</th>
        </tr>
      </thead>
      <tbody>
        {views.map((v) => (
          <SeriesRowView
            key={v.series.seriesCode}
            view={v}
            open={expanded.has(v.series.seriesCode)}
            onToggle={() => onToggle(v.series.seriesCode)}
            onSubmitReview={() => onSubmitReview(v.series.seriesCode)}
            threshold={threshold}
          />
        ))}
        {views.length === 0 && (
          <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>无匹配数据</td></tr>
        )}
      </tbody>
    </table>
  );
}

function SeriesRowView({ view, open, onToggle, onSubmitReview, threshold }: {
  view: SeriesView;
  open: boolean;
  onToggle: () => void;
  onSubmitReview: () => void;
  threshold: number;
}) {
  return (
    <>
      <tr>
        <td>
          <span className={`arrow ${open ? 'open' : ''}`} onClick={onToggle} style={{ cursor: 'pointer', display: 'inline-flex' }}><IconArrow /></span>
        </td>
        <td className="col-name">
          <div>{view.series.seriesCode}</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{view.series.name}</div>
        </td>
        <td>
          <span style={{ color: 'var(--text-3)' }}>{view.codes.length} 个：</span>
          {view.codes.slice(0, 2).map((c) => c.code).join('、')}
          {view.codes.length > 2 && ' …'}
        </td>
        <td>{view.agg.productIdCount}</td>
        <td><PlatformChips platforms={view.agg.platforms} /></td>
        <td>{view.agg.orders.toLocaleString()}</td>
        <td><span className={`rate ${rateCls(view.agg.refundRate, threshold)}`}>{pct(view.agg.refundRate)}</span></td>
        <td>{view.agg.afterSales}</td>
        <td>{view.agg.chatRisks ? <span className="rate bad">{view.agg.chatRisks}</span> : 0}</td>
        <td><StatusTag status={view.status} /></td>
        <td>
          <div className="qc-op-col">
            <a onClick={onSubmitReview}>提交审核</a>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="expand-row">
          <td colSpan={11}>
            <div className="expand-title">各平台数据（系列 {view.series.seriesCode} 汇总）</div>
            <PlatformMatrix stats={view.merged} threshold={threshold} />
            <div className="expand-title" style={{ marginTop: 10 }}>下属商品编码</div>
            <div className="sub-codes">
              {view.codes.map((c) => <span className="tag blue" key={c.code}>{c.code} {c.name}</span>)}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------- 商品编码维度（核心增强） ---------- */
export function CodeTable({ views, expanded, reviews, onToggle, onDetail, onAddTask, onSubmitReview, threshold }: {
  views: CodeView[];
  expanded: Set<string>;
  reviews: Review[];
  onToggle: (key: string) => void;
  onDetail: (code: string) => void;
  onAddTask: (code: string) => void;
  onSubmitReview: (code: string) => void;
  threshold: number;
}) {
  const reviewOf = (code: string) => reviews.find((r) => r.code === code);
  return (
    <table className="table qc-wider">
      <thead>
        <tr>
          <th style={{ width: 40 }}></th>
          <th>商品编码</th>
          <th>系列编码</th>
          <th>问题类型</th>
          <th>平台覆盖</th>
          <th>订单量</th>
          <th>退款率</th>
          <th>售后单</th>
          <th>聊天风险</th>
          <th>预审核</th>
          <th>审核人</th>
          <th>审核状态</th>
          <th>品控状态</th>
          <th style={{ width: 120 }}>操作</th>
        </tr>
      </thead>
      <tbody>
        {views.map((v) => {
          const rv = reviewOf(v.code.code);
          const sessCount = sessionsOf(v.code.code).length;
          return (
            <CodeRowView
              key={v.code.code}
              view={v}
              rv={rv}
              sessCount={sessCount}
              open={expanded.has(v.code.code)}
              onToggle={() => onToggle(v.code.code)}
              onDetail={() => onDetail(v.code.code)}
              onAddTask={() => onAddTask(v.code.code)}
              onSubmitReview={() => onSubmitReview(v.code.code)}
              threshold={threshold}
            />
          );
        })}
        {views.length === 0 && (
          <tr><td colSpan={14} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>无匹配数据</td></tr>
        )}
      </tbody>
    </table>
  );
}

function CodeRowView({ view, rv, sessCount, open, onToggle, onDetail, onAddTask, onSubmitReview, threshold }: {
  view: CodeView;
  rv?: Review;
  sessCount: number;
  open: boolean;
  onToggle: () => void;
  onDetail: () => void;
  onAddTask: () => void;
  onSubmitReview: () => void;
  threshold: number;
}) {
  const total = view.code.afterSalesTypes.reduce((s, [, n]) => s + n, 0);
  return (
    <>
      <tr>
        <td>
          <span className={`arrow ${open ? 'open' : ''}`} onClick={onToggle} style={{ cursor: 'pointer', display: 'inline-flex' }}><IconArrow /></span>
        </td>
        <td className="col-name">
          <div>{view.code.code}</div>
          <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{view.code.name}</div>
        </td>
        <td>{view.code.seriesCode}</td>
        <td>
          <div className="prob-tags">
            {view.code.afterSalesTypes.slice(0, 2).map(([t, n]) => (
              <span key={t} className={`tag ${t === '质量问题' ? 'red' : t === '描述不符' ? 'orange' : ''}`}>{t} {n}</span>
            ))}
          </div>
        </td>
        <td><PlatformChips platforms={view.agg.platforms} /></td>
        <td>{view.agg.orders.toLocaleString()}</td>
        <td><span className={`rate ${rateCls(view.agg.refundRate, threshold)}`}>{pct(view.agg.refundRate)}</span></td>
        <td>{view.agg.afterSales}</td>
        <td>{view.agg.chatRisks ? <span className="rate bad">{view.agg.chatRisks}</span> : 0}</td>
        <td>{rv ? <PreReviewTag v={rv.preReview} /> : '—'}</td>
        <td>{rv?.reviewer || <span style={{ color: 'var(--text-4)' }}>未指派</span>}</td>
        <td>{rv ? <ReviewStatusTag v={rv.status} /> : '—'}</td>
        <td><StatusTag status={view.status} /></td>
        <td>
          <div className="qc-op-col">
            <a onClick={onDetail}>查看详情</a>
            <a onClick={onAddTask}>创建任务</a>
            <a onClick={onSubmitReview}>{rv && (rv.status === '待审核' || rv.status === '审核中') ? '催促审核' : '提交审核'}</a>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="expand-row">
          <td colSpan={14}>
            <div className="expand-grid">
              <div>
                <div className="expand-title">各平台数据（商品编码 {view.code.code}）</div>
                <PlatformMatrix stats={view.code.platforms} threshold={threshold} />
              </div>
              <div>
                <div className="expand-title">售后类型命中（共 {total} 次）</div>
                <TypeBars types={view.code.afterSalesTypes} total={total} />
                <div className="expand-title" style={{ marginTop: 10 }}>聊天会话</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {sessCount ? `${sessCount} 个会话 · 命中 ${sessionsOf(view.code.code).filter((s) => s.hits.length).length} 个（详情见「聊天记录核查」或抽屉）` : '暂无聊天会话'}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------- 优化任务 ---------- */
export function TaskTable({ tasks, onAdvance, onDetail, onCreate, threshold }: {
  tasks: OptTask[];
  onAdvance: (id: string) => void;
  onDetail: (code: string) => void;
  onCreate: () => void;
  threshold: number;
}) {
  return (
    <>
      <div className="task-head">
        <span className="task-summary">
          共 {tasks.length} 个 · 待处理 {tasks.filter((t) => t.status === 'todo').length} · 优化中 {tasks.filter((t) => t.status === 'doing').length} · 验证中 {tasks.filter((t) => t.status === 'verifying').length}
        </span>
        <button className="btn primary" onClick={onCreate}>新建优化任务</button>
      </div>
      <table className="table qc-wide">
        <thead>
          <tr>
            <th>任务ID</th>
            <th>商品编码</th>
            <th>问题类型</th>
            <th>优化动作</th>
            <th>负责人</th>
            <th>截止日期</th>
            <th>优化效果（退款率 前→后）</th>
            <th>状态</th>
            <th style={{ width: 150 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td style={{ color: 'var(--text-3)' }}>{t.id}</td>
              <td className="col-name"><span className="link" onClick={() => onDetail(t.code)}>{t.code}</span></td>
              <td><span className={`tag ${t.problemType === '质量问题' ? 'red' : t.problemType === '描述不符' ? 'orange' : ''}`}>{t.problemType}</span></td>
              <td>{t.action}</td>
              <td>{t.owner}</td>
              <td style={{ color: 'var(--text-3)' }}>{t.deadline}</td>
              <td>
                {t.beforeRate != null && t.afterRate != null ? (
                  <>
                    <span className="rate bad">{pct(t.beforeRate)}</span>
                    <span style={{ color: 'var(--text-4)', margin: '0 4px' }}>→</span>
                    <span className={`rate ${rateCls(t.afterRate, threshold)}`}>{pct(t.afterRate)}</span>
                    <span className={`tag ${t.afterRate < threshold ? 'green' : 'orange'}`} style={{ marginLeft: 6 }}>
                      {t.afterRate < threshold ? '已回落' : '仍偏高'}
                    </span>
                  </>
                ) : '—'}
              </td>
              <td><TaskStatusTag status={t.status} /></td>
              <td>
                <div className="qc-op-col">
                  {t.status === 'todo' && <a onClick={() => onAdvance(t.id)}>开始处理</a>}
                  {t.status === 'doing' && <a onClick={() => onAdvance(t.id)}>完成优化·提交验证</a>}
                  {t.status === 'verifying' && <a onClick={() => onAdvance(t.id)}>确认效果·关闭</a>}
                  {t.status === 'closed' && <span style={{ color: 'var(--text-4)' }}>—</span>}
                </div>
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>暂无优化任务</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}
