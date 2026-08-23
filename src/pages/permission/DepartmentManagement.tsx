/* =========================================================
   Funion 权限管理 · 部门管理（移植自原型 department.html）
   部门成员来源于成员管理同步，本页只做归属与运营组绑定
   ========================================================= */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DP_TREE, DP_MEMBERS, INITIAL_MEMBERS, findDpNode, renameDpNode, roleById, type DpTreeNode, type Member } from './data';
import {
  AddMemberModal,
  Modal,
  ToastWrap,
  useToasts,
  IconArrow,
  IconMore,
  IconSearch,
  IconWarn,
} from './shared';
import {
  INITIAL_OPS_GROUPS,
  INITIAL_OPS_MEMBERS,
  OPS_CHANNELS,
  OPS_ROLE_LABEL,
  getMemberAllAssignments,
  newGroupId,
  nowStamp,
  opsMemberSource,
  type OpsChannel,
  type OpsChannelGroups,
  type OpsChannelMembers,
  type OpsRole,
} from './opsGroupData';
import BubbleSelect from '../../components/BubbleSelect';
import './style.css';

/* ---------- 弹窗状态 ---------- */
type ModalState =
  | { kind: 'deptForm'; title: string; value: string; onOk: (v: string) => void }
  | { kind: 'confirm'; title: string; msg: ReactNode; okText: string; danger?: boolean; onOk: () => void }
  | { kind: 'addMember' }
  | { kind: 'editOps'; memberId: string };

export interface DeptMember {
  id: string;
  name: string;
  roles: string[];
  adder: string;
  at: string;
}

/** 部门成员池：同步自成员管理，添加时从该池选择 */
const SOURCE_MEMBERS: Member[] = INITIAL_MEMBERS;

/** 搜索过滤（保留命中节点及其祖先，命中节点保留原 children） */
function filterTree(nodes: DpTreeNode[], dq: string): DpTreeNode[] {
  if (!dq) return nodes;
  const hit = (s: string) => s.toLowerCase().includes(dq.toLowerCase());
  const res: DpTreeNode[] = [];
  nodes.forEach((n) => {
    const kids = n.children ? filterTree(n.children, dq) : [];
    if (hit(n.name) || kids.length) {
      res.push({ ...n, children: kids.length ? kids : (hit(n.name) ? (n.children || []) : []) });
    }
  });
  return res;
}

