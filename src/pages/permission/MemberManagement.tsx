/* =========================================================
   Funion 权限管理 · 成员管理（移植自原型 index.html + app.js + flows.js）
   ========================================================= */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ORG_TREE,
  INITIAL_MEMBERS,
  MEMBER_LOGS,
  STATUS_TEXT,
  buildOrgPath,
  initialExpandedOrgIds,
  renameOrgNode,
  roleById,
  type Member,
  type OrgNode,
} from './data';
import {
  DeptTransfer,
  Modal,
  RoleSelector,
  ToastWrap,
  useToasts,
  IconArrow,
  IconMore,
  IconSearch,
  IconSync,
  IconWarn,
  IconX,
} from './shared';
import './style.css';
import BubbleSelect from '../../components/BubbleSelect';

/* ---------- 弹窗状态 ---------- */
type ModalState =
  | { kind: 'confirm'; title: string; msg: ReactNode; okText: string; danger?: boolean; onOk: () => void }
  | { kind: 'input'; title: string; value: string; onOk: (v: string) => void }
  | { kind: 'assignRole'; ids: string[] }
  | { kind: 'moveDept'; ids: string[]; onPick?: (name: string) => void }
  | { kind: 'edit'; id: string };

export default function MemberManagement() {
  /* 组织树 */
  const [orgTree, setOrgTree] = useState<OrgNode[]>(ORG_TREE);
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpandedOrgIds(ORG_TREE));
  const [currentOrg, setCurrentOrg] = useState('o1-1-1');
  /* 成员与选择 */
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /* 覆盖层 */
  const [modals, setModals] = useState<ModalState[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; id: string; name: string } | null>(null);
  const { toasts, pushToast } = useToasts();

  const pushModal = (m: ModalState) => setModals((prev) => [...prev, m]);

  /* 右键菜单外点击关闭 */
  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [ctx]);

  /* ---------- 成员操作 ---------- */
  const updateMembers = (ids: string[], patch: (m: Member) => Member) => {
    const set = new Set(ids);
    setMembers((prev) => prev.map((m) => (set.has(m.id) ? patch(m) : m)));
  };
  const removeMembers = (ids: string[]) => {
    const set = new Set(ids);
    setMembers((prev) => prev.filter((m) => !set.has(m.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.delete(i));
      return next;
    });
  };
  const clearSelected = () => setSelected(new Set());

  const confirmRemove = (ids: string[]) => {
    pushModal({
      kind: 'confirm', title: '移除成员', danger: true, okText: '移除',
      msg: ids.length === 1
        ? <>将从当前组织移除「<b>{members.find((m) => m.id === ids[0])?.name}</b>」，成员账号本身不会被删除。确定移除？</>
        : <>将从当前组织移除选中的 <b>{ids.length}</b> 名成员，成员账号本身不会被删除。确定移除？</>,
      onOk: () => { removeMembers(ids); pushToast('已移除'); }
    });
  };

  const handleBatch = (type: string) => {
    const ids = [...selected];
    if (!ids.length) return;
    if (type === 'cancel') { clearSelected(); return; }
    if (type === 'role') { pushModal({ kind: 'assignRole', ids }); return; }
    if (type === 'dept') { pushModal({ kind: 'moveDept', ids }); return; }
    if (type === 'freeze') {
      pushModal({
        kind: 'confirm', title: '批量冻结', danger: true, okText: '冻结',
        msg: <>确定冻结选中的 <b>{ids.length}</b> 名成员？</>,
        onOk: () => {
          updateMembers(ids, (m) => (m.status !== 'pending' ? { ...m, status: 'frozen' } : m));
          clearSelected(); pushToast('已批量冻结');
        }
      });
      return;
    }
    if (type === 'restore') {
      pushModal({
        kind: 'confirm', title: '批量恢复', okText: '恢复',
        msg: <>确定恢复选中的 <b>{ids.length}</b> 名成员？</>,
        onOk: () => {
          updateMembers(ids, (m) => (m.status === 'frozen' ? { ...m, status: 'normal' } : m));
          clearSelected(); pushToast('已批量恢复');
        }
      });
      return;
    }
    if (type === 'remove') confirmRemove(ids);
  };

  /* ---------- 组织树 ---------- */
  const toggleOrg = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showOrgCtx = (e: React.MouseEvent, node: OrgNode) => {
    e.stopPropagation();
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, id: node.id, name: node.name });
  };

  const handleOrgCtxAct = (act: string) => {
    if (!ctx) return;
    const { id, name } = ctx;
    setCtx(null);
    if (act === 'addSub') {
      pushModal({
        kind: 'input', title: '添加下级组织', value: '',
        onOk: (v) => pushToast(`已在「${name}」下添加「${v}」`)
      });
    }
    if (act === 'rename') {
      pushModal({
        kind: 'input', title: '重命名组织', value: name,
        onOk: (v) => { setOrgTree((prev) => renameOrgNode(prev, id, v)); pushToast('已重命名'); }
      });
    }
    if (act === 'del') {
      pushModal({
        kind: 'confirm', title: '删除组织', danger: true, okText: '删除',
        msg: <>确定删除组织「<b>{name}</b>」？其下成员将移动到上级组织。</>,
        onOk: () => pushToast('已删除')
      });
    }
  };

  const renderOrgNode = (node: OrgNode, depth: number): ReactNode => {
    const hasChild = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    const active = node.id === currentOrg;
    return (
      <div className="tree-node" key={node.id}>
        <div
          className={`tree-item ${active ? 'active' : ''}`}
          onClick={() => setCurrentOrg(node.id)}
          onContextMenu={(e) => showOrgCtx(e, node)}
        >
          <span
            className={`arrow ${hasChild ? (isOpen ? 'open' : '') : 'leaf'}`}
            onClick={(e) => { e.stopPropagation(); if (hasChild) toggleOrg(node.id); }}
          >
            <IconArrow />
          </span>
          <span className="label">{node.name}</span>
          <span className="node-more" onClick={(e) => showOrgCtx(e, node)}><IconMore /></span>
        </div>
        {hasChild && (
          <div className={`tree-children ${isOpen ? '' : 'collapsed'}`}>
            {node.children.map((c) => renderOrgNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  /* ---------- 表格派生 ---------- */
  const list = members;

  const drawerMember = drawerId ? members.find((m) => m.id === drawerId) : null;

  return (
    <>
      <div className="workspace">
        {/* 左：组织树 */}
        <div className="tree-panel">
          <div className="tree-search">
            <div className="input-icon">
              <span className="ic"><IconSearch /></span>
              <input className="input" placeholder="搜索组织" />
            </div>
          </div>
          <div className="tree-body">{orgTree.map((n) => renderOrgNode(n, 0))}</div>
        </div>

        {/* 右：内容 */}
        <div className="content-panel">
          <div className="content-head">
            <span className="title">{buildOrgPath(currentOrg, orgTree) || currentOrg}</span>
            <div className="actions">
              <button
                className="btn"
                onClick={() => pushModal({
                  kind: 'confirm', title: '钉钉同步', okText: '开始同步',
                  msg: <>将从钉钉通讯录同步组织架构与成员信息，已存在成员的角色配置会保留。确定同步？</>,
                  onOk: () => pushToast('同步任务已提交，预计 1 分钟完成')
                })}
              >
                <IconSync />
                钉钉同步
              </button>
            </div>
          </div>

          <div className="content-body">
            {/* 批量操作条 */}
            {selected.size > 0 && (
              <div className="batchbar">
                <span className="cnt">已选择 <b>{selected.size}</b> 项</span>
                <div className="ops">
                  <button className="btn sm" onClick={() => handleBatch('role')}>批量分配角色</button>
                  <button className="btn sm" onClick={() => handleBatch('dept')}>批量移动部门</button>
                  <button className="btn sm" onClick={() => handleBatch('freeze')}>批量冻结</button>
                  <button className="btn sm" onClick={() => handleBatch('restore')}>批量恢复</button>
                  <button className="btn sm danger" onClick={() => handleBatch('remove')}>移除</button>
                  <button className="btn sm" onClick={() => handleBatch('cancel')}>取消</button>
                </div>
              </div>
            )}

            {/* 表格 */}
            <table className="table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>账号状态</th>
                  <th>部门</th>
                  <th>角色</th>
                  <th>添加人</th>
                  <th>添加时间</th>
                  <th style={{ width: 150 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td className="col-name"><span className="link" onClick={() => setDrawerId(m.id)}>{m.name}</span></td>
                    <td><span className={`status ${m.status}`}><span className="dot"></span>{STATUS_TEXT[m.status]}</span></td>
                    <td>{m.dept}</td>
                    <td>
                      {m.roles.length ? (
                        <div className="tags-wrap">
                          {m.roles.map((rid) => {
                            const r = roleById(rid);
                            return <span className={`tag ${r?.color || ''}`} key={rid}>{r?.name || rid}</span>;
                          })}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-4)' }}>-</span>
                      )}
                    </td>
                    <td>{m.addBy}</td>
                    <td style={{ color: 'var(--text-3)' }}>{m.addAt}</td>
                    <td>
                      <div className="op">
                        {m.status !== 'pending' && <a className="danger" onClick={() => confirmRemove([m.id])}>移除</a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {list.length === 0 && (
              <div className="empty">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#C9CDD4" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>
                <div className="t">暂无匹配的成员</div>
                <div>调整筛选条件，或点击「添加成员」</div>
              </div>
            )}

            {list.length > 0 && (
              <div className="pagination">
                <span className="total">共 <b>{list.length}</b> 名成员</span>
                <span className="pg">‹</span>
                <span className="pg active">1</span>
                <span className="pg">2</span>
                <span className="pg">3</span>
                <span className="pg">›</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右键菜单：组织节点 */}
      {ctx && (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          <div className="item" onClick={() => handleOrgCtxAct('addSub')}>添加下级组织</div>
          <div className="item" onClick={() => handleOrgCtxAct('rename')}>重命名</div>
          <div className="item danger" onClick={() => handleOrgCtxAct('del')}>删除组织</div>
        </div>
      )}

      {/* 弹窗栈 */}
      {modals.map((modal, idx) => {
        const close = () => setModals((prev) => prev.filter((_, i) => i !== idx));
        if (modal.kind === 'confirm') {
          return (
            <Modal key={idx} title={modal.title} onClose={close} foot={
              <>
                <button className="btn" onClick={close}>取消</button>
                <button className={`btn ${modal.danger ? 'danger' : 'primary'}`} onClick={() => { modal.onOk(); close(); }}>{modal.okText}</button>
              </>
            }>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ color: modal.danger ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }}><IconWarn /></span>
                <div style={{ color: 'var(--text-2)', lineHeight: 1.6, paddingTop: 1 }}>{modal.msg}</div>
              </div>
            </Modal>
          );
        }
        if (modal.kind === 'input') {
          return <InputModal key={idx} title={modal.title} value={modal.value} onOk={modal.onOk} onClose={close} />;
        }
        if (modal.kind === 'assignRole') {
          return (
            <AssignRoleModal
              key={idx}
              ids={modal.ids}
              members={members}
              onClose={close}
              onConfirm={(roles) => {
                updateMembers(modal.ids, (m) => ({ ...m, roles: [...roles] }));
                clearSelected();
                pushToast(modal.ids.length > 1 ? '已批量分配角色' : '已更新角色');
              }}
            />
          );
        }
        if (modal.kind === 'moveDept') {
          return (
            <MoveDeptModal
              key={idx}
              ids={modal.ids}
              members={members}
              onClose={close}
              notify={pushToast}
              onConfirm={(name) => {
                if (modal.onPick) { modal.onPick(name); return; }
                updateMembers(modal.ids, (m) => ({ ...m, dept: name }));
                clearSelected();
                pushToast('已移动部门');
              }}
            />
          );
        }
        return (
          <EditMemberModal
            key={idx}
            id={modal.id}
            members={members}
            onClose={close}
            onSave={(patch) => { updateMembers([modal.id], (m) => ({ ...m, ...patch })); pushToast('已保存'); }}
            openMoveDept={(onPick) => pushModal({ kind: 'moveDept', ids: [modal.id], onPick })}
          />
        );
      })}

      {/* 成员详情抽屉 */}
      {drawerMember && (
        <>
          <div className="drawer-mask" onClick={() => setDrawerId(null)} />
          <div className="drawer">
            <div className="drawer-head">
              <div className="d-title">成员详情</div>
              <span className="x" onClick={() => setDrawerId(null)}><IconX /></span>
            </div>
            <div className="drawer-body">
              <div className="detail-hero">
                <div className="av">{drawerMember.name.slice(0, 1)}</div>
                <div className="info">
                  <div className="n">{drawerMember.name}</div>
                  <div className="m">@{drawerMember.account} · <span className={`status ${drawerMember.status}`}><span className="dot"></span>{STATUS_TEXT[drawerMember.status]}</span></div>
                </div>
              </div>
              <div className="section-title">基本信息</div>
              <div className="desc-list">
                <div className="row"><span className="k">手机号</span><span className="v">{drawerMember.phone}</span></div>
                <div className="row"><span className="k">所属部门</span><span className="v">{drawerMember.dept}</span></div>
                <div className="row"><span className="k">添加人</span><span className="v">{drawerMember.addBy}</span></div>
                <div className="row"><span className="k">添加时间</span><span className="v">{drawerMember.addAt}</span></div>
              </div>
              <div className="section-title">已分配角色</div>
              <div className="tags-wrap">
                {drawerMember.roles.length ? drawerMember.roles.map((rid) => {
                  const r = roleById(rid);
                  return <span className={`tag ${r?.color || ''}`} key={rid}>{r?.name || rid}</span>;
                }) : <span style={{ color: 'var(--text-4)' }}>暂无角色（默认只读）</span>}
              </div>
              <div className="section-title">数据权限范围</div>
              <div className="desc-list">
                <div className="row"><span className="k">查看数据</span><span className="v">本部门及下级部门</span></div>
                <div className="row"><span className="k">管理数据</span><span className="v">仅本部门</span></div>
              </div>
              <div className="section-title">操作记录</div>
              <div className="timeline">
                {MEMBER_LOGS.map((l, i) => (
                  <div className="tl-item" key={i}>
                    <span className="d"></span>
                    <div className="c">
                      <div className="t">{l.t}</div>
                      <div className="time">{l.time} · {l.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="drawer-foot">
              <button className="btn" onClick={() => setDrawerId(null)}>关闭</button>
              <button className="btn" onClick={() => { setDrawerId(null); pushModal({ kind: 'assignRole', ids: [drawerMember.id] }); }}>分配角色</button>
              <button className="btn primary" onClick={() => { setDrawerId(null); pushModal({ kind: 'edit', id: drawerMember.id }); }}>编辑成员</button>
            </div>
          </div>
        </>
      )}

      {/* toast */}
      <ToastWrap toasts={toasts} />
    </>
  );
}

/* ---------- 名称输入弹窗 ---------- */
function InputModal({ title, value, onOk, onClose }: {
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
      <div className="form-item" style={{ margin: 0 }}>
        <label>名称</label>
        <input className="input" ref={ref} maxLength={20} value={val} placeholder="请输入名称" onChange={(e) => setVal(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ---------- 分配角色 ---------- */
function AssignRoleModal({ ids, members, onConfirm, onClose }: {
  ids: string[];
  members: Member[];
  onConfirm: (roles: string[]) => void;
  onClose: () => void;
}) {
  const preset = ids.length === 1 ? members.find((m) => m.id === ids[0])?.roles ?? [] : [];
  const [roles, setRoles] = useState<string[]>(preset);
  const who = ids.length === 1 ? `「${members.find((m) => m.id === ids[0])?.name}」` : `选中的 ${ids.length} 名成员`;
  return (
    <Modal title="分配角色" sub={`为${who}分配角色`} size="md" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { onConfirm(roles); onClose(); }}>确定</button>
      </>
    }>
      <div className="form-tip" style={{ marginBottom: 14 }}>角色决定成员可访问的菜单、数据范围与功能权限。批量分配将覆盖成员原有角色。</div>
      <RoleSelector initial={preset} onChange={setRoles} />
    </Modal>
  );
}

/* ---------- 移动部门 ---------- */
function MoveDeptModal({ ids, members, onConfirm, onClose, notify }: {
  ids: string[];
  members: Member[];
  onConfirm: (name: string) => void;
  onClose: () => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const who = ids.length === 1 ? `「${members.find((m) => m.id === ids[0])?.name}」` : `选中的 ${ids.length} 名成员`;
  return (
    <Modal title="移动部门" sub={`将${who}移动到新的部门`} size="md" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!picked.size) { notify('请选择目标部门', 'error'); return; } onConfirm([...picked.values()][0]); onClose(); }}>确定移动</button>
      </>
    }>
      <div className="form-tip" style={{ marginBottom: 14 }}>选择目标部门，成员的角色配置保持不变。</div>
      <DeptTransfer picked={picked} onPickedChange={setPicked} />
    </Modal>
  );
}

/* ---------- 编辑成员 ---------- */
function EditMemberModal({ id, members, onSave, onClose, openMoveDept }: {
  id: string;
  members: Member[];
  onSave: (patch: Partial<Member>) => void;
  onClose: () => void;
  openMoveDept: (onPick: (name: string) => void) => void;
}) {
  const m = members.find((x) => x.id === id);
  const [name, setName] = useState(m?.name ?? '');
  const [phone, setPhone] = useState(m && m.phone !== '-' ? m.phone : '');
  const [status, setStatus] = useState<Member['status']>(m?.status ?? 'normal');
  const [dept, setDept] = useState(m?.dept ?? '');
  const [roles, setRoles] = useState<string[]>(m?.roles ?? []);
  if (!m) return null;
  return (
    <Modal title="编辑成员" size="md" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => {
          onSave({ name: name.trim() || m.name, phone: phone.trim() || '-', status, dept, roles });
          onClose();
        }}>保存</button>
      </>
    }>
      <div className="form-item"><label>姓名</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div className="form-item" style={{ flex: 1 }}>
          <label>手机号</label>
          <input className="input" value={phone} placeholder="请输入手机号" onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="form-item" style={{ flex: 1 }}>
          <label>账号状态</label>
          <BubbleSelect
            className="select"
            value={status}
            onChange={(v) => setStatus(v as Member['status'])}
            options={[
              { value: 'normal', label: '正常' },
              { value: 'frozen', label: '冻结' },
            ]}
          />
        </div>
      </div>
      <div className="form-item"><label>所属部门</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={dept} readOnly style={{ flex: 1, background: 'var(--fill-1)' }} />
          <button className="btn" onClick={() => openMoveDept(setDept)}>更换部门</button>
        </div>
      </div>
      <div className="form-item" style={{ marginBottom: 0 }}><label>分配角色</label>
        <RoleSelector initial={m.roles} onChange={setRoles} />
      </div>
    </Modal>
  );
}
