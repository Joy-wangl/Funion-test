/* =========================================================
   品控管理 v2 · 扩展视图
   概览面板 / 聊天记录核查 / 售后单分析 / 审核管理(+审核弹窗)
   ========================================================= */
import { useMemo, useState } from 'react';
import {
  AFTER_SALES_ORDERS,
  AFTER_SALES_STATUSES,
  CHAT_SESSIONS,
  OWNERS,
  PLATFORMS,
  PLATFORM_COLOR,
  PRE_REVIEWS,
  PRODUCT_CODES,
  REFUND_TREND,
  REVIEW_STATUSES,
  SHOP_NAME,
  pct,
  rateCls,
  typeHitRanking,
  type AfterSalesOrder,
  type AfterSalesStatus,
  type AggStat,
  type ChatSession,
  type JunkStatus,
  type ProductCodeRow,
  type Review,
  type ReviewDecision,
  type QcThresholds,
} from './data';
import { Checkbox, IconSearch, Modal } from '../permission/shared';
import BubbleSelect from '../../components/BubbleSelect';
import { PreReviewTag, ReviewStatusTag, SessionBubbles, StatusTag } from './qcParts';
import { Donut, TrendChart } from './qcCharts';

/* ---------- 数据概览看板：趋势 → 结构 → 聚焦 → 治理 ---------- */
const TYPE_COLOR: Record<string, string> = {
  质量问题: '#f53f3f',
  描述不符: '#ff7d00',
  物流破损: '#4f7cff',
  少件漏发: '#722ed1',
  七天无理由: '#86909c',
};

/* 自定义类型调色板（内置之外的类型按序取色） */
const PALETTE = ['#0fc6c2', '#f7ba1e', '#9f7ce0', '#3491fa', '#eb6f92', '#a8763e'];