export default function DepartmentManagement() {
  const [tree, setTree] = useState<DpTreeNode[]>(DP_TREE);
  const [curDeptId, setCurDeptId] = useState('t1-1-1');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['t1', 't1-1', 't1-1-1', 't1-1-1-1']));
  const [dq, setDq] = useState('');
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string; name: string } | null>(null);
  const [addCtx, setAddCtx] = useState<{ x: number; y: number } | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  /* 部门成员列表（本地维护，添加成员时从 SOURCE_MEMBERS 选择） */
  const [deptMembers, setDeptMembers] = useState<DeptMember[]>(() =>
    DP_MEMBERS.map((m, i) => ({ ...m, id: `m${i + 1}` })),
  );

  /* 运营组数据（作为全局状态提升，后续可抽离到上层 context） */
  const [opsGroups, setOpsGroups] = useState<OpsChannelGroups>(INITIAL_OPS_GROUPS);
  const [opsMembers, setOpsMembers] = useState<OpsChannelMembers>(INITIAL_OPS_MEMBERS);

  const { toasts, pushToast } = useToasts();
  const curDept = findDpNode(curDeptId, tree);

  /* 菜单外点击关闭 */
  useEffect(() => {
    if (!ctx && !addCtx) return;
    const close = () => { setCtx(null); setAddCtx(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [ctx, addCtx]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showDeptCtx = (e: React.MouseEvent, node: DpTreeNode) => {
    e.stopPropagation();
    e.preventDefault();
    setAddCtx(null);
    setCtx({ x: e.clientX, y: e.clientY, id: node.id, name: node.name });
  };

  const handleCtxAct = (act: string) => {
    if (!ctx) return;
    const { id, name } = ctx;
    setCtx(null);
    if (act === 'edit') {
      setModal({
        kind: 'deptForm', title: '编辑部门', value: name,
        onOk: (v) => { setTree((prev) => renameDpNode(prev, id, v)); pushToast('已保存'); }
      });
    }
    if (act === 'addSub') {
      setModal({
        kind: 'deptForm', title: '添加部门', value: '',
        onOk: (v) => pushToast(`已在「${name}」下添加「${v}」`)
      });
    }
    if (act === 'del') {
      setModal({
        kind: 'confirm', title: '删除部门', danger: true, okText: '删除',
        msg: <>确定删除部门「<b>{name}</b>」？成员将移至上级部门。</>,
        onOk: () => pushToast('已删除')
      });
    }
  };

  const renderNode = (node: DpTreeNode, depth: number): ReactNode => {
    const hasChild = node.children.length > 0;
    const isOpen = dq ? true : expanded.has(node.id);
    const active = node.id === curDeptId;
    return (
      <div className="tree-node" key={node.id}>
        <div
          className={`tree-item dept-item ${active ? 'active' : ''}`}
          onClick={() => setCurDeptId(node.id)}
          onContextMenu={(e) => showDeptCtx(e, node)}
        >
          <span
            className={`arrow ${hasChild ? (isOpen ? 'open' : '') : 'leaf'}`}
            onClick={(e) => { e.stopPropagation(); if (hasChild) toggleExpand(node.id); }}
          >
            <IconArrow />
          </span>
          <span className="label">{node.name}</span>
          <span className="node-more" onClick={(e) => showDeptCtx(e, node)}><IconMore /></span>
        </div>
        {hasChild && (
          <div className={`tree-children ${isOpen ? '' : 'collapsed'}`}>
            {node.children.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filtered = filterTree(tree, dq.trim());
  const closeModal = () => setModal(null);

  return (
    <>
      <div className="workspace">
        {/* 左：部门树 */}
        <div className="tree-panel">
          <div className="dept-search">
            <div className="input-icon">
              <span className="ic"><IconSearch /></span>
              <input className="input" placeholder="搜索部门名称" value={dq} onChange={(e) => setDq(e.target.value)} />
            </div>
            <button
              className="icon-btn"
              title="添加部门"
              onClick={(e) => {
                e.stopPropagation();
                setCtx(null);
                const r = e.currentTarget.getBoundingClientRect();
                setAddCtx({ x: r.left, y: r.bottom + 6 });
              }}
            >+</button>
          </div>
          <div className="tree-body">
            {filtered.length ? filtered.map((n) => renderNode(n, 0)) : (
              <div className="empty" style={{ padding: '20px 0' }}>无匹配部门</div>
            )}
          </div>
        </div>

        {/* 右：部门成员 */}
        <div className="content-panel">
          <div className="content-head">
            <span className="title">{curDept?.name || ''}</span>
            <div className="actions">
              <button className="btn primary" onClick={() => setModal({ kind: 'addMember' })}>添加成员</button>
            </div>
          </div>
          <div className="content-body">
            <table className="table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>角色</th>
                  <th>运营归属</th>
                  <th>添加人</th>
                  <th>添加时间</th>
                  <th style={{ width: 120 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {deptMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="col-name">{m.name}</td>
                    <td>
                      {m.roles.length ? (
                        <div className="role-tags">
                          {m.roles.slice(0, 3).map((r, ri) => <span className="tag" key={ri}>{r}</span>)}
                          {m.roles.length > 3 && <span className="more">···</span>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-4)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <OpsAssignmentCell
                        memberId={m.id}
                        opsGroups={opsGroups}
                        opsMembers={opsMembers}
                      />
                    </td>
                    <td>{m.adder}</td>
                    <td style={{ color: 'var(--text-3)' }}>{m.at}</td>
                    <td>
                      <div className="op">
                        <a onClick={() => setModal({ kind: 'editOps', memberId: m.id })}>编辑归属</a>
                        <a className="danger" onClick={() => pushToast('已移除')}>移除</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 右键/更多菜单：部门 */}
      {ctx && (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <div className="item" onClick={() => handleCtxAct('edit')}>编辑部门</div>
          <div className="item" onClick={() => handleCtxAct('addSub')}>添加下级部门</div>
          <div className="item danger" onClick={() => handleCtxAct('del')}>删除部门</div>
        </div>
      )}
      {/* 「+」下拉：添加部门 */}
      {addCtx && (
        <div className="ctx-menu" style={{ left: addCtx.x, top: addCtx.y }}>
          <div className="item" onClick={() => {
            setAddCtx(null);
            setModal({
              kind: 'deptForm', title: '添加部门', value: '',
              onOk: (v) => pushToast(`已添加部门「${v}」`)
            });
          }}>添加部门</div>
        </div>
      )}

      {/* 弹窗 */}
      {modal?.kind === 'deptForm' && (
        <DeptFormModal title={modal.title} value={modal.value} onOk={modal.onOk} onClose={closeModal} />
      )}
      {modal?.kind === 'confirm' && (
        <Modal title={modal.title} onClose={closeModal} foot={
          <>
            <button className="btn" onClick={closeModal}>取消</button>
            <button className={`btn ${modal.danger ? 'danger' : 'primary'}`} onClick={() => { modal.onOk(); closeModal(); }}>{modal.okText}</button>
          </>
        }>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ color: modal.danger ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }}><IconWarn /></span>
            <div style={{ color: 'var(--text-2)', lineHeight: 1.6, paddingTop: 1 }}>{modal.msg}</div>
          </div>
        </Modal>
      )}
      {modal?.kind === 'addMember' && (
        <AddMemberModal
          opsGroups={opsGroups}
          opsMembers={opsMembers}
          sourceMembers={SOURCE_MEMBERS}
          onClose={closeModal}
          notify={pushToast}
          onConfirm={(members, roles, opsPatch) => {
            if (opsPatch) {
              setOpsGroups(opsPatch.groups);
              setOpsMembers(opsPatch.members);
            }
            setDeptMembers((prev) => [
              ...prev,
              ...members.map((member) => ({
                id: member.id,
                name: member.name,
                roles: roles.map((rid) => roleById(rid)?.name ?? rid),
                adder: '管理员',
                at: nowStamp(),
              })),
            ]);
            pushToast(`已添加 ${members.length} 名成员到当前部门`);
          }}
        />
      )}
      {modal?.kind === 'editOps' && (
        <EditOpsAssignmentModal
          memberId={modal.memberId}
          opsGroups={opsGroups}
          opsMembers={opsMembers}
          onChange={(nextGroups, nextMembers) => { setOpsGroups(nextGroups); setOpsMembers(nextMembers); }}
          onClose={closeModal}
          notify={pushToast}
        />
      )}

      {/* toast */}
      <ToastWrap toasts={toasts} />
    </>
  );
}

/* =========================================================
   运营归属展示单元格：每个平台单独一行
   ========================================================= */
function OpsAssignmentCell({ memberId, opsGroups, opsMembers }: {
  memberId: string;
  opsGroups: OpsChannelGroups;
  opsMembers: OpsChannelMembers;
}) {
  const list = useMemo(() => getMemberAllAssignments(memberId, opsGroups, opsMembers), [memberId, opsGroups, opsMembers]);
  if (!list.length) return <span style={{ color: 'var(--text-4)' }}>未配置</span>;
  return (
    <div className="og-assign-cell">
      {list.map((a) => (
        <div key={a.channel} className="og-assign-row">
          <span className="og-assign-channel">{a.channelLabel}</span>
          <span className="og-assign-group">{a.group.name}</span>
          <span className="og-assign-role">{OPS_ROLE_LABEL[a.role]}</span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   编辑成员运营归属弹窗
   ========================================================= */
function EditOpsAssignmentModal({ memberId, opsGroups, opsMembers, onChange, onClose, notify }: {
  memberId: string;
  opsGroups: OpsChannelGroups;
  opsMembers: OpsChannelMembers;
  onChange: (groups: OpsChannelGroups, members: OpsChannelMembers) => void;
  onClose: () => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [channel, setChannel] = useState<OpsChannel>('taobao');
  const [role, setRole] = useState<OpsRole | ''>('');
  const [groupId, setGroupId] = useState<string>('');
  const [parentId, setParentId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');

  const currentGroups = opsGroups[channel];
  const currentMembers = opsMembers[channel];
  const existing = currentMembers.find((m) => m.memberId === memberId);

  /* 初始化选择 */
  useEffect(() => {
    if (existing) {
      setRole(existing.role);
      setGroupId(existing.groupId);
      setParentId(existing.parentId ?? '');
      setGroupName('');
    } else {
      setRole('');
      setGroupId('');
      setParentId('');
      setGroupName('');
    }
  }, [channel, existing]);

  const specialistOptions = currentMembers.filter((m) => m.role === 'specialist' && m.groupId === groupId && m.memberId !== memberId);
  const selGroup = currentGroups.find((g) => g.id === groupId);
  const selGroupLeader = selGroup ? currentMembers.find((m) => m.groupId === selGroup.id && m.role === 'leader') : undefined;

  const save = () => {
    if (!role) { notify('请选择职位', 'error'); return; }
    if (role === 'leader' && !groupName.trim()) { notify('请输入新建运营组名称', 'error'); return; }
    if (role !== 'leader' && !groupId) { notify('请选择运营组', 'error'); return; }

    // 限制：组长必须先转交才能变更角色
    if (existing?.role === 'leader' && role !== 'leader') {
      notify('组长请先至「运营组管理」进行转交', 'error');
      return;
    }
    // 限制：专员名下有助理时不能降为助理
    if (existing?.role === 'specialist' && role === 'assistant') {
      const hasAssist = currentMembers.some((m) => m.role === 'assistant' && m.parentId === memberId);
      if (hasAssist) { notify('该专员名下仍有助理，不能降为助理', 'error'); return; }
    }
    if (role === 'specialist' && !selGroupLeader) { notify('该组暂无组长，请选择其它组', 'error'); return; }
    if (role === 'assistant' && !parentId) { notify('请选择挂靠专员', 'error'); return; }

    const nextGroups: OpsChannelGroups = { ...opsGroups, [channel]: [...opsGroups[channel]] };
    const nextMembers: OpsChannelMembers = { ...opsMembers, [channel]: [...opsMembers[channel]] };
    const srcName = opsMemberSource(memberId)?.name ?? '';

    nextMembers[channel] = nextMembers[channel].filter((m) => m.memberId !== memberId);

    if (role === 'leader') {
      // 组长职位：确定后新建运营组
      const gid = newGroupId();
      nextGroups[channel] = [...nextGroups[channel], { id: gid, channel, name: groupName.trim(), leaderId: memberId, createdAt: nowStamp() }];
      nextMembers[channel].push({
        memberId, name: srcName, role: 'leader', groupId: gid, parentId: null, addedBy: '管理员', addedAt: nowStamp(),
      });
    } else if (role === 'specialist') {
      // 专员：自动挂靠该组组长
      nextMembers[channel].push({
        memberId, name: srcName, role, groupId, parentId: selGroupLeader!.memberId, addedBy: '管理员', addedAt: nowStamp(),
      });
    } else {
      nextMembers[channel].push({
        memberId, name: srcName, role, groupId, parentId, addedBy: '管理员', addedAt: nowStamp(),
      });
    }

    onChange(nextGroups, nextMembers);
    notify('已更新运营归属');
    onClose();
  };

  return (
    <Modal title="编辑运营归属" sub="修改该成员在各平台的运营组归属" size="md" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={save}>保存</button>
      </>
    }>
      <div className="og-tabs og-edit-tabs">
        {OPS_CHANNELS.map((c) => (
          <button key={c.key} type="button" className={`og-tab ${channel === c.key ? 'active' : ''}`} onClick={() => setChannel(c.key)}>{c.label}</button>
        ))}
      </div>

      <div className="form-item">
        <label>职位</label>
        <BubbleSelect
          className="input"
          value={role || '请选择'}
          onChange={(v) => setRole(v as OpsRole | '')}
          options={[
            { value: 'leader', label: '运营组长', disabled: existing?.role === 'leader' },
            { value: 'specialist', label: '运营专员', disabled: existing?.role === 'leader' },
            { value: 'assistant', label: '运营助理', disabled: existing?.role === 'leader' || existing?.role === 'specialist' },
          ]}
        />
        {existing?.role === 'leader' && (
          <div className="form-tip" style={{ marginTop: 6 }}>组长变更请前往「运营组管理」使用转交功能。</div>
        )}
      </div>

      {role === 'leader' && (
        <>
          <div className="form-tip" style={{ margin: '2px 0 10px' }}>一个运营组仅设一名组长，组长职位将在保存后新建运营组。</div>
          <div className="form-item">
            <label>新建运营组名称</label>
            <input
              className="input"
              value={groupName}
              placeholder="请输入组名"
              maxLength={20}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
        </>
      )}

      {role === 'specialist' && (
        <div className="form-item">
          <label>运营组</label>
          <BubbleSelect
            className="input"
            value={groupId || '请选择'}
            onChange={(v) => { setGroupId(v); setParentId(''); }}
            options={currentGroups.map((g) => ({ value: g.id, label: g.name }))}
          />
          <div className="form-tip" style={{ marginTop: 6 }}>
            {selGroup
              ? (selGroupLeader ? `将自动挂靠该组组长：${selGroupLeader.name}` : '该组暂无组长，请选择其它组')
              : '选择运营组后自动挂靠该组组长'}
          </div>
        </div>
      )}

      {role === 'assistant' && (
        <>
          <div className="form-item">
            <label>运营组</label>
            <BubbleSelect
              className="input"
              value={groupId || '请选择'}
              onChange={(v) => { setGroupId(v); setParentId(''); }}
              options={currentGroups.map((g) => ({ value: g.id, label: g.name }))}
            />
          </div>
          <div className="form-item">
            <label>挂靠专员</label>
            <BubbleSelect
              className="input"
              value={parentId || '请选择'}
              onChange={(v) => setParentId(v)}
              options={specialistOptions.map((m) => ({ value: m.memberId, label: m.name }))}
            />
          </div>
        </>
      )}
    </Modal>
  );
}

/* ---------- 添加/编辑部门弹窗 ---------- */
function DeptFormModal({ title, value, onOk, onClose }: {
  title: string;
  value: string;
  onOk: (v: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <Modal title={title} onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!val.trim()) { ref.current?.focus(); return; } onOk(val.trim()); onClose(); }}>确定</button>
      </>
    }>
      <div className="cnt-wrap">
        <input className="input" ref={ref} value={val} placeholder="请输入部门名称" maxLength={10} onChange={(e) => setVal(e.target.value)} />
        <span className="cnt">{val.length}/10</span>
      </div>
    </Modal>
  );
}
