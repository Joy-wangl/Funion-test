/* =========================================================
   聚合接待 · 视图①「宝妈接待」表格页（面包屑：基础数据 › 客服管理）
   多公司树形表：公司父行（可展开）→ 分组标签 → 成员子表
   筛选 / 分页（按公司行）/ 导出 / 转移会话
   ========================================================= */
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  RC_COMPANY, RC_COMPANIES, RC_COMPANY_GROUPS, RC_ALL_GROUPS,
  RC_GROUP_STRATEGY_INIT, RC_STRATEGIES,
  rcAgentLabel, rcCompanySumOf, rcCsvOf, rcHoursLabel, rcMonitorOf, rcOrderOf, rcSalesLabel, rcTimeoutOf, type RcAgent,
} from './data';
import { Modal } from '../permission/shared';
import BubbleSelect from '../../components/BubbleSelect';
import MoreActions from '../../components/MoreActions';

interface Props {
  agents: RcAgent[];
  setAgents: React.Dispatch<React.SetStateAction<RcAgent[]>>;
  toggleAgentStrategy: (id: number) => void;
  pushToast: (msg: string, type?: 'success' | 'error') => void;
  /** 关联策略点击：跳转智能分流页并打开对应策略卡抽屉 */
  onGoStrategy: (cardId: number) => void;
}

type Filter = { company: string; group: string; name: string; status: string };
const EMPTY_FILTER: Filter = { company: '', group: '', name: '', status: '' };

/** 子表可排序数值列 */
type SortKey = 'sessions' | 'aiRate' | 'resp' | 'unreplied' | 'r3m' | 'r30s' | 'hours' | 'rank' | 'conv' | 'sales' | 'refund';
const sortValOf = (a: RcAgent, k: SortKey): number => {
  switch (k) {
    case 'sessions': return a.human + a.ai;
    case 'aiRate': return aiRateOf(a.ai, a.human);
    case 'resp': return a.resp;
    case 'unreplied': return a.unreplied;
    case 'r3m': return a.r3m;
    case 'r30s': return a.r30s;
    case 'hours': return a.hours;
    case 'rank': return a.rank;
    case 'conv': return rcOrderOf(a).conv;
    case 'sales': return rcOrderOf(a).sales;
    case 'refund': return rcOrderOf(a).refund;
  }
};

const STATUS_CLS: Record<string, string> = { 在线: 'rc-st on', 小休: 'rc-st rest', 离线: 'rc-st off' };

/** AI 回复占比 = AI 回复数 ÷ 总会话数（人工+AI） */
const aiRateOf = (ai: number, human: number) => (ai + human > 0 ? Math.round((ai / (ai + human)) * 100) : 0);

/** 饼图扇形 path（起/止角为弧度） */
const piePath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const x0 = (cx + r * Math.cos(a0)).toFixed(3);
  const y0 = (cy + r * Math.sin(a0)).toFixed(3);
  const x1 = (cx + r * Math.cos(a1)).toFixed(3);
  const y1 = (cy + r * Math.sin(a1)).toFixed(3);
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
};

