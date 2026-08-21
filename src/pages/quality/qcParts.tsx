/* =========================================================
   品控管理 v2 · 共享展示组件
   标签 / 平台矩阵 / 类型命中条 / 聊天会话气泡(问题高亮) / 诊断 / 任务弹窗
   ========================================================= */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  JUNK_TEXT,
  OWNERS,
  PLATFORMS,
  PRODUCT_CODES,
  SEVERITY_TEXT,
  SHOP_NAME,
  TASK_STATUS_TEXT,
  hitTypesOf,
  pct,
  rateCls,
  severityOf,
  suggestionsOf,
  type AggStat,
  type ChatHit,
  type ChatSession,
  type JunkStatus,
  type Platform,
  type PlatformStat,
  type PreReview,
  type ProductCodeRow,
  type ReviewStatus,
  type TaskStatus,
} from './data';
import { QC_PROBLEM_TYPES } from './qcCenterData';
import { IconArrow, IconX, Modal } from '../permission/shared';
import BubbleSelect from '../../components/BubbleSelect';

/* ---------- 平台官方图标（品控中心平台展示统一入口） ---------- */
export const PLATFORM_LOGO: Record<Platform, string> = {
  抖音: '/logos/douyin.png',
  快手: '/logos/kuaishou.png',
  拼多多: '/logos/pinduoduo.png',
  淘宝: '/logos/taobao.png',
  天猫: '/logos/tmall.png',
  京东: '/logos/jd.png',
};

/** 平台官方图标（替代彩色圆点，自身即具辨识度）；off = 未覆盖/无数据时置灰 */
export function PlatLogo({ platform, off }: { platform: Platform; off?: boolean }) {
  return <img className={`plat-logo${off ? ' off' : ''}`} src={PLATFORM_LOGO[platform]} alt={platform} />;
}

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
            <PlatLogo platform={pl} off={!on} />
            {pl}
          </span>
        );
      })}
    </div>
  );
}

