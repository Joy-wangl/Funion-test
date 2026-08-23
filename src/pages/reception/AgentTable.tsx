/* =========================================================
   聚合接待 · 视图①「宝妈接待」表格页（面包屑：基础数据 › 客服管理）
   多公司树形表：公司父行（可展开）→ 分组标签 → 成员子表
   筛选 / 分页（按公司行）/ 导出 / 转移会话
   ========================================================= */
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  RC_COMPANY, RC_COMPANIES, RC_COMPANY_GROUPS, RC_ALL_GROUPS,
  rcAgentLabel, rcCompanySumOf, rcCsvOf, rcTargetOptions, type RcAgent,
} from './data';
import { Modal } from '../permission/shared';
import BubbleSelect from '../../components/BubbleSelect';

interface Props {
  agents: RcAgent[];
  setAgents: React.Dispatch<React.SetStateAction<RcAgent[]>>;
  toggleAgentStrategy: (id: number) => void;
  pushToast: (msg: string, type?: 'success' | 'error') => void;
}

type Filter = { company: string; group: string; name: string; status: string };
const EMPTY_FILTER: Filter = { company: '', group: '', name: '', status: '' };

const STATUS_CLS: Record<string, string> = { 在线: 'rc-st on', 小休: 'rc-st rest', 离线: 'rc-st off' };

/** AI 回复占比 = AI 回复数 ÷ 总会话数（人工+AI） */
const aiRateOf = (ai: number, human: number) => (ai + human > 0 ? Math.round((ai / (ai + human)) * 100) : 0);

