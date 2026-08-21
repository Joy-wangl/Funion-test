/* =========================================================
   优化任务列表（简单版）
   - 顶部状态 tab（全部 + 六状态，含计数）替代「优化状态」筛选条件
   - 筛选表单：草稿/生效分离 + BubbleSelect 全局规范
   - 批量分配 / 批量拒绝（仅待认领任务可勾选）
   字段呈现判断：
   - 优化状态筛选不下发（tab 已覆盖）
   - 待认领 tab：隐藏「分配运维」筛选；分配运维/分配时间列恒为 —
   - 拒绝原因列仅在「拒绝」tab 呈现
   - 原系统「组别/运维组别」重复字段合并为「运维组别」
   ========================================================= */
import { useMemo, useState } from 'react';
import BubbleSelect from '../../components/BubbleSelect';
import MoreActions from '../../components/MoreActions';
import { Modal } from '../permission/shared';
import { PROBLEM_TYPE_COLOR, pct, rateCls } from './qcCenterData';
import {
  OPT_STATUS_LABELS,
  OPT_LEVELS,
  OPT_PROBLEMS,
  OPT_DEMANDS,
  OPT_GROUPS,
  OPT_PICKERS,
  OPT_ASSIGNEES,
  type OptStatus,
  type OptTask,
  type StatusTab,
} from './qcOptData';

type OptFilter = {
  start: string;
  end: string;
  picker: string;
  codes: string;
  assignee: string;
  group: string;
  level: string;
  direction: string;
  assignStatus: string;
};

