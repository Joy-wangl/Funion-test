/* =========================================================
   聚合接待 · 视图①「宝妈接待」表格页（面包屑：基础数据 › 客服管理）
   筛选 / 公司树形表（单排列表头） / 分页 / 导出 / 转移会话
   ========================================================= */
import { useEffect, useMemo, useState } from 'react';
import {
  RC_COMPANY, RC_GROUPS, rcAgentLabel, rcCompanySumOf, rcCsvOf,
  rcTargetOptions, type RcAgent, type RcGroup,
} from './data';
import { Modal } from '../permission/shared';

interface Props {
  agents: RcAgent[];
  setAgents: React.Dispatch<React.SetStateAction<RcAgent[]>>;
  toggleAgentStrategy: (id: number) => void;
  pushToast: (msg: string, type?: 'success' | 'error') => void;
  onGoStrategyView: () => void;
}

type Filter = { company: string; group: string; name: string; status: string };
const EMPTY_FILTER: Filter = { company: '', group: '', name: '', status: '' };

const STATUS_CLS: Record<string, string> = { 在线: 'rc-st.on', 小休: 'rc-st.rest', 离线: 'rc-st.off' };

export default function AgentTable({
  agents, setAgents, toggleAgentStrategy, pushToast, onGoStrategyView,
}: Props) {
  const [draft, setDraft] = useState<Filter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<Filter>(EMPTY_FILTER);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [companyOpen, setCompanyOpen] = useState(true);
  /** 分组维度切换标签（系列=公司 / 商品编码=分组 / 平台=成员 的图二映射） */
  const [groupTab, setGroupTab] = useState<'all' | RcGroup>('all');
  const [transfer, setTransfer] = useState<{ mode: 'single'; agent: RcAgent } | { mode: 'batch' } | null>(null);
  const [transferSel, setTransferSel] = useState('');
  const [batchSel, setBatchSel] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => agents.filter((a) => {
    if (applied.company !== '' && !(RC_COMPANY === applied.company)) return false;
    if (applied.group !== '' && a.group !== applied.group) return false;
    if (applied.name !== '' && !a.name.includes(applied.name)) return false;
    if (applied.status !== '' && a.status !== applied.status) return false;
    return true;
  }), [agents, applied]);

  const tabFiltered = useMemo(
    () => (groupTab === 'all' ? filtered : filtered.filter((a) => a.group === groupTab)),
    [filtered, groupTab],
  );

  const pages = Math.max(1, Math.ceil(tabFiltered.length / pageSize));
  const safePage = Math.min(page, pages);
  const pageAgents = useMemo(
    () => tabFiltered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [tabFiltered, safePage, pageSize],
  );

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

  /* ---------- 勾选 ---------- */
  const pageIds = pageAgents.map((a) => a.id);
  const allPage = pageIds.length > 0 && pageIds.every((id) => sel.has(id));
  const somePage = pageIds.some((id) => sel.has(id));
  const toggleAllPage = () => setSel((s) => {
    const next = new Set(s);
    if (allPage) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    return next;
  });
  const allFiltered = filtered.length > 0 && filtered.every((a) => sel.has(a.id));
  const toggleAllFiltered = () => setSel((s) => {
    const next = new Set(s);
    if (allFiltered) filtered.forEach((a) => next.delete(a.id));
    else filtered.forEach((a) => next.add(a.id));
    return next;
  });
  const toggleOne = (id: number) => setSel((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

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

  const companySum = rcCompanySumOf(filtered);

  return (
    <div className="rc-view">
      {/* 视图①顶部窗口 tab：点击进入智能分流策略页 */}
      <div className="rc-wtabs">
        <div className="rc-wtab single" onClick={onGoStrategyView}>智能分流</div>
      </div>

      <div className="qc-body rc-table-card">
        {/* 筛选区 */}
        <div className="qc-filters rc-filter-row">
          <select className="select" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}>
            <option value="">公司</option>
            <option value={RC_COMPANY}>{RC_COMPANY}</option>
          </select>
          <select className="select" value={draft.group} onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))}>
            <option value="">分组</option>
            {RC_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <input
            className="input rc-input"
            placeholder="请输入客服名称"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { setApplied(draft); setPage(1); } }}
          />
          <select className="select" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
            <option value="">接待状态</option>
            <option value="在线">在线</option>
            <option value="小休">小休</option>
            <option value="离线">离线</option>
          </select>
          <div className="rc-actions">
            <button type="button" className="btn primary" onClick={() => { setApplied(draft); setPage(1); }}>查询</button>
            <button type="button" className="btn" onClick={() => { setDraft(EMPTY_FILTER); setApplied(EMPTY_FILTER); setPage(1); pushToast('筛选条件已重置'); }}>重置</button>
            <button type="button" className="btn" onClick={doExport}>导出</button>
            <button type="button" className="btn" onClick={doBatchRoute}>批量手动分流</button>
          </div>
        </div>

        {/* 树形表格 */}
        <div className="rc-wide">
          <table className="table rc-tree">
            <thead>
              <tr>
                <th className="check" />
                <th>所属公司</th>
                <th>AI接待量</th>
                <th>人工接待量</th>
                <th>均响</th>
                <th>未回复</th>
                <th>3分钟回复率</th>
                <th>30秒响应率</th>
                <th>在线时长</th>
                <th>接待排名</th>
              </tr>
            </thead>
            <tbody>
              <tr className="rc-row-company">
                <td className="check">
                  <input type="checkbox" title="全选/清空全部客服" checked={allFiltered} onChange={toggleAllFiltered} />
                  <span
                    className={`rc-caret ${companyOpen ? 'open' : ''}`}
                    title="展开/收起"
                    onClick={() => setCompanyOpen((v) => !v)}
                  >▾</span>
                </td>
                <td><b>{RC_COMPANY}</b></td>
                <td>{companySum.ai}</td>
                <td>{companySum.human}</td>
                <td>{companySum.resp}s</td>
                <td>{companySum.unreplied}</td>
                <td>{companySum.r3m}%</td>
                <td>{companySum.r30s}%</td>
                <td>{companySum.hours}</td>
                <td>{companySum.rank}</td>
              </tr>
              {companyOpen ? (
                <tr className="expand-row">
                  <td colSpan={10}>
                    <div className="qc-range-toggle rc-group-tabs">
                      <button
                        type="button"
                        className={groupTab === 'all' ? 'active' : ''}
                        onClick={() => { setGroupTab('all'); setPage(1); }}
                      >全部</button>
                      {RC_GROUPS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={groupTab === g ? 'active' : ''}
                          onClick={() => { setGroupTab(g); setPage(1); }}
                        >{g}</button>
                      ))}
                    </div>
                    <table className="matrix rc-sub">
                      <thead>
                        <tr>
                          <th className="check">
                            <input type="checkbox" title="全选本页" checked={allPage} ref={(el) => { if (el) el.indeterminate = !allPage && somePage; }} onChange={toggleAllPage} />
                          </th>
                          <th>客服</th>
                          <th>接待状态</th>
                          <th>AI接待量</th>
                          <th>人工接待量</th>
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
              {pageAgents.map((a) => (
                  <tr key={a.id} className="rc-row-agent">
                    <td className="check">
                      <input type="checkbox" checked={sel.has(a.id)} onChange={() => toggleOne(a.id)} />
                    </td>
                    <td>{a.name}</td>
                    <td><span className={STATUS_CLS[a.status]}>{a.status}</span></td>
                    <td>{a.ai}</td>
                    <td>{a.human}</td>
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
                      {tabFiltered.length === 0 ? (
                        <tr><td colSpan={13} className="rc-sub-empty">暂无数据</td></tr>
                      ) : null}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* 表尾：列配置齿轮 + 分页器 */}
        <div className="rc-table-foot">
          <span className="rc-gear" onClick={() => pushToast('演示原型：表格列配置暂未开放')}>⚙</span>
          <div className="rc-pager">
            <span className="rc-pg-total">共{tabFiltered.length}条</span>
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
                key={`${safePage}-${filtered.length}-${pageSize}`}
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
