/* =========================================================
   Funion 权限管理 · 公共组件（图标 / 复选框 / 弹窗 / toast）
   ========================================================= */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ROLES, avaColor, membersOfDept, type DeptNode, DEPT_TREE, DEPT_MGMT_TREE, type Member } from './data';
import {
  OPS_CHANNELS,
  OPS_ROLE_LABEL,
  nowStamp,
  newGroupId,
  type OpsChannel,
  type OpsChannelGroups,
  type OpsChannelMembers,
  type OpsRole,
} from './opsGroupData';
import BubbleSelect from '../../components/BubbleSelect';
import './style.css';

/* ---------- 通用图标 ---------- */
export const IconCheck = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
);
export const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
export const IconXsm = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6L6 18M6 6l12 12" /></svg>
);
export const IconArrow = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
);
export const IconMore = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
);
export const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
);
export const IconOk = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
);
export const IconWarn = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
);
export const IconSync = () => (
  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
);
export const IconDept = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-4h12v4" /></svg>
);

/* ---------- 复选框 ---------- */
export function Checkbox({ checked, indeterminate, disabled, onChange }: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <label className={`checkbox${disabled ? ' disabled' : ''}`}>
      <input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="box"><IconCheck /></span>
    </label>
  );
}

/* ---------- 弹窗基础 ---------- */
export function Modal({ title, sub, size, foot, onClose, children }: {
  title: string;
  sub?: string;
  size?: 'md' | 'lg' | 'xl';
  foot: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size ?? ''}`}>
        <div className="modal-head">
          <div>
            <div className="m-title">{title}</div>
            {sub && <div className="m-sub">{sub}</div>}
          </div>
          <span className="x" onClick={onClose}><IconX /></span>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{foot}</div>
      </div>
    </div>
  );
}

/* ---------- toast ---------- */
export interface ToastItem { id: number; msg: string; type: 'success' | 'error' }
let toastSeq = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pushToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2400);
  };
  return { toasts, pushToast };
}

export function ToastWrap({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div className={`toast ${t.type}`} key={t.id}>
          <span className="ic"><IconOk /></span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 角色多选 ---------- */
export function RoleSelector({ initial, onChange }: { initial: string[]; onChange: (ids: string[]) => void }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(initial));
  const groups = useMemo(() => [...new Set(ROLES.map((r) => r.group))], []);
  const toggle = (id: string, checked: boolean) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      onChange([...next]);
      return next;
    });
  };
  return (
    <div>
      {groups.map((g) => (
        <div key={g} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{g}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.filter((r) => r.group === g).map((r) => (
              <label key={r.id} className="checkbox" style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
                <input type="checkbox" checked={sel.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} />
                <span className="box"><IconCheck /></span>
                <span className={`tag ${r.color}`} style={{ margin: 0 }}>{r.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- 部门选择穿梭框 ---------- */
export function DeptTransfer({ picked, onPickedChange }: {
  picked: Map<string, string>;
  onPickedChange: (next: Map<string, string>) => void;
}) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleNode = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setChecked = (id: string, name: string, checked: boolean) => {
    const next = new Map(picked);
    if (checked) next.set(id, name);
    else next.delete(id);
    onPickedChange(next);
  };

  const renderNode = (node: DeptNode, depth: number): ReactNode => {
    const hasChild = node.children.length > 0;
    const isCompany = node.type === 'company';
    const isOpen = !collapsedIds.has(node.id);
    return (
      <div className="tree-node" key={node.id}>
        <div className="tree-item" style={{ paddingLeft: 8 + depth * 14 }}>
          <span
            className={`arrow ${hasChild ? (isOpen ? 'open' : '') : 'leaf'}`}
            onClick={() => hasChild && toggleNode(node.id)}
          >
            <IconArrow />
          </span>
          {!isCompany && (
            <Checkbox checked={picked.has(node.id)} onChange={(c) => setChecked(node.id, node.name, c)} />
          )}
          <span className="label" style={{ marginLeft: 6 }}>{node.name}</span>
          {node.desc && <span style={{ color: 'var(--text-4)', fontSize: 12, marginLeft: 'auto' }}>{node.desc}</span>}
        </div>
        {hasChild && isOpen && (
          <div className="tree-children">{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="transfer">
      <div className="side">
        <div className="s-head">
          <div className="input-icon" style={{ flex: 1 }}>
            <span className="ic"><IconSearch /></span>
            <input className="input" placeholder="搜索部门" />
          </div>
        </div>
        <div className="s-body">{DEPT_TREE.map((n) => renderNode(n, 0))}</div>
      </div>
      <div className="side">
        <div className="s-head">
          已选择 <b style={{ margin: '0 3px', color: 'var(--primary)' }}>{picked.size}</b>/10000
          <span className="clear" onClick={() => onPickedChange(new Map())}>清空</span>
        </div>
        <div className="s-body">
          {picked.size === 0 ? (
            <div style={{ color: 'var(--text-4)', textAlign: 'center', padding: '24px 0' }}>暂未选择</div>
          ) : (
            [...picked.entries()].map(([id, name]) => (
              <div className="selected-item" key={id}>
                <span className="av">{name.slice(0, 1)}</span>
                <span>{name}</span>
                <span className="rm" onClick={() => setChecked(id, name, false)}><IconXsm /></span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- 添加成员（图一：左侧部门成员选择 + 右侧已选 + 运营归属） ---------- */
export type RoleAssign = { groupId: string; parentId: string; groupName: string; memberIds: string[] };
export type OpsBindCfg = Record<OpsChannel, Record<OpsRole, RoleAssign>>;
const emptyAssign = (): RoleAssign => ({ groupId: '', parentId: '', groupName: '', memberIds: [] });
export function AddMemberModal({ onClose, onConfirm, notify, opsGroups, opsMembers, sourceMembers }: {
  onClose: () => void;
  onConfirm: (members: Member[], roles: string[], opsPatch?: { groups: OpsChannelGroups; members: OpsChannelMembers }) => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
  opsGroups: OpsChannelGroups;
  opsMembers: OpsChannelMembers;
  sourceMembers: Member[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<1 | 2>(1);
  const [opsCfg, setOpsCfg] = useState<OpsBindCfg>(() => ({
    taobao: { leader: emptyAssign(), specialist: emptyAssign(), assistant: emptyAssign() },
    video: { leader: emptyAssign(), specialist: emptyAssign(), assistant: emptyAssign() },
  }));

  const selectedMembers = useMemo(() => sourceMembers.filter((m) => selectedIds.has(m.id)), [sourceMembers, selectedIds]);
  const validSource = useMemo(() => sourceMembers.filter((m) => m.status !== 'pending'), [sourceMembers]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const bulkSetMembers = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
      return next;
    });
  };

  const confirm = () => {
    if (selectedMembers.length === 0) { notify('请至少选择一名成员', 'error'); return; }

    const patchGroups = { ...opsGroups };
    const patchMembers: OpsChannelMembers = { ...opsMembers };

    for (const { key, label } of OPS_CHANNELS) {
      const ch = opsCfg[key];
      /* 归属必选：每个平台都须为所有成员分配职位 */
      const assigned = new Set([...ch.leader.memberIds, ...ch.specialist.memberIds, ...ch.assistant.memberIds]);
      if (selectedMembers.some((m) => !assigned.has(m.id))) { notify(`请为${label}平台所有成员分配职位`, 'error'); return; }

      if (ch.leader.memberIds.length > 0) {
        /* 一个组只有一个组长：组长职位新建运营组 */
        const name = ch.leader.groupName.trim();
        if (!name) { notify(`请输入${label}平台新建运营组名称`, 'error'); return; }
        const member = selectedMembers.find((m) => m.id === ch.leader.memberIds[0]);
        if (member) {
          const gid = newGroupId();
          patchGroups[key] = [...patchGroups[key], { id: gid, channel: key, name, leaderId: member.id, createdAt: nowStamp() }];
          patchMembers[key] = patchMembers[key].filter((m) => m.memberId !== member.id);
          patchMembers[key].push({ memberId: member.id, name: member.name, role: 'leader', groupId: gid, parentId: null, addedBy: '管理员', addedAt: nowStamp() });
        }
      }

      for (const r of ['specialist', 'assistant'] as OpsRole[]) {
        const ids = ch[r].memberIds;
        if (ids.length === 0) continue;
        const group = patchGroups[key].find((g) => g.id === ch[r].groupId);
        if (!group) { notify(`请选择${label}平台${OPS_ROLE_LABEL[r]}的运营组`, 'error'); return; }
        let parentId = ch[r].parentId;
        if (r === 'specialist') {
          /* 选组后组长直接代入，无需再选 */
          parentId = patchMembers[key].find((m) => m.groupId === group.id && m.role === 'leader')?.memberId ?? '';
          if (!parentId) { notify(`组「${group.name}」暂无组长，请选择其它组`, 'error'); return; }
        } else if (!parentId) {
          notify(`请选择${label}平台${OPS_ROLE_LABEL[r]}的挂靠专员`, 'error'); return;
        }
        ids.forEach((id) => {
          const member = selectedMembers.find((m) => m.id === id);
          if (!member) return;
          patchMembers[key] = patchMembers[key].filter((m) => m.memberId !== id);
          patchMembers[key].push({ memberId: id, name: member.name, role: r, groupId: group.id, parentId, addedBy: '管理员', addedAt: nowStamp() });
        });
      }
    }

    onConfirm(selectedMembers, [], { groups: patchGroups, members: patchMembers });
    onClose();
  };

  return (
    <Modal
      title="分配成员"
      sub={step === 1 ? '步骤 1/2 · 选择成员' : '步骤 2/2 · 分配运营归属'}
      size="xl"
      onClose={onClose}
      foot={
        <>
          {step === 2 && <button className="btn" onClick={() => setStep(1)}>上一步</button>}
          <button className="btn" onClick={onClose}>取消</button>
          {step === 1 ? (
            <button
              className="btn primary"
              onClick={() => {
                if (selectedMembers.length === 0) { notify('请至少选择一名成员', 'error'); return; }
                setStep(2);
              }}
            >下一步</button>
          ) : (
            <button className="btn primary" onClick={confirm}>确定</button>
          )}
        </>
      }>
      {step === 1 ? (
        <div className="member-transfer">
          <MemberPickPanel members={validSource} selectedIds={selectedIds} onToggle={toggleMember} onBulk={bulkSetMembers} />
          <div className="member-transfer-right">
            <div className="mtr-head">已选择({selectedMembers.length}/1000)</div>
            <div className="mtr-body">
              {selectedMembers.length === 0 ? (
                <div className="mtr-empty">暂未选择成员</div>
              ) : (
                selectedMembers.map((m) => (
                  <div className="mtr-selected" key={m.id}>
                    <span className="og-ava" style={{ background: avaColor(m.name) }}>{m.name.slice(0, 1)}</span>
                    <span className="mtr-name">{m.name}</span>
                    <span className="mtr-rm" onClick={() => removeMember(m.id)}><IconXsm /></span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="am-step2">
          <div className="am-step2-sum">
            <span className="am-sum-label">已选成员</span>
            <div className="am-sum-tags">
              {selectedMembers.map((m) => (
                <span key={m.id} className="am-sum-tag">
                  <span className="og-ava" style={{ background: avaColor(m.name) }}>{m.name.slice(0, 1)}</span>
                  {m.name}
                </span>
              ))}
            </div>
          </div>
          <OpsBindingStep opsGroups={opsGroups} opsMembers={opsMembers} opsCfg={opsCfg} onChange={setOpsCfg} selectedMembers={selectedMembers} />
        </div>
      )}
    </Modal>
  );
}

/* 组织树路径：根 → 目标部门 */
function deptPathOf(id: string): DeptNode[] {
  const walk = (ns: DeptNode[]): DeptNode[] => {
    for (const n of ns) {
      if (n.id === id) return [n];
      const sub = walk(n.children);
      if (sub.length) return [n, ...sub];
    }
    return [];
  };
  return walk(DEPT_MGMT_TREE);
}

/* ---------- 成员选择面板：钻取式组织树（子部门 + 成员混排） ----------
   disabledIds：禁选成员（灰显不可勾）；noDeptPick：仅可选人，组织/全选不可勾 */
export function MemberPickPanel({ members, selectedIds, onToggle, onBulk, disabledIds, noDeptPick }: {
  members: Member[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onBulk: (ids: string[], checked: boolean) => void;
  disabledIds?: Set<string>;
  noDeptPick?: boolean;
}) {
  const [q, setQ] = useState('');
  const [path, setPath] = useState<DeptNode[]>(() => deptPathOf('c1'));

  const cur = path[path.length - 1];
  const kw = q.trim().toLowerCase();
  const searching = kw !== '';

  const childDepts = searching ? [] : cur.children;
  const directMembers = searching
    ? members.filter((m) => m.name.toLowerCase().includes(kw) || m.account.toLowerCase().includes(kw))
    : members.filter((m) => m.deptId === cur.id);
  const allUnderIds = searching ? [] : membersOfDept(cur.id, members).map((m) => m.id);

  const selCount = (ids: string[]) => ids.reduce((n, id) => n + (selectedIds.has(id) ? 1 : 0), 0);

  return (
    <div className="member-transfer-left">
      <div className="mtr-head">
        <div className="input-icon">
          <span className="ic"><IconSearch /></span>
          <input className="input" placeholder="搜索成员" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {!searching && (
        <div className="mtr-breadcrumb">
          <span className="seg" onClick={() => setPath(deptPathOf('c1'))}>通讯录</span>
          {path.map((n, i) => (
            <span key={n.id}>
              <span className="sep">&gt;</span>
              <span
                className={`seg ${i === path.length - 1 ? 'cur' : ''}`}
                onClick={() => { if (i < path.length - 1) setPath(path.slice(0, i + 1)); }}
              >{n.name}</span>
            </span>
          ))}
        </div>
      )}

      {!searching && !noDeptPick && allUnderIds.length > 0 && (
        <div
          className="mtr-selectall"
          onClick={() => onBulk(allUnderIds, selCount(allUnderIds) < allUnderIds.length)}
        >
          <span onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selCount(allUnderIds) === allUnderIds.length}
              indeterminate={selCount(allUnderIds) > 0 && selCount(allUnderIds) < allUnderIds.length}
              onChange={() => onBulk(allUnderIds, selCount(allUnderIds) < allUnderIds.length)}
            />
          </span>
          全选
        </div>
      )}

      <div className="mtr-member-list">
        {childDepts.map((d) => {
          const ids = membersOfDept(d.id, members).map((m) => m.id);
          const sel = selCount(ids);
          return (
            <div key={d.id} className="mtr-row" onClick={() => setPath([...path, d])}>
              {!noDeptPick && (
                <span onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={ids.length > 0 && sel === ids.length}
                    indeterminate={sel > 0 && sel < ids.length}
                    onChange={(c) => onBulk(ids, c)}
                  />
                </span>
              )}
              <span className="mtr-dept-ic"><IconDept /></span>
              <div className="mtr-m-info">
                <div className="nm">{d.name}</div>
                <div className="dp">{ids.length}人</div>
              </div>
              {d.children.length > 0 && <span className="mtr-drill">下级</span>}
            </div>
          );
        })}

        {directMembers.map((m) => {
          const dis = disabledIds?.has(m.id) ?? false;
          return (
            <div key={m.id} className={`mtr-row${dis ? ' disabled' : ''}`} onClick={() => { if (!dis) onToggle(m.id); }}>
              <span onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selectedIds.has(m.id)} disabled={dis} onChange={() => { if (!dis) onToggle(m.id); }} />
              </span>
              <span className="og-ava" style={{ background: avaColor(m.name) }}>{m.name.slice(0, 1)}</span>
              <div className="mtr-m-info">
                <div className="nm">{m.name}</div>
                <div className="dp">{m.account}</div>
              </div>
            </div>
          );
        })}

        {!childDepts.length && !directMembers.length && (
          <div className="mtr-empty">{searching ? '无匹配成员' : '暂无成员'}</div>
        )}
      </div>
    </div>
  );
}

/* ---------- 运营归属配置（平台 tab · 先选职位再选人：组长单选 / 专员·助理多选） ---------- */
function OpsBindingStep({ opsGroups, opsMembers, opsCfg, onChange, selectedMembers }: {
  opsGroups: OpsChannelGroups;
  opsMembers: OpsChannelMembers;
  opsCfg: OpsBindCfg;
  onChange: (next: OpsBindCfg) => void;
  selectedMembers: Member[];
}) {
  const [tab, setTab] = useState<OpsChannel>('taobao');
  const [role, setRole] = useState<OpsRole>('specialist');
  const ch = opsCfg[tab];
  const cfg = ch[role];
  const update = (patch: Partial<RoleAssign>) => {
    onChange({ ...opsCfg, [tab]: { ...ch, [role]: { ...cfg, ...patch } } });
  };

  const group = opsGroups[tab].find((g) => g.id === cfg.groupId);
  const groupLeader = group ? opsMembers[tab].find((m) => m.groupId === group.id && m.role === 'leader') : undefined;
  const specialists = opsMembers[tab].filter((m) => m.role === 'specialist' && m.groupId === cfg.groupId);

  const assignedRoleOf = (id: string) =>
    (['leader', 'specialist', 'assistant'] as OpsRole[]).find((r) => ch[r].memberIds.includes(id));

  /* 点选成员：先从本平台各职位移除，再按单/多选写入当前职位 */
  const togglePick = (id: string) => {
    const wasOn = cfg.memberIds.includes(id);
    const nextCh = { ...ch };
    (['leader', 'specialist', 'assistant'] as OpsRole[]).forEach((r) => {
      nextCh[r] = { ...nextCh[r], memberIds: nextCh[r].memberIds.filter((x) => x !== id) };
    });
    if (!wasOn) nextCh[role] = { ...nextCh[role], memberIds: role === 'leader' ? [id] : [...cfg.memberIds, id] };
    onChange({ ...opsCfg, [tab]: nextCh });
  };

  const sumParts = (['leader', 'specialist', 'assistant'] as OpsRole[])
    .filter((r) => ch[r].memberIds.length > 0)
    .map((r) => `${OPS_ROLE_LABEL[r]}×${ch[r].memberIds.length}`);

  return (
    <div className="og-binding-step">
      <div className="og-bind-head">
        <div className="og-tabs og-bind-tabs">
          {OPS_CHANNELS.map((c) => (
            <button key={c.key} type="button" className={`og-tab ${tab === c.key ? 'active' : ''}`} onClick={() => setTab(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        {sumParts.length > 0 && <span className="og-binding-sum">{sumParts.join(' · ')}</span>}
      </div>
      <div className="og-bind-panel">
        <div className="og-bind-field">
          <label>职位</label>
          <div className="og-role-pills">
            {(['leader', 'specialist', 'assistant'] as OpsRole[]).map((r) => (
              <button key={r} type="button" className={`og-pill ${role === r ? 'on' : ''}`} onClick={() => setRole(r)}>
                {OPS_ROLE_LABEL[r]}
                {ch[r].memberIds.length > 0 && <i className="og-pill-n">{ch[r].memberIds.length}</i>}
              </button>
            ))}
          </div>
        </div>
        {role === 'leader' && (
          <>
            <div className="og-bind-tip">一个运营组仅设一名组长，组长职位将在确定后新建运营组。</div>
            <div className="og-bind-field">
              <label>新建运营组名称</label>
              <input
                className="input"
                value={cfg.groupName}
                placeholder="请输入组名"
                maxLength={20}
                onChange={(e) => update({ groupName: e.target.value })}
              />
            </div>
          </>
        )}
        {role === 'specialist' && (
          <div className="og-bind-field">
            <label>运营组</label>
            <BubbleSelect
              className="input"
              value={cfg.groupId || '请选择'}
              onChange={(v) => update({ groupId: v, parentId: '' })}
              options={opsGroups[tab].map((g) => ({ value: g.id, label: g.name }))}
            />
            {group ? (
              groupLeader ? (
                <div className="og-bind-hint">将自动挂靠该组组长：{groupLeader.name}</div>
              ) : (
                <div className="og-bind-hint warn">该组暂无组长，请选择其它组</div>
              )
            ) : (
              <div className="og-bind-hint">选择运营组后自动挂靠该组组长</div>
            )}
          </div>
        )}
        {role === 'assistant' && (
          <div className="og-bind-grid">
            <div className="og-bind-field">
              <label>运营组</label>
              <BubbleSelect
                className="input"
                value={cfg.groupId || '请选择'}
                onChange={(v) => update({ groupId: v, parentId: '' })}
                options={opsGroups[tab].map((g) => ({ value: g.id, label: g.name }))}
              />
            </div>
            <div className="og-bind-field">
              <label>挂靠专员</label>
              <BubbleSelect
                className="input"
                value={cfg.parentId || '请选择'}
                onChange={(v) => update({ parentId: v })}
                options={specialists.map((m) => ({ value: m.memberId, label: m.name }))}
              />
            </div>
          </div>
        )}
        <div className="og-bind-field">
          <label>选择成员{role === 'leader' ? '（单选）' : '（可多选）'}</label>
          <div className="am-pick-list">
            {selectedMembers.map((m) => {
              const ar = assignedRoleOf(m.id);
              const on = ar === role;
              return (
                <button key={m.id} type="button" className={`am-pick${on ? ' on' : ''}`} onClick={() => togglePick(m.id)}>
                  <span className="og-ava" style={{ background: avaColor(m.name) }}>{m.name.slice(0, 1)}</span>
                  <span className="nm">{m.name}</span>
                  {on ? <span className="ck"><IconCheck /></span> : ar ? <i className="as">{OPS_ROLE_LABEL[ar]}</i> : null}
                </button>
              );
            })}
          </div>
          {role === 'leader'
            ? <div className="og-bind-hint">组长仅可单选 1 名成员，点选新成员将自动替换。</div>
            : <div className="og-bind-hint">已在他职的成员会显示当前职位，点选将改配到本职位。</div>}
        </div>
      </div>
    </div>
  );
}