/* ---------- 平台数据矩阵 ---------- */
export function PlatformMatrix({ stats, threshold, problemHits, showLastOrder = true, onChat, onTrend }: {
  stats: PlatformStat[];
  threshold: number;
  /** 各平台命中问题类型（类型 + 次数，降序） */
  problemHits?: Partial<Record<Platform, [string, number][]>>;
  /** 是否展示最近订单列 */
  showLastOrder?: boolean;
  /** 提供时展示操作列：聊天记录 */
  onChat?: (platform: Platform) => void;
  /** 提供时展示操作列：趋势图（平台维度） */
  onTrend?: (stat: PlatformStat) => void;
}) {
  const map = new Map(stats.map((s) => [s.platform, s]));
  return (
    <table className="matrix">
      <thead>
        <tr>
          <th>平台</th>
          <th style={{ width: 90 }}>订单量</th>
          <th style={{ width: 90 }}>退款率</th>
          <th style={{ width: 90 }}>售后单</th>
          <th style={{ width: 100 }}>聊天风险</th>
          <th style={{ width: 90 }}>聊天风险率</th>
          <th>命中问题类型</th>
          {showLastOrder && <th>最近订单</th>}
          {(onChat || onTrend) && <th style={{ width: 90 }}>操作</th>}
        </tr>
      </thead>
      <tbody>
        {PLATFORMS.map((pl) => {
          const s = map.get(pl);
          const hits = problemHits?.[pl];
          return (
            <tr key={pl} className={s ? '' : 'off'}>
              <td>
                <span className="plat-chip">
                  <PlatLogo platform={pl} off={!s} />
                  {pl}
                </span>
              </td>
              <td>{s ? s.orders.toLocaleString() : '—'}</td>
              <td>{s ? <span className={`rate ${rateCls(s.refundRate, threshold)}`}>{pct(s.refundRate)}</span> : '—'}</td>
              <td>{s ? s.afterSales : '—'}</td>
              <td>{s ? (s.chatRisks ? <span className="rate bad">{s.chatRisks}</span> : 0) : '—'}</td>
              <td>{s ? (s.orders ? pct(s.chatRisks / s.orders) : '0.0%') : '—'}</td>
              <td>
                {s && hits?.length ? <ProbTags hits={hits} /> : '—'}
              </td>
              {showLastOrder && <td style={{ color: 'var(--text-3)' }}>{s ? s.lastOrderAt : '—'}</td>}
              {(onChat || onTrend) && (
                <td>
                  {s ? (
                    <div className="qc-op-col">
                      {onChat && <a className="op-a" onClick={() => onChat(pl)}>聊天记录</a>}
                      {onTrend && <a className="op-a" onClick={() => onTrend(s)}>趋势图</a>}
                    </div>
                  ) : '—'}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------- 命中问题类型：全量标签，内容多时换行展示（只增行高、不产生横向滚动） ---------- */
export function ProbTags({ hits }: { hits: [string, number][] }) {
  const tagCls = (t: string) => `tag ${t === '质量问题' ? 'red' : t === '描述不符' ? 'orange' : ''}`;
  /* 默认展示最多的三个，超出折叠为 +N，悬浮气泡展示全部 */
  const shown = hits.slice(0, 3);
  const rest = hits.slice(3);
  return (
    <div className="prob-tags">
      {shown.map(([t, n]) => (
        <span key={t} className={tagCls(t)}>{t} {n}</span>
      ))}
      {rest.length > 0 && (
        <span className="tag prob-more">
          +{rest.length}
          <span className="prob-bubble">
            {hits.map(([t, n]) => (
              <span key={t} className={tagCls(t)}>{t} {n}</span>
            ))}
          </span>
        </span>
      )}
    </div>
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
  const phrases = s.hits.map((h) => h.phrase).filter(Boolean);
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
          <div className={`bubble-row ${m.role === 'buyer' ? 'buyer' : 'support'}${m.role === 'ai' ? ' ai' : ''}`} key={i}>
            <div className="b-av">{m.role === 'buyer' ? '买' : m.role === 'ai' ? 'AI' : '服'}</div>
            <div className="b-main">
              <div className="b-meta">{m.role === 'buyer' ? '买家' : m.role === 'ai' ? 'AI 回复' : '客服'} · {m.time}</div>
              <div className="b-text">{highlight(m.text, phrases)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 会话卡片（头部命中类型 + 气泡） ---------- */
export function SessionCard({ s, orders, onFullScreen, onUpdateHits }: {
  s: ChatSession;
  orders: string[];
  /** 提供时全屏交给父级（支持同编码会话切换 / 命中修改闭环） */
  onFullScreen?: () => void;
  onUpdateHits?: (id: string, hits: ChatHit[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  /* 命中修改未上提父级时的卡片内兜底状态 */
  const [localHits, setLocalHits] = useState(s.hits);
  const cur = onUpdateHits ? s : { ...s, hits: localHits };
  return (
    <div className="session-card">
      <div className="s-head" onClick={() => setOpen((v) => !v)}>
        <span className={`arrow ${open ? 'open' : ''}`} style={{ display: 'inline-flex' }}><IconArrow /></span>
        <span className="plat-chip"><PlatLogo platform={cur.platform} />{cur.platform}</span>
        <span className="s-meta"><i>店铺</i>{SHOP_NAME[cur.platform]}</span>
        <span className="s-meta"><i>会话编号</i><b className="s-id">{cur.id}</b></span>
        <span className="s-meta"><i>会话时间</i>{cur.startedAt}</span>
        <span className="s-meta"><i>关联订单</i>{cur.orderId}</span>
        <span className="s-meta"><i>消息数</i>{cur.messages.length} 条</span>
        {cur.hits.length ? (
          <span className="s-hits">{hitTypesOf(cur).map((t) => <span className="tag red" key={t}>{t}</span>)}</span>
        ) : (
          <span className="tag green">无命中</span>
        )}
        <span className="s-right">
          {orders.length > 0 && <span className="s-orders">关联售后单 {orders.length}</span>}
          <span className="s-expand" onClick={(e) => { e.stopPropagation(); if (onFullScreen) onFullScreen(); else setFull(true); }}>全屏查看 ↗</span>
        </span>
      </div>
      {open && <SessionBubbles s={cur} />}
      {full && !onFullScreen && (
        <ChatFullModal
          sessions={[cur]}
          currentId={cur.id}
          onNav={() => {}}
          onClose={() => setFull(false)}
          onUpdateHits={(_id, h) => setLocalHits(h)}
        />
      )}
    </div>
  );
}

/* ---------- 聊天全屏弹窗（头部对齐预览卡 · 同编码会话切换 · 命中类型修改） ---------- */
export function ChatFullModal({ sessions, currentId, onNav, onClose, onUpdateHits }: {
  sessions: ChatSession[];
  currentId: string;
  onNav: (id: string) => void;
  onClose: () => void;
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
}) {
  const s = sessions.find((x) => x.id === currentId);
  /* 上一个/下一个仅链式切换当前编码的会话 */
  const chain = useMemo(() => (s ? sessions.filter((x) => x.code === s.code) : []), [sessions, s]);
  const idx = chain.findIndex((x) => x.id === currentId);
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!addOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [addOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && idx > 0) onNav(chain[idx - 1].id);
      else if (e.key === 'ArrowRight' && idx < chain.length - 1) onNav(chain[idx + 1].id);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [idx, chain, onNav, onClose]);
  if (!s) return null;
  const types = hitTypesOf(s);
  const addable = QC_PROBLEM_TYPES.filter((t) => !types.includes(t));
  return (
    <div className="chat-modal-mask" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-head">
          <span className="plat-chip"><PlatLogo platform={s.platform} />{s.platform}</span>
          <span className="s-meta"><i>店铺</i>{SHOP_NAME[s.platform]}</span>
          <span className="s-meta"><i>会话编号</i><b className="s-id">{s.id}</b></span>
          <span className="s-meta"><i>会话时间</i>{s.startedAt}</span>
          <span className="s-meta"><i>关联订单</i>{s.orderId}</span>
          <span className="s-meta"><i>消息数</i>{s.messages.length} 条</span>
          <span className="x" onClick={onClose}><IconX /></span>
        </div>
        <div className="cm-hits">
          <span className="cm-hits-label">命中问题类型</span>
          {types.length ? types.map((t) => (
            <span className="tag red" key={t}>
              {t}
              <i className="cm-x" title="移除该问题类型" onClick={() => onUpdateHits(s.id, s.hits.filter((h) => h.type !== t))}>×</i>
            </span>
          )) : <span className="tag green">无命中</span>}
          <span className="cm-add" ref={addRef}>
            <a onClick={() => setAddOpen((v) => !v)}>+ 添加</a>
            {addOpen && (
              <span className="cm-add-pop">
                {addable.length ? addable.map((t) => (
                  <a key={t} onClick={() => { onUpdateHits(s.id, [...s.hits, { type: t, phrase: '' }]); setAddOpen(false); }}>{t}</a>
                )) : <span className="cm-none">已添加全部类型</span>}
              </span>
            )}
          </span>
        </div>
        <div className="chat-modal-body">
          <SessionBubbles s={s} />
        </div>
        <div className="chat-modal-foot">
          <div className="cm-nav">
            <button type="button" disabled={idx <= 0} onClick={() => onNav(chain[idx - 1].id)}>‹ 上一个</button>
            <span className="cm-idx">{idx + 1} / {chain.length}</span>
            <button type="button" disabled={idx >= chain.length - 1} onClick={() => onNav(chain[idx + 1].id)}>下一个 ›</button>
          </div>
        </div>
      </div>
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
