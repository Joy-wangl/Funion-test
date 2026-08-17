/* =========================================================
   品控管理 v2 · 共享展示组件
   标签 / 平台矩阵 / 类型命中条 / 聊天会话气泡(问题高亮) / 诊断 / 任务弹窗
   ========================================================= */
import { useState, type ReactNode } from 'react';
import {
  JUNK_TEXT,
  OWNERS,
  PLATFORMS,
  PLATFORM_COLOR,
  PRODUCT_CODES,
  SEVERITY_TEXT,
  SHOP_NAME,
  TASK_STATUS_TEXT,
  pct,
  rateCls,
  severityOf,
  suggestionsOf,
  type AggStat,
  type ChatSession,
  type JunkStatus,
  type PlatformStat,
  type PreReview,
  type ProductCodeRow,
  type ReviewStatus,
  type TaskStatus,
} from './data';
import { IconArrow, Modal } from '../permission/shared';
import BubbleSelect from '../../components/BubbleSelect';

/* ---------- 品控状态标签 ---------- */
export function StatusTag({ status }: { status: JunkStatus }) {
  const cls = status === 'junk' ? 'red' : status === 'suspect' ? 'orange' : 'green';
  return <span className={`tag ${cls}`}>{JUNK_TEXT[status]}</span>;
}

/* ---------- 审核三维度标签 ---------- */
export function PreReviewTag({ v }: { v: PreReview }) {
  const cls = v === '建议标记垃圾品' ? 'red' : v === '建议优化' ? 'orange' : 'green';
  return <span className={`tag ${cls}`}>{v}</span>;
}

export function ReviewStatusTag({ v }: { v: ReviewStatus }) {
  const cls = v === '已通过' ? 'green' : v === '已驳回' ? 'red' : v === '审核中' ? 'blue' : '';
  return <span className={`tag rv ${cls}`}>{v}</span>;
}

/* ---------- 平台覆盖 chips ---------- */
export function PlatformChips({ platforms }: { platforms: string[] }) {
  return (
    <div className="plat-chips">
      {PLATFORMS.map((pl) => {
        const on = platforms.includes(pl);
        return (
          <span key={pl} className={`plat-chip ${on ? '' : 'off'}`}>
            <i className="platform-dot" style={{ background: on ? PLATFORM_COLOR[pl] : '#d5d9e0' }} />
            {pl}
          </span>
        );
      })}
    </div>
  );
}