export default function AgentTable({
  agents, setAgents, toggleAgentStrategy, pushToast, onGoStrategy,
}: Props) {
  const [draft, setDraft] = useState<Filter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<Filter>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sel, setSel] = useState<Set<number>>(new Set());
  /** 各公司行展开状态（默认展开宝妈） */
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({ [RC_COMPANY]: true });
  /** 各公司子表分组维度标签 */
  const [tabMap, setTabMap] = useState<Record<string, string>>({});
  /** 分组级策略总开关（key: 公司::分组；关闭后组内客服不可开启） */
  const [groupStrategy, setGroupStrategy] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    RC_COMPANIES.forEach((c) => (RC_COMPANY_GROUPS[c] ?? []).forEach((g) => {
      m[`${c}::${g}`] = RC_GROUP_STRATEGY_INIT[g] ?? true;
    }));
    return m;
  });
  /** 子表「接待状态」列头筛选菜单 */
  const [statusMenu, setStatusMenu] = useState(false);
  /** 子表列头排序（默认降序，再点切换升/降） */
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir('desc'); }
    else if (sortDir === 'desc') setSortDir('asc');
    else { setSortKey(null); setSortDir('desc'); }
  };
  const thSort = (k: SortKey, label: string) => (
    <th className={`rc-th-sort ${sortKey === k ? 'on' : ''}`} onClick={() => toggleSort(k)}>
      {label}
      <span className="rc-sort-ico">{sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : '⇅'}</span>
    </th>
  );
  const [transfer, setTransfer] = useState<{ mode: 'single'; agent: RcAgent } | { mode: 'batch' } | null>(null);
  /** 转移目标级联选择：组 或 组内成员（单选） */
  const [pick, setPick] = useState<{ kind: 'group'; group: string } | { kind: 'agent'; id: number } | null>(null);
  /** 级联：右栏当前预览的分组（默认第一组） */
  const [cascActive, setCascActive] = useState<string>(RC_COMPANY_GROUPS[RC_COMPANY]?.[0] ?? '');
  /** 值班监控弹窗（操作列点击） */
  const [monitor, setMonitor] = useState<RcAgent | null>(null);
  /** 值班监控饼图 tab：值班/登录/WS */
  const [monTab, setMonTab] = useState<'duty' | 'login' | 'ws'>('duty');

  const filtered = useMemo(() => agents.filter((a) => {
    if (applied.company !== '' && a.company !== applied.company) return false;
    if (applied.group !== '' && a.group !== applied.group) return false;
    if (applied.name !== '' && !a.name.includes(applied.name)) return false;
    if (applied.status !== '' && a.status !== applied.status) return false;
    return true;
  }), [agents, applied]);

  /* 外层公司行（公司筛选后），分页按公司行数 */
  const companies = useMemo(
    () => RC_COMPANIES.filter((c) => applied.company === '' || c === applied.company),
    [applied.company],
  );
  const pages = Math.max(1, Math.ceil(companies.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageCompanies = companies.slice((safePage - 1) * pageSize, safePage * pageSize);

  /** 展开子表行：本公司 + 分组标签 + 名称/状态筛选 */
  const rowsOf = (c: string) => {
    const tab = tabMap[c] ?? 'all';
    return filtered.filter((a) => a.company === c && (tab === 'all' || a.group === tab));
  };

  const idsOf = (list: RcAgent[]) => list.map((a) => a.id);
  const toggleIds = (ids: number[]) => setSel((s) => {
    const next = new Set(s);
    const all = ids.length > 0 && ids.every((id) => next.has(id));
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
    return next;
  });
  const toggleOne = (id: number) => setSel((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  /** 分组级策略总开关：关闭后组内客服统一停用且不可开启（个人设置保留，开启后恢复） */
  const toggleGroupStrategy = (c: string, tab: string) => {
    const key = `${c}::${tab}`;
    const next = !groupStrategy[key];
    setGroupStrategy((v) => ({ ...v, [key]: next }));
    pushToast(`已${next ? '启用' : '禁用'}「${tab}」的策略状态${next ? '，组内客服策略已恢复' : '，组内客服已同步停用'}`);
  };

  const openTransfer = (t: typeof transfer) => {
    setPick(null);
    setTransfer(t);
  };

  /** Esc：关闭转移会话 / 值班监控弹窗 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setTransfer(null); setMonitor(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- 导出 / 批量分流 ---------- */
  const doExport = () => {
    if (!filtered.length) { pushToast('暂无数据可导出', 'error'); return; }
    const blob = new Blob([rcCsvOf(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '宝妈接待-客服数据.csv';
    link.click();
    URL.revokeObjectURL(url);
    pushToast(`已导出 ${filtered.length} 条数据`);
  };
  const doBatchRoute = () => {
    if (sel.size === 0) { pushToast('请先勾选需要批量转移会话的客服', 'error'); return; }
    openTransfer({ mode: 'batch' });
  };

  /* ---------- 转移会话确认 ---------- */
  const confirmTransfer = () => {
    if (!transfer) return;
    if (!pick) { pushToast('请选择转移客服', 'error'); return; }
    const sources = transfer.mode === 'single' ? [transfer.agent] : agents.filter((a) => sel.has(a.id));
    const n = sources.reduce((t, a) => t + a.unreplied, 0);
    if (n === 0) { pushToast('暂无会话可转移', 'error'); return; }
    const targetName = pick.kind === 'group' ? pick.group : (agents.find((a) => a.id === pick.id)?.name ?? '');
    setAgents((v) => v.map((a) => (sources.some((s) => s.id === a.id) ? { ...a, unreplied: 0 } : a)));
    pushToast(`已将 ${n} 个会话转移给「${targetName}」`);
    setTransfer(null);
    if (transfer.mode === 'batch') setSel(new Set());
  };

  return (
    <div className="rc-view">
      <div className="qc-body rc-table-card">
        {/* 筛选区 */}
        <div className="qc-filters rc-filter-row">
          <BubbleSelect
            className="input rc-bs"
            value={draft.company || '公司'}
            onChange={(v) => setDraft((d) => ({ ...d, company: v }))}
            options={[...RC_COMPANIES]}
          />
          <BubbleSelect
            className="input rc-bs"
            value={draft.group || '分组'}
            onChange={(v) => setDraft((d) => ({ ...d, group: v }))}
            options={[...RC_ALL_GROUPS]}
          />
          <input
            className="input rc-input"
            placeholder="请输入客服名称"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { setApplied(draft); setPage(1); } }}
          />
          <BubbleSelect
            className="input rc-bs"
            value={draft.status || '接待状态'}
            onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
            options={['在线', '小休', '离线']}
          />
          <div className="rc-actions">
            <button type="button" className="btn primary" onClick={() => { setApplied(draft); setPage(1); }}>查询</button>
            <button type="button" className="btn" onClick={() => { setDraft(EMPTY_FILTER); setApplied(EMPTY_FILTER); setPage(1); pushToast('筛选条件已重置'); }}>重置</button>
            <button type="button" className="btn" onClick={doExport}>导出</button>
            <button type="button" className="btn" onClick={doBatchRoute}>批量转移会话</button>
          </div>
        </div>

        {/* 树形表格：公司父行 × N */}
        <div className="rc-wide">
          <table className="table rc-tree">
            <thead>
              <tr>
                <th className="check" />
                <th>所属公司</th>
                <th>接待会话数</th>
                <th>接待数据(条)</th>
                <th>AI回复平均占比</th>
                <th>平均均响</th>
                <th>未回复</th>
                <th>3分钟平均回复率</th>
                <th>30秒平均响应率</th>
                <th>平均转化率</th>
                <th>销售额</th>
                <th>平均退款率</th>
                <th>平均在线时长</th>
                <th>接待排名</th>
              </tr>
            </thead>
            <tbody>
              {pageCompanies.map((c) => {
                const open = !!openMap[c];
                const sum = rcCompanySumOf(c, filtered);
                const cIds = idsOf(filtered.filter((a) => a.company === c));
                const rowsRaw = rowsOf(c);
                const rows = sortKey
                  ? [...rowsRaw].sort((x, y) => (sortDir === 'desc'
                    ? sortValOf(y, sortKey) - sortValOf(x, sortKey)
                    : sortValOf(x, sortKey) - sortValOf(y, sortKey)))
                  : rowsRaw;
                const rIds = idsOf(rows);
                const allRows = rIds.length > 0 && rIds.every((id) => sel.has(id));
                const someRows = rIds.some((id) => sel.has(id));
                const tab = tabMap[c] ?? 'all';
                return (
                  <Fragment key={c}>
                    <tr className="rc-row-company">
                      <td className="check">
                        <span
                          className={`rc-caret ${open ? 'open' : ''}`}
                          title="展开/收起"
                          onClick={() => setOpenMap((v) => ({ ...v, [c]: !open }))}
                        >▾</span>
                        <input
                          type="checkbox"
                          title={`全选/清空${c}客服`}
                          checked={cIds.length > 0 && cIds.every((id) => sel.has(id))}
                          onChange={() => toggleIds(cIds)}
                        />
                      </td>
                      <td><b>{c}</b></td>
                      <td>{sum.human + sum.ai}</td>
                      <td>
                        <div className="rc-duo"><span className="tag green rc-tagw">人工</span>{sum.human}</div>
                        <div className="rc-duo"><span className="tag orange rc-tagw">AI</span>{sum.ai}</div>
                      </td>
                      <td>{aiRateOf(sum.ai, sum.human)}%</td>
                      <td>{sum.resp}s</td>
                      <td>{sum.unreplied}</td>
                      <td>{sum.r3m}%</td>
                      <td>{sum.r30s}%</td>
                      <td>{sum.conv}%</td>
                      <td>{rcSalesLabel(sum.sales)}</td>
                      <td>{sum.refund}%</td>
                      <td>{sum.hours}</td>
                      <td>{sum.rank}</td>
                    </tr>
                    {open ? (
                      <tr className="expand-row">
                        <td colSpan={14}>
                          <div className="rc-expand-head">
                          <div className="qc-range-toggle rc-group-tabs">
                            <button
                              type="button"
                              className={tab === 'all' ? 'active' : ''}
                              onClick={() => setTabMap((v) => ({ ...v, [c]: 'all' }))}
                            >全部</button>
                            {(RC_COMPANY_GROUPS[c] ?? []).map((g) => (
                              <button
                                key={g}
                                type="button"
                                className={tab === g ? 'active' : ''}
                                onClick={() => setTabMap((v) => ({ ...v, [c]: g }))}
                              >{g}</button>
                            ))}
                          </div>
                          {tab !== 'all' ? (
                            <div className="rc-group-strategy">
                              <span>策略状态</span>
                              <span
                                className={`rc-switch ${groupStrategy[`${c}::${tab}`] ? 'on' : ''}`}
                                title={`启用/禁用${tab}策略`}
                                onClick={() => toggleGroupStrategy(c, tab)}
                              ><i /></span>
                            </div>
                          ) : null}
                          </div>
                          <table className="matrix rc-sub">
                            <thead>
                              <tr>
                                <th className="check">
                                  <input type="checkbox" title="全选子表" checked={allRows} ref={(el) => { if (el) el.indeterminate = !allRows && someRows; }} onChange={() => toggleIds(rIds)} />
                                </th>
                                <th>客服</th>
                                <th className="rc-th-st">
                                  接待状态
                                  <span
                                    className={`rc-col-filter ${applied.status ? 'on' : ''}`}
                                    title="筛选接待状态"
                                    onClick={() => setStatusMenu((v) => !v)}
                                  >
                                    <svg viewBox="0 0 1024 1024" width="12" height="12" aria-hidden="true">
                                      <path fill="currentColor" d="M880 128H144c-13.3 0-20 16-10.7 25.4L416 448v320c0 12.7 10.3 23 23 23h146c12.7 0 23-10.3 23-23V448l282.7-294.6C900 144 893.3 128 880 128z" />
                                    </svg>
                                  </span>
                                  {statusMenu ? (
                                    <>
                                      <div className="rc-col-mask" onClick={() => setStatusMenu(false)} />
                                      <div className="rc-col-menu">
                                        {[{ v: '', t: '全部' }, { v: '在线', t: '在线' }, { v: '小休', t: '小休' }, { v: '离线', t: '离线' }].map((o) => (
                                          <div
                                            key={o.t}
                                            className={`rc-col-opt ${applied.status === o.v ? 'cur' : ''}`}
                                            onClick={() => {
                                              setDraft((d) => ({ ...d, status: o.v }));
                                              setApplied((f) => ({ ...f, status: o.v }));
                                              setPage(1);
                                              setStatusMenu(false);
                                            }}
                                          >{o.t}</div>
                                        ))}
                                      </div>
                                    </>
                                  ) : null}
                                </th>
                                {thSort('sessions', '接待会话数')}
                                <th>接待数据(条)</th>
                                {thSort('aiRate', 'AI回复占比')}
                                {thSort('resp', '均响')}
                                {thSort('unreplied', '未回复')}
                                <th>三分钟回复数据(条)</th>
                                {thSort('r3m', '3分钟回复率')}
                                {thSort('r30s', '30秒响应率')}
                                {thSort('conv', '转化率')}
                                {thSort('sales', '销售额')}
                                {thSort('refund', '退款率')}
                                {thSort('hours', '在线时长(h)')}
                                {thSort('rank', '接待排名')}
                                <th>策略状态</th>
                                <th>操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((a) => (
                                <tr key={a.id} className="rc-row-agent">
                                  <td className="check">
                                    <input type="checkbox" checked={sel.has(a.id)} onChange={() => toggleOne(a.id)} />
                                  </td>
                                  <td>{a.name}</td>
                                  <td><span className={STATUS_CLS[a.status]}>{a.status}</span></td>
                                  <td>{a.human + a.ai}</td>
                                  <td>
                                    <div className="rc-duo"><span className="tag green rc-tagw">人工</span>{a.human}</div>
                                    <div className="rc-duo"><span className="tag orange rc-tagw">AI</span>{a.ai}</div>
                                  </td>
                                  <td>{aiRateOf(a.ai, a.human)}%</td>
                                  <td>{a.resp}s</td>
                                  <td>{a.unreplied}</td>
                                  <td>
                                    <div className="rc-duo"><span className="tag green rc-tagw">未回复</span>{a.unreplied}</div>
                                    <div className="rc-duo"><span className="tag orange rc-tagw">超时</span>{rcTimeoutOf(a)}</div>
                                  </td>
                                  <td>{a.r3m}%</td>
                                  <td>{a.r30s}%</td>
                                  <td>{rcOrderOf(a).conv}%</td>
                                  <td>{rcSalesLabel(rcOrderOf(a).sales)}</td>
                                  <td>{rcOrderOf(a).refund}%</td>
                                  <td>{rcHoursLabel(a)}</td>
                                  <td>{a.rank}</td>
                                  <td>
                                    <span
                                      className={`rc-switch ${groupStrategy[`${a.company}::${a.group}`] ?? true ? (a.strategy ? 'on' : '') : 'disabled'}`}
                                      title={groupStrategy[`${a.company}::${a.group}`] ?? true ? '启用/禁用策略' : '分组策略已关闭，请先开启分组策略状态'}
                                      onClick={() => {
                                        if (!(groupStrategy[`${a.company}::${a.group}`] ?? true)) {
                                          pushToast('该分组策略已关闭，请先开启分组策略状态', 'error');
                                          return;
                                        }
                                        toggleAgentStrategy(a.id);
                                      }}
                                    ><i /></span>
                                  </td>
                                  <td>
                                    <div className="rc-ops">
                                      {(() => {
                                        const relOk = (groupStrategy[`${a.company}::${a.group}`] ?? true) && a.strategy && RC_STRATEGIES.some((s) => s.group === a.group);
                                        const ops: { label: string; kind: 'btn' | 'link'; cls?: string; onClick: () => void }[] = [
                                          { label: '转移会话', kind: 'btn', onClick: () => openTransfer({ mode: 'single', agent: a }) },
                                        ];
                                        if (relOk) ops.push({
                                          label: '关联策略', kind: 'link',
                                          onClick: () => { const rel = RC_STRATEGIES.find((s) => s.group === a.group); if (rel) onGoStrategy(rel.id); },
                                        });
                                        ops.push({ label: '值班监控', kind: 'link', cls: 'rc-op-mon', onClick: () => { setMonTab('duty'); setMonitor(a); } });
                                        /* 操作列约定：直出最多 3 个，超出收进「更多」气泡 */
                                        const direct = ops.length > 3 ? ops.slice(0, 3) : ops;
                                        const more = ops.length > 3 ? ops.slice(3) : [];
                                        return (
                                          <>
                                            {direct.map((o) => (o.kind === 'btn' ? (
                                              <button key={o.label} type="button" className="rc-btn-manual" onClick={o.onClick}>{o.label}</button>
                                            ) : (
                                              <a key={o.label} className={`rc-rel-link ${o.cls ?? ''}`} onClick={o.onClick}>{o.label}</a>
                                            )))}
                                            {more.length > 0 ? <MoreActions items={more.map((o) => ({ label: o.label, onClick: o.onClick }))} /> : null}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {rows.length === 0 ? (
                                <tr><td colSpan={18} className="rc-sub-empty">暂无数据</td></tr>
                              ) : null}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 表尾：分页器（按公司行） */}
        <div className="rc-table-foot">
          <div className="rc-pager">
            <span className="rc-pg-total">共{companies.length}条</span>
            <select
              className="select rc-pg-size"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
            <button type="button" className="rc-pg-btn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} type="button" className={`rc-pg-btn ${p === safePage ? 'cur' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button type="button" className="rc-pg-btn" disabled={safePage >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>›</button>
            <span className="rc-pg-jump">
              前往
              <input
                defaultValue={safePage}
                key={`${safePage}-${companies.length}-${pageSize}`}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  const v = Number((e.target as HTMLInputElement).value);
                  if (Number.isFinite(v)) setPage(Math.min(pages, Math.max(1, Math.round(v))));
                }}
              />
              页
            </span>
          </div>
        </div>
      </div>

      {/* ---------- 转移会话弹窗（单人 / 批量） ---------- */}
      {transfer ? (
        <Modal
          title="转移会话"
          size="lg"
          foot={(
            <>
              <button type="button" className="btn" onClick={() => setTransfer(null)}>取消</button>
              <button type="button" className="btn primary" onClick={confirmTransfer}>确定转移</button>
            </>
          )}
          onClose={() => setTransfer(null)}
        >
          <div className="rc-form">
            <div className="f-row">
              <span className="f-label">目标客服：</span>
              {transfer.mode === 'single' ? (
                <select className="select" disabled value={rcAgentLabel(transfer.agent)}>
                  <option>{rcAgentLabel(transfer.agent)}</option>
                </select>
              ) : (
                <select className="select" disabled value={`已选 ${sel.size} 名客服（批量）`}>
                  <option>{`已选 ${sel.size} 名客服（批量）`}</option>
                </select>
              )}
            </div>
            <div className="f-row">
              <span className="f-label">转移客服：</span>
              <div className="rc-casc">
                <div className="rc-casc-col rc-casc-groups">
                  {RC_COMPANIES.flatMap((c) => (RC_COMPANY_GROUPS[c] ?? []).map((g) => {
                    const excl = transfer.mode === 'single' ? new Set([transfer.agent.id]) : sel;
                    const count = agents.filter((a) => a.company === c && a.group === g && !excl.has(a.id)).length;
                    const gPick = pick?.kind === 'group' && pick.group === g;
                    return (
                      <div
                        key={`${c}::${g}`}
                        className={`rc-casc-g ${cascActive === g ? 'on' : ''}`}
                        onClick={() => setCascActive(g)}
                      >
                        <input
                          type="checkbox"
                          checked={gPick}
                          onChange={() => setPick(gPick ? null : { kind: 'group', group: g })}
                        />
                        <span className="rc-casc-gname">{g}</span>
                        <span className="rc-casc-count">{count}</span>
                      </div>
                    );
                  }))}
                </div>
                <div className="rc-casc-col rc-casc-members">
                  {(() => {
                    const excl = transfer.mode === 'single' ? new Set([transfer.agent.id]) : sel;
                    const members = agents.filter((a) => a.group === cascActive && !excl.has(a.id));
                    if (members.length === 0) return <div className="rc-casc-empty">暂无可选成员</div>;
                    return members.map((a) => {
                      const aPick = pick?.kind === 'agent' && pick.id === a.id;
                      return (
                        <label className="rc-casc-m" key={a.id}>
                          <input
                            type="checkbox"
                            checked={aPick}
                            onChange={() => setPick(aPick ? null : { kind: 'agent', id: a.id })}
                          />
                          {a.name}
                          <span className={STATUS_CLS[a.status]}>{a.status}</span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ---------- 值班监控弹窗（左统计 + 右 tab 切换饼图） ---------- */}
      {monitor ? (() => {
        const m = rcMonitorOf(monitor);
        const segs = monTab === 'duty' ? [
          { label: '在线', value: m.online, color: '#52c41a' },
          { label: '小休', value: m.rest, color: '#faad14' },
          { label: '离线', value: m.offline, color: '#9aa1ae' },
        ] : monTab === 'login' ? [
          { label: '登录', value: m.login, color: '#52c41a' },
          { label: '登出', value: m.logout, color: '#9aa1ae' },
        ] : [
          { label: '在线', value: m.wsOn, color: '#52c41a' },
          { label: '离线', value: m.wsOff, color: '#9aa1ae' },
        ];
        const total = segs.reduce((t, s) => t + s.value, 0) || 1;
        const live = segs.filter((s) => s.value > 0);
        let ang = -Math.PI / 2;
        const arcs = live.map((s) => {
          const a0 = ang;
          const a1 = ang + (s.value / total) * Math.PI * 2;
          ang = a1;
          return { ...s, a0, a1 };
        });
        const stats = [
          { label: '在线时长', value: m.online, color: '#52c41a' },
          { label: '小休时长', value: m.rest, color: '#faad14' },
          { label: '离线时长', value: m.offline, color: '#9aa1ae' },
          { label: '登录时长', value: m.login, color: '#52c41a' },
          { label: '登出时长', value: m.logout, color: '#9aa1ae' },
          { label: 'WS在线时长', value: m.wsOn, color: '#52c41a' },
          { label: 'WS离线时长', value: m.wsOff, color: '#9aa1ae' },
        ];
        return (
          <Modal
            title="值班监控"
            size="lg"
            foot={<button type="button" className="btn" onClick={() => setMonitor(null)}>关闭</button>}
            onClose={() => setMonitor(null)}
          >
            <div className="rc-mon">
              <div className="rc-mon-side">
                <div className="rc-mon-name">{monitor.name}（{monitor.group}）</div>
                <div className="rc-mon-id">ID: {monitor.id}</div>
                <div className="rc-mon-stats">
                  {stats.map((s) => (
                    <div key={s.label} className="rc-mon-stat">
                      <i style={{ background: s.color }} />
                      <span>{s.label}</span>
                      <b>{s.value.toFixed(2)}h</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rc-mon-main">
                <div className="rc-mon-tabs">
                  {([{ k: 'duty', t: '值班状态' }, { k: 'login', t: '登录状态' }, { k: 'ws', t: 'WS状态' }] as const).map((t) => (
                    <button
                      key={t.k}
                      type="button"
                      className={`rc-mon-tab ${monTab === t.k ? 'on' : ''}`}
                      onClick={() => setMonTab(t.k)}
                    >{t.t}</button>
                  ))}
                </div>
                <div className="rc-mon-pie">
                  <svg viewBox="0 0 160 160" width="160" height="160">
                    {live.length === 1
                      ? <circle cx="80" cy="80" r="70" fill={live[0].color} />
                      : arcs.map((s) => <path key={s.label} d={piePath(80, 80, 70, s.a0, s.a1)} fill={s.color} />)}
                  </svg>
                  <div className="rc-mon-legend">
                    {segs.map((s) => (
                      <div key={s.label} className="rc-mon-lg">
                        <i style={{ background: s.color }} />
                        <span>{s.label}</span>
                        <b>{s.value.toFixed(2)}h</b>
                        <em>{Math.round((s.value / total) * 100)}%</em>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        );
      })() : null}
    </div>
  );
}