const F_ALL = {
  picker: '全部选品人',
  assignee: '全部运维',
  group: '全部组别',
  level: '全部级别',
  direction: '全部需求',
  assignStatus: '全部分配状态',
};
const DEFAULT_FILTER: OptFilter = { start: '', end: '', codes: '', ...F_ALL };

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function OptTaskView({ tasks, setTasks, statusTab, setStatusTab }: {
  tasks: OptTask[];
  setTasks: (updater: (ts: OptTask[]) => OptTask[]) => void;
  statusTab: StatusTab;
  setStatusTab: (s: StatusTab) => void;
}) {
  const [draft, setDraft] = useState<OptFilter>(DEFAULT_FILTER);
  const [applied, setApplied] = useState<OptFilter>(DEFAULT_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** 弹层上下文（空数组 / null = 关闭） */
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [rejectIds, setRejectIds] = useState<string[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [editTask, setEditTask] = useState<OptTask | null>(null);
  const [aAssignee, setAAssignee] = useState(OPT_ASSIGNEES[0]);
  const [aGroup, setAGroup] = useState(OPT_GROUPS[0]);
  const [reason, setReason] = useState('');
  const [eForm, setEForm] = useState({ problem: OPT_PROBLEMS[0], direction: OPT_DEMANDS[0], level: OPT_LEVELS[0], group: OPT_GROUPS[0], picker: OPT_PICKERS[0] });

  const patchDraft = (patch: Partial<OptFilter>) => setDraft((d) => ({ ...d, ...patch }));

  /* 条件筛选（不含状态 tab）→ tab 计数与列表共用 */
  const condFiltered = useMemo(() => tasks.filter((t) => {
    const day = t.createdAt.slice(0, 10);
    if (applied.start && day < applied.start) return false;
    if (applied.end && day > applied.end) return false;
    if (applied.picker !== F_ALL.picker && t.picker !== applied.picker) return false;
    if (applied.assignee !== F_ALL.assignee && t.assignee !== applied.assignee) return false;
    if (applied.group !== F_ALL.group && t.group !== applied.group) return false;
    if (applied.level !== F_ALL.level && t.optLevel !== applied.level) return false;
    if (applied.direction !== F_ALL.direction && t.optDirection !== applied.direction) return false;
    if (applied.assignStatus !== F_ALL.assignStatus && t.assignStatus !== applied.assignStatus) return false;
    const kws = applied.codes.split(/[\s,，]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (kws.length && !kws.every((k) => t.seriesCode.toLowerCase().includes(k) || t.seriesName.toLowerCase().includes(k))) return false;
    return true;
  }), [tasks, applied]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: condFiltered.length };
    for (const s of OPT_STATUS_LABELS) m[s.key] = condFiltered.filter((t) => t.status === s.key).length;
    return m;
  }, [condFiltered]);

  const rows = useMemo(
    () => (statusTab === 'all' ? condFiltered : condFiltered.filter((t) => t.status === statusTab)),
    [condFiltered, statusTab],
  );

  const selectable = useMemo(() => rows.filter((t) => t.status === 'pendingClaim'), [rows]);
  const allSel = selectable.length > 0 && selectable.every((t) => selected.has(t.id));
  const toggleAll = () => setSelected((prev) => {
    if (allSel) return new Set([...prev].filter((id) => !selectable.some((t) => t.id === id)));
    const next = new Set(prev);
    selectable.forEach((t) => next.add(t.id));
    return next;
  });
  const toggleOne = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const selCount = rows.filter((t) => selected.has(t.id)).length;

  const doAssign = () => {
    const ids = new Set(assignIds);
    setTasks((ts) => ts.map((t) => (ids.has(t.id) && t.status === 'pendingClaim'
      ? { ...t, status: 'pendingOpt', assignStatus: '已分配', assignee: aAssignee, group: aGroup, assignTime: nowStr() }
      : t)));
    setSelected(new Set());
    setAssignIds([]);
  };
  const doReject = () => {
    const ids = new Set(rejectIds);
    setTasks((ts) => ts.map((t) => (ids.has(t.id) && t.status === 'pendingClaim'
      ? { ...t, status: 'rejected', rejectReason: reason.trim() || '—' }
      : t)));
    setSelected(new Set());
    setReason('');
    setRejectIds([]);
  };
  const doDelete = () => {
    const ids = new Set(deleteIds);
    setTasks((ts) => ts.filter((t) => !ids.has(t.id)));
    setSelected(new Set());
    setDeleteIds([]);
  };
  const openEdit = (t: OptTask) => {
    setEForm({ problem: t.optType, direction: t.optDirection, level: t.optLevel, group: t.group, picker: t.picker });
    setEditTask(t);
  };
  const doEditSave = () => {
    if (!editTask) return;
    setTasks((ts) => ts.map((t) => (t.id === editTask.id
      ? { ...t, optType: eForm.problem, optDirection: eForm.direction, optLevel: eForm.level, group: eForm.group, picker: eForm.picker }
      : t)));
    setEditTask(null);
  };

  const statusMeta = (s: OptStatus) => OPT_STATUS_LABELS.find((x) => x.key === s)!;

  return (
    <>
      <div className="qc-head">
        <div className="qc-title">
          优化任务
          <span className="qc-desc">命中问题商品的优化治理闭环 · 共 {counts.all} 条任务</span>
        </div>
      </div>

      {/* 状态 tab：替代「优化状态」筛选条件 */}
      <div className="qc-range-toggle opt-status-tabs">
        <button type="button" className={statusTab === 'all' ? 'active' : ''} onClick={() => setStatusTab('all')}>
          全部<span className="n">{counts.all}</span>
        </button>
        {OPT_STATUS_LABELS.map((s) => (
          <button key={s.key} type="button" className={statusTab === s.key ? 'active' : ''} onClick={() => setStatusTab(s.key)}>
            {s.label}<span className="n">{counts[s.key]}</span>
          </button>
        ))}
      </div>

      <div className="sg-filter">
        <div className="sg-grid">
          <div className="sg-field">
            <label>生成开始时间</label>
            <input type="date" className="sg-input" value={draft.start} onChange={(e) => patchDraft({ start: e.target.value })} />
          </div>
          <div className="sg-field">
            <label>生成结束时间</label>
            <input type="date" className="sg-input" value={draft.end} onChange={(e) => patchDraft({ end: e.target.value })} />
          </div>
          <div className="sg-field">
            <label>选品人</label>
            <BubbleSelect className="sg-select" value={draft.picker} onChange={(v) => patchDraft({ picker: v })} options={[F_ALL.picker, ...OPT_PICKERS]} />
          </div>
          <div className="sg-field">
            <label>系列编码</label>
            <input
              className="sg-input"
              placeholder="系列编码/名称，多条空格分隔"
              value={draft.codes}
              onChange={(e) => patchDraft({ codes: e.target.value })}
            />
          </div>
          {statusTab !== 'pendingClaim' && (
            <div className="sg-field">
              <label>分配运维</label>
              <BubbleSelect className="sg-select" value={draft.assignee} onChange={(v) => patchDraft({ assignee: v })} options={[F_ALL.assignee, ...OPT_ASSIGNEES]} />
            </div>
          )}
          <div className="sg-field">
            <label>运维组别</label>
            <BubbleSelect className="sg-select" value={draft.group} onChange={(v) => patchDraft({ group: v })} options={[F_ALL.group, ...OPT_GROUPS]} />
          </div>
          <div className="sg-field">
            <label>优化级别</label>
            <BubbleSelect className="sg-select" value={draft.level} onChange={(v) => patchDraft({ level: v })} options={[F_ALL.level, ...OPT_LEVELS]} />
          </div>
          <div className="sg-field">
            <label>需求</label>
            <BubbleSelect className="sg-select" value={draft.direction} onChange={(v) => patchDraft({ direction: v })} options={[F_ALL.direction, ...OPT_DEMANDS]} />
          </div>
        </div>
        {/* 末行：剩余条件 + 操作/重置/搜索 同排，右对齐 */}
        <div className="sg-grid opt-actions-row">
          <div className="sg-field">
            <label>分配状态</label>
            <BubbleSelect className="sg-select" value={draft.assignStatus} onChange={(v) => patchDraft({ assignStatus: v })} options={[F_ALL.assignStatus, '待处理', '已分配']} />
          </div>
          <div className="opt-actions-cell">
            {(statusTab === 'all' || statusTab === 'pendingClaim') && (
              <>
                {selCount > 0 && <span className="sel-info">已选 {selCount} 条待认领任务</span>}
                <button className="sg-btn primary" disabled={selCount === 0} onClick={() => setAssignIds([...selected])}>批量分配</button>
                <button className="sg-btn danger" disabled={selCount === 0} onClick={() => setRejectIds([...selected])}>批量拒绝</button>
              </>
            )}
            <button className="sg-btn" onClick={() => { setDraft(DEFAULT_FILTER); setApplied(DEFAULT_FILTER); }}>重置</button>
            <button className="sg-btn primary" onClick={() => setApplied(draft)}>搜索</button>
          </div>
        </div>
      </div>

      <div className="qc-body">
        <table className="table qc-wide">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={allSel} disabled={selectable.length === 0} onChange={toggleAll} />
              </th>
              <th>系列编码</th>
              {statusTab === 'all' && <th>优化状态</th>}
              <th>优化级别</th>
              <th>问题点</th>
              <th>发退率</th>
              <th>近一个月订单</th>
              <th>近一个月毛六</th>
              <th>需求</th>
              <th>分配状态</th>
              <th>分配运维</th>
              <th>运维组别</th>
              <th>分配时间</th>
              <th>选品人</th>
              <th>登记日期</th>
              {statusTab === 'rejected' && <th>拒绝原因</th>}
              <th style={{ width: 90 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const meta = statusMeta(t.status);
              return (
                <tr key={t.id}>
                  <td>
                    <input
                      type="checkbox"
                      disabled={t.status !== 'pendingClaim'}
                      checked={selected.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                    />
                  </td>
                  <td className="col-name">
                    <div>{t.seriesCode}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{t.seriesName}</div>
                  </td>
                  {statusTab === 'all' && (
                    <td><span className="tag" style={{ background: `${meta.color}1a`, color: meta.color }}>{meta.label}</span></td>
                  )}
                  <td>{t.optLevel}</td>
                  <td>
                    <span
                      className="tag"
                      style={{ background: `${PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff' }}
                    >
                      {t.optType}
                    </span>
                  </td>
                  <td><span className={`rate ${rateCls(t.refundRate)}`}>{pct(t.refundRate)}</span></td>
                  <td>{t.orders30d.toLocaleString()}</td>
                  <td>{t.gross30d.toLocaleString()}</td>
                  <td>{t.optDirection}</td>
                  <td>{t.assignStatus}</td>
                  <td>{t.assignee ?? '—'}</td>
                  <td>{t.group}</td>
                  <td>{t.assignTime ?? '—'}</td>
                  <td>{t.picker}</td>
                  <td>{t.createdAt}</td>
                  {statusTab === 'rejected' && <td style={{ color: 'var(--text-3)' }}>{t.rejectReason ?? '—'}</td>}
                  <td>
                    {t.status === 'pendingClaim' ? (
                      <div className="qc-op-col">
                        <a onClick={() => openEdit(t)}>编辑</a>
                        <a onClick={() => setAssignIds([t.id])}>分配</a>
                        <MoreActions
                          items={[
                            { label: '删除', danger: true, onClick: () => setDeleteIds([t.id]) },
                            { label: '拒绝', danger: true, onClick: () => setRejectIds([t.id]) },
                          ]}
                        />
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={statusTab === 'all' ? 16 : statusTab === 'rejected' ? 16 : 15} style={{ textAlign: 'center', color: 'var(--text-4)', padding: '40px 0' }}>无匹配任务</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {assignIds.length > 0 && (
        <Modal
          title="批量分配"
          sub={`将 ${assignIds.length} 条待认领任务分配给运维`}
          size="md"
          onClose={() => setAssignIds([])}
          foot={(
            <>
              <button className="btn" onClick={() => setAssignIds([])}>取消</button>
              <button className="btn primary" onClick={doAssign}>确认分配</button>
            </>
          )}
        >
          <div className="opt-form">
            <div className="sg-field">
              <label>分配运维</label>
              <BubbleSelect className="sg-select" value={aAssignee} onChange={setAAssignee} options={OPT_ASSIGNEES} />
            </div>
            <div className="sg-field">
              <label>运维组别</label>
              <BubbleSelect className="sg-select" value={aGroup} onChange={setAGroup} options={OPT_GROUPS} />
            </div>
          </div>
        </Modal>
      )}

      {rejectIds.length > 0 && (
        <Modal
          title="批量拒绝"
          sub={`拒绝 ${rejectIds.length} 条待认领任务`}
          size="md"
          onClose={() => setRejectIds([])}
          foot={(
            <>
              <button className="btn" onClick={() => setRejectIds([])}>取消</button>
              <button className="btn primary" onClick={doReject}>确认拒绝</button>
            </>
          )}
        >
          <textarea
            className="sg-input opt-reason"
            rows={3}
            placeholder="请输入拒绝原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Modal>
      )}

      {deleteIds.length > 0 && (
        <Modal
          title="删除任务"
          sub={`删除后不可恢复，确认删除 ${deleteIds.length} 条任务？`}
          size="md"
          onClose={() => setDeleteIds([])}
          foot={(
            <>
              <button className="btn" onClick={() => setDeleteIds([])}>取消</button>
              <button className="btn danger" onClick={doDelete}>确认删除</button>
            </>
          )}
        >
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>删除仅移除优化任务记录，不影响监控列表中的系列与问题统计数据。</div>
        </Modal>
      )}

      {editTask && (
        <Modal
          title="编辑任务"
          sub={`${editTask.seriesCode} · ${editTask.seriesName}`}
          size="md"
          onClose={() => setEditTask(null)}
          foot={(
            <>
              <button className="btn" onClick={() => setEditTask(null)}>取消</button>
              <button className="btn primary" onClick={doEditSave}>保存</button>
            </>
          )}
        >
          <div className="opt-form">
            <div className="sg-field">
              <label>问题点</label>
              <BubbleSelect className="sg-select" value={eForm.problem} onChange={(v) => setEForm((f) => ({ ...f, problem: v }))} options={OPT_PROBLEMS} />
            </div>
            <div className="sg-field">
              <label>需求</label>
              <BubbleSelect className="sg-select" value={eForm.direction} onChange={(v) => setEForm((f) => ({ ...f, direction: v }))} options={OPT_DEMANDS} />
            </div>
            <div className="sg-field">
              <label>优化级别</label>
              <BubbleSelect className="sg-select" value={eForm.level} onChange={(v) => setEForm((f) => ({ ...f, level: v }))} options={OPT_LEVELS} />
            </div>
            <div className="sg-field">
              <label>运维组别</label>
              <BubbleSelect className="sg-select" value={eForm.group} onChange={(v) => setEForm((f) => ({ ...f, group: v }))} options={OPT_GROUPS} />
            </div>
            <div className="sg-field">
              <label>选品人</label>
              <BubbleSelect className="sg-select" value={eForm.picker} onChange={(v) => setEForm((f) => ({ ...f, picker: v }))} options={OPT_PICKERS} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