export function OverviewDashboard({ reviews, views, onOpenCode, thresholds, types }: {
  reviews: Review[];
  views: { code: ProductCodeRow; agg: AggStat; status: JunkStatus }[];
  onOpenCode: (code: string) => void;
  thresholds: QcThresholds;
  types: string[];
}) {
  const ranking = typeHitRanking(types);
  const total = ranking.reduce((s, r) => s + r.count, 0);
  const max = ranking[0]?.count ?? 1;
  const dist = REVIEW_STATUSES.map((s) => ({ s, n: reviews.filter((r) => r.status === s).length }));
  const preDist = PRE_REVIEWS.map((p) => ({ p, n: reviews.filter((r) => r.preReview === p).length }));
  const statusSlices = [
    { label: '垃圾品', value: views.filter((v) => v.status === 'junk').length, color: '#f53f3f' },
    { label: '疑似垃圾品', value: views.filter((v) => v.status === 'suspect').length, color: '#ff7d00' },
    { label: '正常', value: views.filter((v) => v.status === 'normal').length, color: '#00b42a' },
  ];
  const top = [...views].sort((a, b) => b.agg.refundRate - a.agg.refundRate).slice(0, 5);
  return (
    <div className="qc-ov">
      <div className="qc-panels ov-trend">
        <div className="qc-panel">
          <div className="p-title">综合退款率趋势 <span className="p-sub">近30天 · 红色虚线为 {Math.round(thresholds.refundRate * 100)}% 阈值</span></div>
          <TrendChart points={REFUND_TREND} threshold={thresholds.refundRate} />
        </div>
        <div className="qc-panel">
          <div className="p-title">商品编码品控状态分布 <span className="p-sub">标记经审核通过后生效</span></div>
          <Donut slices={statusSlices} centerTop={String(views.length)} centerSub="监控编码" />
        </div>
      </div>

      <div className="qc-panels">
        <div className="qc-panel">
          <div className="p-title">问题类型分布 <span className="p-sub">售后类型命中 · 共 {total} 次</span></div>
          <Donut
            slices={ranking.map((r, i) => ({ label: r.type, value: r.count, color: TYPE_COLOR[r.type] ?? PALETTE[i % PALETTE.length] }))}
            centerTop={String(total)}
            centerSub="命中次数"
          />
        </div>
        <div className="qc-panel">
          <div className="p-title">TOP 问题商品 <span className="p-sub">按退款率排序 · 点击查看详情</span></div>
          {top.map((v, i) => (
            <div className="top-row" key={v.code.code} onClick={() => onOpenCode(v.code.code)}>
              <span className={`top-rank ${i < 3 ? 'hot' : ''}`}>{i + 1}</span>
              <div className="top-info">
                <div className="n">{v.code.code}</div>
                <div className="m">{v.code.name}</div>
              </div>
              <span className={`rate ${rateCls(v.agg.refundRate, thresholds.refundRate)}`}>{pct(v.agg.refundRate)}</span>
              <StatusTag status={v.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="qc-panels">
        <div className="qc-panel">
          <div className="p-title">售后类型命中排行 <span className="p-sub">近30天 · 共 {total} 次</span></div>
          {ranking.map((r) => (
            <div className="tb-row" key={r.type}>
              <span className={`tag ${r.type === '质量问题' ? 'red' : r.type === '描述不符' ? 'orange' : ''}`}>{r.type}</span>
              <div className="tb-bar"><i style={{ width: `${Math.round((r.count / max) * 100)}%` }} /></div>
              <span className="tb-cnt">{r.count} 次</span>
              <span className="tb-pct">涉及 {r.codes} 个商品</span>
            </div>
          ))}
        </div>
        <div className="qc-panel">
          <div className="p-title">审核状态分布 <span className="p-sub">预审核 → 人工复核</span></div>
          <div className="rv-dist">
            {dist.map(({ s, n }) => (
              <div className={`rv-cell ${s === '已通过' ? 'green' : s === '已驳回' ? 'red' : s === '审核中' ? 'blue' : ''}`} key={s}>
                <div className="n">{n}</div>
                <div className="k">{s}</div>
              </div>
            ))}
          </div>
          <div className="p-title" style={{ marginTop: 12 }}>系统预审核建议</div>
          {preDist.map(({ p, n }) => (
            <div className="tb-row" key={p}>
              <PreReviewTag v={p} />
              <div className="tb-bar"><i style={{ width: `${reviews.length ? Math.round((n / reviews.length) * 100) : 0}%` }} /></div>
              <span className="tb-cnt">{n} 个编码</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 聊天记录核查（售后单为父级，展开查看会话原文） ---------- */
export function ChatAuditView({ types }: { types: string[] }) {
  const [q, setQ] = useState('');
  const [platform, setPlatform] = useState('全部平台');
  const [hitType, setHitType] = useState('全部类型');
  const [onlyHit, setOnlyHit] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  /* 类型被删除后回退全部，保证筛选闭环 */
  const effHitType = hitType === '全部类型' || types.includes(hitType) ? hitType : '全部类型';

  const nameOf = (code: string) => PRODUCT_CODES.find((c) => c.code === code)?.name ?? '';
  const sessionOf = (o: AfterSalesOrder) => CHAT_SESSIONS.find((s) => s.id === o.sessionId);

  const rows = useMemo(() => AFTER_SALES_ORDERS.filter((o) => {
    const s = sessionOf(o);
    if (!s) return false;
    const kw = q.trim().toLowerCase();
    if (kw && !(o.code.toLowerCase().includes(kw) || nameOf(o.code).toLowerCase().includes(kw))) return false;
    if (platform !== '全部平台' && o.platform !== platform) return false;
    if (effHitType !== '全部类型' && !s.hits.some((h) => h.type === effHitType)) return false;
    if (onlyHit && !s.hits.length) return false;
    return true;
  }), [q, platform, effHitType, onlyHit]);

  return (
    <>
      <div className="qc-filters">
        <div className="input-icon" style={{ width: 240 }}>
          <span className="ic"><IconSearch /></span>
          <input className="input" placeholder="搜索商品编码 / 名称" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <BubbleSelect className="input" style={{ width: 130 }} value={platform} onChange={setPlatform} options={['全部平台', ...PLATFORMS]} />
        <BubbleSelect className="input" style={{ width: 130 }} value={effHitType} onChange={setHitType} options={['全部类型', ...types]} />
        <div className="qc-junk">
          <Checkbox checked={onlyHit} onChange={setOnlyHit} />
          <span onClick={() => setOnlyHit(!onlyHit)}>只看问题命中</span>
        </div>
        <span className="qc-count">共 {rows.length} 个售后单 · 命中 {rows.filter((o) => (sessionOf(o)?.hits.length ?? 0) > 0).length} 个</span>
      </div>
      <table className="table qc-wide">
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            <th>售后单号</th>
            <th>商品编码 / 名称</th>
            <th>平台 / 店铺</th>
            <th>售后类型</th>
            <th>关联订单</th>
            <th>申请时间</th>
            <th>关联会话</th>
            <th>命中类型</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const open = openId === o.id;
            return (
              <AfterSalesRow key={o.id} o={o} s={sessionOf(o)!} open={open}
                onToggle={() => setOpenId(open ? null : o.id)} />
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>无匹配售后单</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

function AfterSalesRow({ o, s, open, onToggle }: {
  o: AfterSalesOrder; s: ChatSession; open: boolean; onToggle: () => void;
}) {
  const name = PRODUCT_CODES.find((c) => c.code === o.code)?.name ?? '';
  return (
    <>
      <tr>
        <td>
          <span className={`arrow ${open ? 'open' : ''}`} onClick={onToggle} style={{ cursor: 'pointer', display: 'inline-flex' }}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </span>
        </td>
        <td style={{ color: 'var(--text-3)' }}>{o.id}</td>
        <td className="col-name"><div>{o.code}</div><div style={{ color: 'var(--text-3)', fontSize: 12 }}>{name}</div></td>
        <td><span className="plat-chip"><i className="platform-dot" style={{ background: PLATFORM_COLOR[o.platform] }} />{o.platform}</span><div className="cell-sub">{SHOP_NAME[o.platform]}</div></td>
        <td>{o.type}</td>
        <td style={{ color: 'var(--text-3)' }}>{o.orderId}</td>
        <td style={{ color: 'var(--text-3)' }}>{o.appliedAt}</td>
        <td style={{ color: 'var(--text-3)' }}>{s.id}</td>
        <td>
          {s.hits.length ? [...new Set(s.hits.map((h) => h.type))].map((t) => <span className="tag red" key={t} style={{ marginRight: 4 }}>{t}</span>) : <span className="tag green">无命中</span>}
        </td>
      </tr>
      {open && (
        <tr className="expand-row">
          <td colSpan={9}>
            <div className="expand-title">
              会话原文（命中短语高亮） · 会话 {s.id} · {SHOP_NAME[o.platform]} · 订单 {o.orderId}
            </div>
            <SessionBubbles s={s} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------- 售后单分析 ---------- */
const AS_PAGE = 10;

export function AfterSalesView({ types }: { types: string[] }) {
  const [type, setType] = useState('全部类型');
  const [platform, setPlatform] = useState('全部平台');
  const [status, setStatus] = useState('全部状态');
  const [page, setPage] = useState(1);
  /* 类型被删除后回退全部，保证筛选闭环 */
  const effType = type === '全部类型' || types.includes(type) ? type : '全部类型';

  const ranking = typeHitRanking(types);
  const total = ranking.reduce((s, r) => s + r.count, 0);

  const orders = useMemo(() => AFTER_SALES_ORDERS.filter((o) =>
    (effType === '全部类型' || o.type === effType) &&
    (platform === '全部平台' || o.platform === platform) &&
    (status === '全部状态' || o.status === status),
  ), [effType, platform, status]);

  const pages = Math.max(1, Math.ceil(orders.length / AS_PAGE));
  const cur = Math.min(page, pages);
  const slice = orders.slice((cur - 1) * AS_PAGE, cur * AS_PAGE);
  const nameOf = (code: string) => PRODUCT_CODES.find((c) => c.code === code)?.name ?? '';

  return (
    <>
      <div className="qc-panel" style={{ marginBottom: 12 }}>
        <div className="p-title">售后类型命中统计 <span className="p-sub">共 {total} 单 · 统计与明细同源</span></div>
        <div className="as-rank">
          {ranking.map((r) => (
            <div className="as-rank-cell" key={r.type}>
              <div className="k">{r.type}</div>
              <div className="n">{r.count}</div>
              <div className="s">占比 {total ? pct(r.count / total) : '0%'} · 涉及 {r.codes} 个商品</div>
            </div>
          ))}
        </div>
      </div>
      <div className="qc-filters">
        <BubbleSelect className="input" style={{ width: 130 }} value={effType} onChange={(v) => { setType(v); setPage(1); }} options={['全部类型', ...types]} />
        <BubbleSelect className="input" style={{ width: 130 }} value={platform} onChange={(v) => { setPlatform(v); setPage(1); }} options={['全部平台', ...PLATFORMS]} />
        <BubbleSelect className="input" style={{ width: 130 }} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={['全部状态', ...AFTER_SALES_STATUSES]} />
        <span className="qc-count">共 {orders.length} 单</span>
      </div>
      <table className="table qc-wide">
        <thead>
          <tr>
            <th>售后单号</th>
            <th>商品编码 / 名称</th>
            <th>平台</th>
            <th>售后类型</th>
            <th>金额</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>关联聊天</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((o) => (
            <tr key={o.id}>
              <td style={{ color: 'var(--text-3)' }}><div>{o.id}</div><div className="cell-sub">订单 {o.orderId}</div></td>
              <td className="col-name"><div>{o.code}</div><div style={{ color: 'var(--text-3)', fontSize: 12 }}>{nameOf(o.code)}</div></td>
              <td><span className="plat-chip"><i className="platform-dot" style={{ background: PLATFORM_COLOR[o.platform] }} />{o.platform}</span><div className="cell-sub">{SHOP_NAME[o.platform]}</div></td>
              <td><span className={`tag ${o.type === '质量问题' ? 'red' : o.type === '描述不符' ? 'orange' : ''}`}>{o.type}</span></td>
              <td>¥{o.amount}</td>
              <td><span className={`tag ${o.status === '已驳回' ? 'red' : o.status === '已退款' ? 'green' : 'blue'}`}>{o.status}</span></td>
              <td style={{ color: 'var(--text-3)' }}>{o.appliedAt}</td>
              <td>{o.sessionId ? <span className="tag blue">{o.sessionId}</span> : <span style={{ color: 'var(--text-4)' }}>—</span>}</td>
            </tr>
          ))}
          {slice.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>无匹配售后单</td></tr>
          )}
        </tbody>
      </table>
      <div className="as-pager">
        <button className="btn" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>上一页</button>
        <span className="pg-info">{cur} / {pages}</span>
        <button className="btn" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>下一页</button>
      </div>
    </>
  );
}

/* ---------- 审核管理 ---------- */
export function ReviewManageView({ reviews, onOpen }: {
  reviews: Review[];
  onOpen: (code: string) => void;
}) {
  const [status, setStatus] = useState('全部状态');
  const [reviewer, setReviewer] = useState('全部审核人');
  const [pre, setPre] = useState('全部建议');

  const rows = useMemo(() => reviews.filter((r) =>
    (status === '全部状态' || r.status === status) &&
    (reviewer === '全部审核人' || (reviewer === '未指派' ? !r.reviewer : r.reviewer === reviewer)) &&
    (pre === '全部建议' || r.preReview === pre),
  ), [reviews, status, reviewer, pre]);

  const nameOf = (code: string) => PRODUCT_CODES.find((c) => c.code === code)?.name ?? '';

  return (
    <>
      <div className="qc-filters">
        <BubbleSelect className="input" style={{ width: 140 }} value={status} onChange={setStatus} options={['全部状态', ...REVIEW_STATUSES]} />
        <BubbleSelect className="input" style={{ width: 140 }} value={reviewer} onChange={setReviewer} options={['全部审核人', '未指派', ...OWNERS]} />
        <BubbleSelect className="input" style={{ width: 160 }} value={pre} onChange={setPre} options={['全部建议', ...PRE_REVIEWS]} />
        <span className="qc-count">共 {rows.length} 条审核记录</span>
      </div>
      <table className="table qc-wide">
        <thead>
          <tr>
            <th>商品编码 / 名称</th>
            <th>预审核建议</th>
            <th>预审核时间</th>
            <th>审核人</th>
            <th>审核状态</th>
            <th>提交时间</th>
            <th>审核意见 / 决定</th>
            <th style={{ width: 100 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <td className="col-name"><div>{r.code}</div><div style={{ color: 'var(--text-3)', fontSize: 12 }}>{nameOf(r.code)}</div></td>
              <td><PreReviewTag v={r.preReview} /></td>
              <td style={{ color: 'var(--text-3)' }}>{r.preReviewAt}</td>
              <td>{r.reviewer || <span style={{ color: 'var(--text-4)' }}>未指派</span>}</td>
              <td><ReviewStatusTag v={r.status} /></td>
              <td style={{ color: 'var(--text-3)' }}>{r.submittedAt}</td>
              <td style={{ color: 'var(--text-3)', maxWidth: 260 }}>
                {r.status === '已通过' && r.decision ? `决定：${r.decision}` : r.opinion || '—'}
              </td>
              <td>
                <div className="qc-op-col">
                  <a onClick={() => onOpen(r.code)}>{r.status === '已通过' || r.status === '已驳回' ? '复核' : '审核'}</a>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>无匹配审核记录</td></tr>
          )}
        </tbody>
      </table>
    </>
  );
}

/* ---------- 审核弹窗：证据摘要 + 指派 + 通过/驳回 ---------- */
export function ReviewModal({ review, onClose, onAssign, onDecide, notify }: {
  review: Review;
  onClose: () => void;
  onAssign: (code: string, reviewer: string) => void;
  onDecide: (code: string, ok: boolean, decision: ReviewDecision, opinion: string) => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}) {
  const code = PRODUCT_CODES.find((c) => c.code === review.code)!;
  const sessions = CHAT_SESSIONS.filter((s) => s.code === review.code);
  const hitCount = sessions.reduce((s, x) => s + x.hits.length, 0);
  const orders = AFTER_SALES_ORDERS.filter((o) => o.code === review.code);
  const total = code.afterSalesTypes.reduce((s, [, n]) => s + n, 0);
  const topType = code.afterSalesTypes[0];
  const aggRate = code.platforms.reduce((s, p) => s + p.orders * p.refundRate, 0) /
    Math.max(1, code.platforms.reduce((s, p) => s + p.orders, 0));

  const [decision, setDecision] = useState<ReviewDecision>(review.decision ?? (review.preReview === '建议标记垃圾品' ? '标记垃圾品' : '维持观察'));
  const [opinion, setOpinion] = useState('');

  const decide = (ok: boolean) => {
    if (!ok && !opinion.trim()) { notify('驳回必须填写审核意见', 'error'); return; }
    onDecide(review.code, ok, decision, opinion.trim());
  };

  return (
    <Modal
      title={`品控审核 · ${review.code}`}
      sub={`${code.name} · 系列 ${code.seriesCode}`}
      onClose={onClose}
      foot={
        <>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn danger" onClick={() => decide(false)}>驳 回</button>
          <button className="btn primary" onClick={() => decide(true)}>审核通过</button>
        </>
      }
    >
      <div className="qc-form">
        <div className="f-row">
          <div className="f-label">证据摘要</div>
          <div className="rv-evid">
            <div className="row"><span className="k">综合退款率</span><span className="v">{pct(aggRate)}</span></div>
            <div className="row"><span className="k">聊天命中</span><span className="v">{hitCount} 处 · {sessions.length} 个会话</span></div>
            <div className="row"><span className="k">售后 TOP 类型</span><span className="v">{topType ? `${topType[0]} ${topType[1]} 单（占比 ${total ? pct(topType[1] / total) : '0%'}）` : '—'}</span></div>
            <div className="row"><span className="k">售后单总量</span><span className="v">{orders.length} 单</span></div>
            <div className="row"><span className="k">系统预审核</span><span className="v"><PreReviewTag v={review.preReview} /> · {review.preReviewAt}</span></div>
          </div>
        </div>
        <div className="f-row">
          <div className="f-label">审核人（指派/转交）</div>
          <BubbleSelect
            className="input"
            value={review.reviewer || '未指派'}
            onChange={(v) => onAssign(review.code, v === '未指派' ? '' : v)}
            options={['未指派', ...OWNERS]}
          />
        </div>
        <div className="f-row">
          <div className="f-label">通过时决定</div>
          <div className="rv-decision">
            {(['标记垃圾品', '维持观察'] as ReviewDecision[]).map((d) => (
              <label key={d} className={`rv-opt ${decision === d ? 'on' : ''}`}>
                <input type="radio" checked={decision === d} onChange={() => setDecision(d)} />
                {d}
              </label>
            ))}
          </div>
        </div>
        <div className="f-row">
          <div className="f-label">审核意见（驳回必填）</div>
          <textarea className="input rv-opinion" placeholder="填写审核意见…" value={opinion} onChange={(e) => setOpinion(e.target.value)} />
        </div>
        {review.opinion && <div className="rv-last">上次意见：{review.opinion}</div>}
      </div>
    </Modal>
  );
}

export type { AfterSalesStatus };