/* ---------- 平台数据矩阵 ---------- */
export function PlatformMatrix({ stats, threshold }: { stats: PlatformStat[]; threshold: number }) {
  const map = new Map(stats.map((s) => [s.platform, s]));
  return (
    <table className="matrix">
      <thead>
        <tr>
          <th>平台</th>
          <th>商品ID</th>
          <th style={{ width: 90 }}>订单量</th>
          <th style={{ width: 90 }}>退款率</th>
          <th style={{ width: 90 }}>售后单</th>
          <th style={{ width: 100 }}>聊天风险</th>
          <th>最近订单</th>
        </tr>
      </thead>
      <tbody>
        {PLATFORMS.map((pl) => {
          const s = map.get(pl);
          return (
            <tr key={pl} className={s ? '' : 'off'}>
              <td>
                <span className="plat-chip">
                  <i className="platform-dot" style={{ background: s ? PLATFORM_COLOR[pl] : '#d5d9e0' }} />
                  {pl}
                </span>
              </td>
              <td style={{ color: 'var(--text-3)' }}>{s ? s.productIds.join('、') : '—'}</td>
              <td>{s ? s.orders.toLocaleString() : '—'}</td>
              <td>{s ? <span className={`rate ${rateCls(s.refundRate, threshold)}`}>{pct(s.refundRate)}</span> : '—'}</td>
              <td>{s ? s.afterSales : '—'}</td>
              <td>{s ? (s.chatRisks ? <span className="rate bad">{s.chatRisks}</span> : 0) : '—'}</td>
              <td style={{ color: 'var(--text-3)' }}>{s ? s.lastOrderAt : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------- 售后类型命中条（类型 + 次数 + 占比条） ---------- */
export function TypeBars({ types, total }: { types: [string, number][]; total: number }) {
  return (
    <div className="type-bars">
      {types.map(([t, n]) => (
        <div className="tb-row" key={t}>
          <span className={`tag ${t === '质量问题' ? 'red' : t === '描述不符' ? 'orange' : ''}`}>{t}</span>
          <div className="tb-bar"><i style={{ width: total ? `${Math.round((n / total) * 100)}%` : 0 }} /></div>
          <span className="tb-cnt">{n} 次</span>
          <span className="tb-pct">{total ? pct(n / total) : '0%'}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 聊天会话气泡（命中短语高亮） ---------- */
export function highlight(text: string, phrases: string[]): ReactNode[] {
  if (!phrases.length) return [text];
  const parts: ReactNode[] = [text];
  [...phrases].sort((a, b) => b.length - a.length).forEach((ph) => {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (typeof p !== 'string') continue;
      const idx = p.indexOf(ph);
      if (idx < 0) continue;
      parts.splice(i, 1, p.slice(0, idx), <mark key={`${ph}-${i}`}>{ph}</mark>, p.slice(idx + ph.length));
      i += 2;
    }
  });
  return parts;
}

export function SessionBubbles({ s }: { s: ChatSession }) {
  const [hitsOnly, setHitsOnly] = useState(false);
  const phrases = s.hits.map((h) => h.phrase);
  const hitMsgs = s.messages.filter((m) => phrases.some((p) => m.text.includes(p)));
  const msgs = hitsOnly ? hitMsgs : s.messages;
  return (
    <div className="session-bubbles">
      {s.hits.length > 0 && (
        <div className="b-toggle">
          <a onClick={(e) => { e.preventDefault(); setHitsOnly((v) => !v); }}>
            {hitsOnly ? `查看完整会话（${s.messages.length} 条）` : `只看命中（${hitMsgs.length} 条）`}
          </a>
        </div>
      )}
      <div className="b-list">
        {msgs.map((m, i) => (
          <div className={`bubble-row ${m.role}`} key={i}>
            <div className="b-av">{m.role === 'buyer' ? '买' : '服'}</div>
            <div className="b-main">
              <div className="b-meta">{m.role === 'buyer' ? '买家' : '客服'} · {m.time}</div>
              <div className="b-text">{highlight(m.text, phrases)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 会话卡片（头部命中类型 + 气泡） ---------- */
export function SessionCard({ s, orders }: { s: ChatSession; orders: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="session-card">
      <div className="s-head" onClick={() => setOpen((v) => !v)}>
        <span className={`arrow ${open ? 'open' : ''}`} style={{ display: 'inline-flex' }}><IconArrow /></span>
        <span className="plat-chip"><i className="platform-dot" style={{ background: PLATFORM_COLOR[s.platform] }} />{s.platform}</span>
        <span className="s-shop">{SHOP_NAME[s.platform]}</span>
        <span className="s-id">{s.id}</span>
        <span className="s-time">{s.startedAt}</span>
        <span className="s-order">订单 {s.orderId}</span>
        <span className="s-msgs">{s.messages.length} 条消息</span>
        {s.hits.length ? (
          <span className="s-hits">{[...new Set(s.hits.map((h) => h.type))].map((t) => <span className="tag red" key={t}>{t}</span>)}</span>
        ) : (
          <span className="tag green">无命中</span>
        )}
        {orders.length > 0 && <span className="s-orders">关联售后单 {orders.length}</span>}
      </div>
      {open && <SessionBubbles s={s} />}
    </div>
  );
}

/* ---------- 任务状态标签 ---------- */
export function TaskStatusTag({ status }: { status: TaskStatus }) {
  const cls = status === 'doing' ? 'blue' : status === 'verifying' ? 'orange' : status === 'closed' ? 'green' : '';
  return <span className={`tag ${cls}`}>{TASK_STATUS_TEXT[status]}</span>;
}

/* ---------- 问题诊断与优化建议（聊天证据取自会话命中） ---------- */
export function ProblemDiagnosis({ view, onCreateTask }: {
  view: { code: ProductCodeRow; agg: AggStat };
  onCreateTask: (problemType: string, action: string) => void;
}) {
  const total = view.agg.afterSales;
  return (
    <div>
      {view.code.afterSalesTypes.map(([type, count]) => {
        const sev = severityOf(type, count, total);
        return (
          <div className="prob-item" key={type}>
            <div className="prob-head">
              <span className={`tag ${sev === 'severe' ? 'red' : sev === 'medium' ? 'orange' : ''}`}>{SEVERITY_TEXT[sev]}</span>
              <span className="prob-type">{type}</span>
              <span className="prob-cnt">售后单 {count} 单 · 占比 {total ? pct(count / total) : '0%'}</span>
            </div>
            {(suggestionsOf(type)).map((s) => (
              <div className="sugg-chip" key={s}>
                <span>{s}</span>
                <a onClick={() => onCreateTask(type, s)}>创建任务</a>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 创建优化任务弹窗 ---------- */
export function CreateTaskModal({ initial, onClose, onSubmit, notify, allTypes }: {
  initial: { code?: string; problemType?: string; action?: string };
  onClose: () => void;
  onSubmit: (p: { code: string; problemType: string; action: string; owner: string; deadline: string }) => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
  allTypes?: string[];
}) {
  const [code, setCode] = useState(initial.code || PRODUCT_CODES[0].code);
  const row = PRODUCT_CODES.find((c) => c.code === code)!;
  const types = [...new Set([...row.afterSalesTypes.map(([t]) => t), ...(allTypes ?? [])])];
  const [problemType, setProblemType] = useState(initial.problemType || types[0]);
  const suggs = suggestionsOf(problemType);
  const [action, setAction] = useState(initial.action || suggs[0]);
  const [owner, setOwner] = useState(OWNERS[0]);
  const [deadline, setDeadline] = useState('2026-08-21');

  const changeCode = (c: string) => {
    setCode(c);
    const r = PRODUCT_CODES.find((x) => x.code === c)!;
    const t0 = r.afterSalesTypes[0][0];
    setProblemType(t0);
    setAction(suggestionsOf(t0)[0] || '');
  };

  const submit = () => {
    if (!deadline) { notify('请填写截止日期', 'error'); return; }
    onSubmit({ code, problemType, action, owner, deadline });
  };

  return (
    <Modal
      title="新建优化任务"
      sub={`针对 ${code} 的品控问题创建优化任务`}
      onClose={onClose}
      foot={
        <>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={submit}>创建任务</button>
        </>
      }
    >
      <div className="qc-form">
        <div className="f-row">
          <div className="f-label">商品编码</div>
          <BubbleSelect
            className="input"
            value={code}
            onChange={changeCode}
            disabled={!!initial.code}
            options={PRODUCT_CODES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))}
          />
        </div>
        <div className="f-row">
          <div className="f-label">问题类型</div>
          <BubbleSelect
            className="input"
            value={problemType}
            onChange={(v) => {
              setProblemType(v);
              setAction(suggestionsOf(v)[0] || '');
            }}
            options={types}
          />
        </div>
        <div className="f-row">
          <div className="f-label">优化动作</div>
          <BubbleSelect className="input" value={action} onChange={setAction} options={suggs} />
        </div>
        <div className="f-row two">
          <div>
            <div className="f-label">负责人</div>
            <BubbleSelect className="input" value={owner} onChange={setOwner} options={OWNERS} />
          </div>
          <div>
            <div className="f-label">截止日期</div>
            <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