export default function AgentTable({
  agents, setAgents, toggleAgentStrategy, pushToast,
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
  /** 子表「接待状态」列头筛选菜单 */
  const [statusMenu, setStatusMenu] = useState(false);
  const [transfer, setTransfer] = useState<{ mode: 'single'; agent: RcAgent } | { mode: 'batch' } | null>(null);
  const [transferSel, setTransferSel] = useState('');
  const [batchSel, setBatchSel] = useState<Set<number>>(new Set());

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

  const openTransfer = (t: typeof transfer) => {
    setTransferSel('');
    setBatchSel(new Set());
    setTransfer(t);
  };

  /** Esc：关闭转移会话弹窗 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && transfer) setTransfer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [transfer]);

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
    if (sel.size === 0) { pushToast('请先勾选需要批量手动分流的客服', 'error'); return; }
    openTransfer({ mode: 'batch' });
  };

  /* ---------- 转移会话确认 ---------- */
  const confirmTransfer = () => {
    if (!transfer) return;
    if (transfer.mode === 'single') {
      if (!transferSel) { pushToast('请选择转移客服', 'error'); return; }
      const n = transfer.agent.unreplied;
      if (n === 0) { pushToast('暂无会话可转移', 'error'); return; }
      const target = transferSel.split('（')[0];
      setAgents((v) => v.map((a) => (a.id === transfer.agent.id ? { ...a, unreplied: 0 } : a)));
      pushToast(`已将 ${n} 个会话转移给「${target}」`);
      setTransfer(null);
      return;
    }
    if (batchSel.size === 0) { pushToast('请选择转移客服', 'error'); return; }
    const checked = agents.filter((a) => sel.has(a.id));
    const n = checked.reduce((t, a) => t + a.unreplied, 0);
    if (n === 0) { pushToast('暂无会话可转移', 'error'); return; }
    const targetId = [...batchSel][0];
    const target = agents.find((a) => a.id === targetId);
    setAgents((v) => v.map((a) => (sel.has(a.id) ? { ...a, unreplied: 0 } : a)));
    pushToast(`已将 ${n} 个会话转移给「${target?.name ?? ''}」`);
    setTransfer(null);
    setSel(new Set());
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
            <button type="button" className="btn" onClick={doBatchRoute}>批量手动分流</button>
          </div>
        </div>

        {/* 树形表格：公司父行 × N */}
        <div className="rc-wide">
          <table className="table rc-tree">
            <thead>
              <tr>
                <th className="check" />
                <th>所属公司</th>
                <th>接待数据(条)</th>
                <th>AI回复平均占比</th>
                <th>平均均响</th>
                <th>未回复</th>
                <th>3分钟平均回复率</th>
                <th>30秒平均响应率</th>
                <th>平均在线时长</th>
                <th>接待排名</th>
              </tr>
            </thead>
            <tbody>
              {pageCompanies.map((c) => {
                const open = !!openMap[c];
                const sum = rcCompanySumOf(c, filtered);
                const cIds = idsOf(filtered.filter((a) => a.company === c));
                const rows = rowsOf(c);
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
                      <td>
                        <div className="rc-duo"><span className="tag green rc-tagw">人工</span>{sum.human}</div>
                        <div className="rc-duo"><span className="tag orange rc-tagw">AI</span>{sum.ai}</div>
                      </td>
                      <td>{aiRateOf(sum.ai, sum.human)}%</td>
                      <td>{sum.resp}s</td>
                      <td>{sum.unreplied}</td>
                      <td>{sum.r3m}%</td>
                      <td>{sum.r30s}%</td>
                      <td>{sum.hours}</td>
                      <td>{sum.rank}</td>
                    </tr>
                    {open ? (
                      <tr className="expand-row">
                        <td colSpan={10}>
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
                                <th>接待数据(条)</th>
                                <th>AI回复占比</th>
                                <th>均响</th>
                                <th>未回复</th>
                                <th>3分钟回复率</th>
                                <th>30秒响应率</th>
                                <th>在线时长</th>
                                <th>接待排名</th>
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
                                  <td>
                                    <div className="rc-duo"><span className="tag green rc-tagw">人工</span>{a.human}</div>
                                    <div className="rc-duo"><span className="tag orange rc-tagw">AI</span>{a.ai}</div>
                                  </td>
                                  <td>{aiRateOf(a.ai, a.human)}%</td>
                                  <td>{a.resp}s</td>
                                  <td>{a.unreplied}</td>
                                  <td>{a.r3m}%</td>
                                  <td>{a.r30s}%</td>
                                  <td>{a.hours}</td>
                                  <td>{a.rank}</td>
                                  <td>
                                    <span
                                      className={`rc-switch ${a.strategy ? 'on' : ''}`}
                                      title="启用/禁用策略"
                                      onClick={() => toggleAgentStrategy(a.id)}
                                    ><i /></span>
                                  </td>
                                  <td>
                                    <button type="button" className="rc-btn-manual" onClick={() => openTransfer({ mode: 'single', agent: a })}>手动分流</button>
                                  </td>
                                </tr>
                              ))}
                              {rows.length === 0 ? (
                                <tr><td colSpan={13} className="rc-sub-empty">暂无数据</td></tr>
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
                  {rcTargetOptions(agents).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <select className="select" disabled value={`已选 ${sel.size} 名客服（批量）`}>
                  <option>{`已选 ${sel.size} 名客服（批量）`}</option>
                </select>
              )}
            </div>
            <div className="f-row">
              <span className="f-label">转移客服：</span>
              {transfer.mode === 'single' ? (
                <select className="select" value={transferSel} onChange={(e) => setTransferSel(e.target.value)}>
                  <option value="">请选择转移客服</option>
                  {agents.filter((a) => a.id !== transfer.agent.id).map((a) => (
                    <option key={a.id} value={rcAgentLabel(a)}>{rcAgentLabel(a)}</option>
                  ))}
                </select>
              ) : (
                <div className="rc-batch-list">
                  {agents.filter((a) => !sel.has(a.id)).length === 0 ? (
                    <div className="rc-empty-sm">暂无可选客服</div>
                  ) : agents.filter((a) => !sel.has(a.id)).map((a) => (
                    <label className="rc-batch-item" key={a.id}>
                      <input
                        type="checkbox"
                        checked={batchSel.has(a.id)}
                        onChange={() => setBatchSel((s) => {
                          const next = new Set(s);
                          if (next.has(a.id)) next.delete(a.id);
                          else { next.clear(); next.add(a.id); }
                          return next;
                        })}
                      />
                      {rcAgentLabel(a)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
