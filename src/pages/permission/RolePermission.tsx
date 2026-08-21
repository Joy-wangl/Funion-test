/* =========================================================
   Funion 权限管理 · 角色权限（移植自原型 role.html）
   ========================================================= */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  DEPT_MGMT_TREE,
  DEPT_PICKER,
  INITIAL_MEMBERS,
  INITIAL_ROLE_MEMBERS,
  PERMISSION_MENU,
  ROLE_GROUPS,
  avaColor,
  findDeptNode,
  membersOfDept,
  type DeptNode,
  type Member,
  type PermMenuItem,
  type PermRadioCfg,
  type PickerDeptNode,
  type RoleGroupNode,
  type RoleMember,
} from './data';
import {
  Checkbox,
  Modal,
  ToastWrap,
  useToasts,
  IconCheck,
  IconDept,
  IconMore,
  IconSearch,
  IconWarn,
  IconXsm,
} from './shared';
import './style.css';

/* ---------- 弹窗状态 ---------- */
type ModalState =
  | { kind: 'nameForm'; title: string; value: string; onOk: (v: string) => void }
  | { kind: 'confirm'; title: string; msg: ReactNode; okText: string; danger?: boolean; onOk: () => void }
  | { kind: 'memberPicker' }
  | { kind: 'deptPicker' };

/** 重命名角色树节点（组或角色） */
function renameRoleNode(tree: RoleGroupNode[], id: string, name: string): RoleGroupNode[] {
  return tree.map((n) =>
    n.id === id
      ? { ...n, name }
      : { ...n, children: n.children ? renameRoleNode(n.children, id, name) : undefined },
  );
}

export default function RolePermission() {
  const [groups, setGroups] = useState<RoleGroupNode[]>(ROLE_GROUPS);
  const [curRoleId, setCurRoleId] = useState('r2');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'member' | 'perm'>('member');
  const [roleMembers, setRoleMembers] = useState<RoleMember[]>(INITIAL_ROLE_MEMBERS);
  const [ctx, setCtx] = useState<{ x: number; y: number; type: 'role' | 'group'; id: string; name: string } | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const { toasts, pushToast } = useToasts();

  /* 右键菜单外点击关闭 */
  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [ctx]);

  /* 面包屑：组名/角色名 */
  const crumbGroup = groups.find((g) => g.children?.some((c) => c.id === curRoleId));
  const crumbRole = crumbGroup?.children?.find((c) => c.id === curRoleId);
  const crumb = (crumbGroup ? crumbGroup.name + '/' : '') + (crumbRole ? crumbRole.name : '');

  const showCtx = (e: React.MouseEvent, type: 'role' | 'group', id: string, name: string) => {
    e.stopPropagation();
    e.preventDefault();
    setCtx({ x: e.clientX, y: e.clientY, type, id, name });
  };

  const handleCtxAct = (act: string) => {
    if (!ctx) return;
    const { id, name } = ctx;
    setCtx(null);
    if (act === 'edit') {
      setModal({
        kind: 'nameForm', title: '编辑角色', value: name,
        onOk: (v) => { setGroups((prev) => renameRoleNode(prev, id, v)); pushToast('已保存'); }
      });
    }
    if (act === 'del') {
      setModal({
        kind: 'confirm', title: '删除角色', danger: true, okText: '删除',
        msg: <>确定删除角色「<b>{name}</b>」？</>,
        onOk: () => pushToast('已删除')
      });
    }
    if (act === 'editGroup') {
      setModal({
        kind: 'nameForm', title: '编辑角色组', value: name,
        onOk: (v) => { setGroups((prev) => renameRoleNode(prev, id, v)); pushToast('已保存'); }
      });
    }
    if (act === 'addRole') {
      setModal({
        kind: 'nameForm', title: '添加下级角色', value: '',
        onOk: (v) => pushToast(`已在「${name}」下添加角色「${v}」`)
      });
    }
  };

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: RoleGroupNode, depth: number): ReactNode => {
    const isGroup = Array.isArray(node.children);
    const hasChild = isGroup && node.children!.length > 0;
    const active = node.id === curRoleId;
    const open = !collapsed.has(node.id);
    return (
      <div className="tree-node" key={node.id}>
        <div
          className={`tree-item ${active ? 'active' : ''}`}
          onClick={() => { if (!isGroup) setCurRoleId(node.id); }}
          onContextMenu={(e) => showCtx(e, isGroup ? 'group' : 'role', node.id, node.name)}
        >
          <span
            className={`arrow ${hasChild ? (open ? 'open' : '') : 'leaf'}`}
            onClick={(e) => { e.stopPropagation(); if (hasChild) toggleGroup(node.id); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
          </span>
          <span className="label">{node.name}</span>
          <span className="node-more" onClick={(e) => showCtx(e, isGroup ? 'group' : 'role', node.id, node.name)}><IconMore /></span>
        </div>
        {hasChild && (
          <div className={`tree-children ${open ? '' : 'collapsed'}`}>
            {node.children!.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const closeModal = () => setModal(null);

  return (
    <>
      <div className="workspace">
        {/* 左：角色管理树 */}
        <div className="tree-panel">
          <div className="panel-title">角色管理</div>
          <div className="role-search">
            <div className="input-icon">
              <span className="ic"><IconSearch /></span>
              <input className="input" placeholder="搜索角色分组或角色名" />
            </div>
            <button
              className="icon-btn"
              title="添加角色组"
              onClick={() => setModal({
                kind: 'nameForm', title: '添加角色组', value: '',
                onOk: (v) => pushToast(`已添加角色组「${v}」`)
              })}
            >+</button>
          </div>
          <div className="tree-body">{groups.map((g) => renderNode(g, 0))}</div>
        </div>

        {/* 右：内容 */}
        <div className="content-panel">
          <div className="content-head">
            <span className="title">{crumb}</span>
          </div>
          <div className="tab-bar">
            <div className="og-tabs">
              <button className={`og-tab ${tab === 'member' ? 'active' : ''}`} onClick={() => setTab('member')}>角色成员</button>
              <button className={`og-tab ${tab === 'perm' ? 'active' : ''}`} onClick={() => setTab('perm')}>权限配置</button>
            </div>
            {tab === 'member' && (
              <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={() => setModal({ kind: 'memberPicker' })}>添加成员</button>
            )}
          </div>

          {tab === 'member' && (
            <div className="content-body">
              <table className="table">
                <thead><tr><th>姓名</th><th>部门</th><th>添加人</th><th>添加时间</th><th style={{ width: 80 }}>操作</th></tr></thead>
                <tbody>
                  {roleMembers.map((r, i) => (
                    <tr key={i}>
                      <td className="col-name">{r.name}</td>
                      <td>{r.dept}</td>
                      <td>{r.adder}</td>
                      <td style={{ color: 'var(--text-3)' }}>{r.at}</td>
                      <td><div className="op"><a className="danger" onClick={() => pushToast('已移除')}>移除</a></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'perm' && (
            <div className="content-body">
              <table className="pm-table">
                <thead>
                  <tr>
                    <th style={{ width: '14%' }}>一级菜单</th>
                    <th style={{ width: '14%' }}>二级菜单</th>
                    <th style={{ width: '24%' }}>查看数据权限</th>
                    <th style={{ width: '24%' }}>管理数据权限</th>
                    <th style={{ width: '24%' }}>功能权限</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MENU.map((item, pi) => {
                    if (item.children) {
                      return item.children.map((child, ci) => (
                        <tr key={`${pi}-${ci}`}>
                          {ci === 0 && (
                            <td rowSpan={item.children!.length} className="c-name">
                              <PermCheckbox checked={item.checked} /> {item.name}
                            </td>
                          )}
                          <td className="c-name"><PermCheckbox checked={child.checked} /> {child.name}</td>
                          <PermCells cfg={child} keyPrefix={`p${pi}c${ci}`} onPick={() => setModal({ kind: 'deptPicker' })} />
                        </tr>
                      ));
                    }
                    return (
                      <tr key={pi}>
                        <td className="c-name"><PermCheckbox checked={item.checked} /> {item.name}</td>
                        <td className="dash">–</td>
                        <PermCells cfg={item} keyPrefix={`p${pi}`} onPick={() => setModal({ kind: 'deptPicker' })} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 右键菜单 */}
      {ctx && (
        <div className="ctx-menu" style={{ left: ctx.x, top: ctx.y }}>
          {ctx.type === 'role' ? (
            <>
              <div className="item" onClick={() => handleCtxAct('edit')}>编辑角色</div>
              <div className="item danger" onClick={() => handleCtxAct('del')}>删除角色</div>
            </>
          ) : (
            <>
              <div className="item" onClick={() => handleCtxAct('editGroup')}>编辑角色组</div>
              <div className="item" onClick={() => handleCtxAct('addRole')}>添加下级角色</div>
            </>
          )}
        </div>
      )}

      {/* 弹窗 */}
      {modal?.kind === 'nameForm' && (
        <NameFormModal title={modal.title} value={modal.value} onOk={modal.onOk} onClose={closeModal} />
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
      {modal?.kind === 'memberPicker' && (
        <MemberPickerModal
          onClose={closeModal}
          onConfirm={(added) => {
            setRoleMembers((prev) => [
              ...added.map((x) => ({ name: x.name, dept: x.dept, adder: '七彩虹', at: '2026/08/13 12:00:00' })),
              ...prev
            ]);
            pushToast(`已添加 ${added.length} 名成员到当前角色`);
          }}
        />
      )}
      {modal?.kind === 'deptPicker' && (
        <DeptPickerModal onClose={closeModal} notify={pushToast} />
      )}

      {/* toast */}
      <ToastWrap toasts={toasts} />
    </>
  );
}

/* ---------- 权限矩阵单元格 ---------- */
function PermCheckbox({ checked }: { checked: boolean }) {
  const [val, setVal] = useState(checked);
  return <Checkbox checked={val} onChange={setVal} />;
}

function RadioList({ cfg, name, onPick }: { cfg: PermRadioCfg | null; name: string; onPick: () => void }) {
  if (!cfg) return <span className="dash">–</span>;
  return (
    <div className="perm-list">
      {cfg.opts.map((opt, i) => (
        <label className="radio" key={i}>
          <input type="radio" name={name} defaultChecked={i === cfg.sel} />
          <span className="dot"></span>
          {opt}
          {i === cfg.sel && cfg.link && <span className="link" onClick={onPick}>{cfg.link}</span>}
        </label>
      ))}
    </div>
  );
}

function FuncList({ list }: { list: string[] }) {
  if (!list.length) return <span className="dash">–</span>;
  return (
    <div className={list.length > 3 ? 'func-list cols' : 'func-list'}>
      {list.map((f) => (
        <label key={f} className="checkbox">
          <input type="checkbox" />
          <span className="box"><IconCheck /></span>
          {f}
        </label>
      ))}
    </div>
  );
}

function PermCells({ cfg, keyPrefix, onPick }: { cfg: PermMenuItem; keyPrefix: string; onPick: () => void }) {
  return (
    <>
      <td><RadioList cfg={cfg.view} name={`${keyPrefix}_v`} onPick={onPick} /></td>
      <td><RadioList cfg={cfg.manage} name={`${keyPrefix}_m`} onPick={onPick} /></td>
      <td><FuncList list={cfg.func} /></td>
    </>
  );
}

/* ---------- 名称输入弹窗 ---------- */
function NameFormModal({ title, value, onOk, onClose }: {
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
        <label>名称 <span className="req">*</span></label>
        <input className="input" ref={ref} value={val} placeholder="请输入名称" maxLength={20} onChange={(e) => setVal(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ---------- 选择成员弹窗（成员+部门混合，右侧已选标签） ---------- */
function MemberPickerModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (added: Member[]) => void;
}) {
  const [cur, setCur] = useState('c1');
  const [mq, setMq] = useState('');
  const [selM, setSelM] = useState<Map<string, Member>>(new Map());
  const [selD, setSelD] = useState<Map<string, string>>(new Map());

  const hit = (s: string) => s.toLowerCase().includes(mq.toLowerCase());

  const pathTo = (id: string): DeptNode[] => {
    let path: DeptNode[] = [];
    const dfs = (ns: DeptNode[], trail: DeptNode[]): boolean => {
      for (const n of ns) {
        const t = [...trail, n];
        if (n.id === id) { path = t; return true; }
        if (n.children && dfs(n.children, t)) return true;
      }
      return false;
    };
    dfs(DEPT_MGMT_TREE, []);
    return path;
  };

  const directMembers = (id: string) => INITIAL_MEMBERS.filter((x) => (x.deptId || 'c1') === id);

  const node = findDeptNode(cur);
  const mems = directMembers(cur).filter((x) => hit(x.name) || hit(x.account));
  const kids = (node?.children || []).filter((d) => hit(d.name));
  const total = mems.length + kids.length;
  const allChecked = total > 0 && mems.every((x) => selM.has(x.id)) && kids.every((d) => selD.has(d.id));

  const toggleMember = (m: Member, checked: boolean) => {
    setSelM((prev) => {
      const next = new Map(prev);
      if (checked) next.set(m.id, m);
      else next.delete(m.id);
      return next;
    });
  };
  const toggleDept = (d: DeptNode, checked: boolean) => {
    setSelD((prev) => {
      const next = new Map(prev);
      if (checked) next.set(d.id, d.name);
      else next.delete(d.id);
      return next;
    });
  };
  const toggleAll = (checked: boolean) => {
    mems.forEach((x) => toggleMember(x, checked));
    kids.forEach((d) => toggleDept(d, checked));
  };

  const confirm = () => {
    const ids = new Set<string>();
    const added: Member[] = [];
    [...selM.values()].forEach((x) => { if (!ids.has(x.id)) { ids.add(x.id); added.push(x); } });
    [...selD.keys()].forEach((did) => membersOfDept(did, INITIAL_MEMBERS).forEach((x) => {
      if (!ids.has(x.id)) { ids.add(x.id); added.push(x); }
    }));
    onConfirm(added);
    onClose();
  };

  return (
    <Modal title="选择成员" sub="从部门成员中选择" size="lg" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={confirm}>确定</button>
      </>
    }>
      <div className="picker">
        <div className="picker-left">
          <div className="input-icon rt">
            <span className="ic"><IconSearch /></span>
            <input className="input" placeholder="搜索" value={mq} onChange={(e) => setMq(e.target.value)} />
          </div>
          <div className="mp-crumb">
            {pathTo(cur).map((n, i, arr) => (
              <span key={n.id}>
                <span className={`seg ${i === arr.length - 1 ? 'cur' : ''}`} onClick={() => setCur(n.id)}>{n.name}</span>
                {i < arr.length - 1 && <span className="sep">&gt;</span>}
              </span>
            ))}
          </div>
          <label className="checkbox mp-all">
            <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
            <span className="box"><IconCheck /></span>全选
          </label>
          <div className="pk-list">
            {total === 0 && <div className="empty" style={{ padding: '20px 0' }}>无匹配结果</div>}
            {mems.map((m) => (
              <div className="pk-row mp-member" key={m.id}>
                <Checkbox checked={selM.has(m.id)} onChange={(c) => toggleMember(m, c)} />
                <span className="ava-sm" style={{ background: avaColor(m.name) }}>{m.name.slice(0, 1)}</span>
                <span className="d-name">{m.name}</span>
              </div>
            ))}
            {kids.map((d) => (
              <div className="pk-row mp-dept" key={d.id}>
                <Checkbox checked={selD.has(d.id)} onChange={(c) => toggleDept(d, c)} />
                <span className="d-ic"><IconDept /></span>
                <span className="d-col">
                  <span className="d-name">{d.name}</span>
                  <span className="d-cnt">{d.desc || ''}</span>
                </span>
                <span className="sub" onClick={() => setCur(d.id)}>下级</span>
              </div>
            ))}
          </div>
        </div>
        <div className="picker-right">
          <div className="pk-selhead">已选择(<b>{selM.size + selD.size}</b>/10000)</div>
          <div className="pk-tags">
            {selM.size + selD.size === 0 && <span className="dash">暂未选择</span>}
            {[...selM.values()].map((x) => (
              <span className="pk-tag" key={x.id}>
                <span className="ava-sm" style={{ background: avaColor(x.name) }}>{x.name.slice(0, 1)}</span>
                {x.name}
                <span className="rm" onClick={() => toggleMember(x, false)}><IconXsm /></span>
              </span>
            ))}
            {[...selD.entries()].map(([id, name]) => (
              <span className="pk-tag" key={id}>
                <span className="d-ic"><IconDept /></span>
                {name}
                <span className="rm" onClick={() => {
                  const d = findDeptNode(id);
                  if (d) toggleDept(d, false);
                }}><IconXsm /></span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- 指定部门选择弹窗 ---------- */
function DeptPickerModal({ onClose, notify }: {
  onClose: () => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}) {
  const findName = (id: string, nodes: PickerDeptNode[]): string | null => {
    for (const n of nodes) {
      if (n.id === id) return n.name;
      if (n.children) {
        const f = findName(id, n.children);
        if (f) return f;
      }
    }
    return null;
  };

  const [sel, setSel] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    ['d1', 'd3'].forEach((id) => {
      const name = findName(id, DEPT_PICKER.depts);
      if (name) m.set(id, name);
    });
    return m;
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const hit = (name: string) => name.toLowerCase().includes(query.toLowerCase());

  const filterTree = (nodes: PickerDeptNode[]): PickerDeptNode[] => {
    if (!query) return nodes;
    const res: PickerDeptNode[] = [];
    nodes.forEach((n) => {
      const kids = n.children ? filterTree(n.children) : [];
      if (hit(n.name) || kids.length) {
        res.push({ ...n, children: kids.length ? kids : (hit(n.name) ? (n.children || []) : []) });
      }
    });
    return res;
  };

  const tree = filterTree(DEPT_PICKER.depts);

  const toggleCheck = (id: string, checked: boolean) => {
    setSel((prev) => {
      const next = new Map(prev);
      if (checked) {
        const name = findName(id, DEPT_PICKER.depts);
        if (name) next.set(id, name);
      } else next.delete(id);
      return next;
    });
  };

  const toggleSub = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* 全选：作用于当前可见节点 */
  const visibleIds: string[] = [];
  const collect = (nodes: PickerDeptNode[]) => {
    nodes.forEach((n) => {
      visibleIds.push(n.id);
      const open = query ? true : expandedIds.has(n.id);
      if (n.children?.length && open) collect(n.children);
    });
  };
  collect(tree);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => sel.has(id));

  const renderRow = (node: PickerDeptNode, depth: number): ReactNode => {
    const hasChild = node.children && node.children.length > 0;
    const open = query ? true : expandedIds.has(node.id);
    return (
      <div key={node.id}>
        <div className="pk-row" style={{ paddingLeft: depth * 18 }}>
          <Checkbox checked={sel.has(node.id)} onChange={(c) => toggleCheck(node.id, c)} />
          <span className="d-ic"><IconDept /></span>
          <span className="d-name">{node.name}</span>
          {hasChild && <span className="sub" onClick={() => toggleSub(node.id)}>{open ? '收起' : '下级'}</span>}
        </div>
        {hasChild && (
          <div className={`pk-children ${open ? '' : 'collapsed'}`}>
            {node.children!.map((c) => renderRow(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal title="指定部门" sub="选择指定的部门" size="lg" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { notify(`已选择 ${sel.size} 个部门`); onClose(); }}>确定</button>
      </>
    }>
      <div className="picker">
        <div className="picker-left">
          <div className="input-icon">
            <span className="ic"><IconSearch /></span>
            <input className="input" placeholder="搜索" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="pk-company">{DEPT_PICKER.company}</div>
          <label className="checkbox pk-all">
            <input type="checkbox" checked={allChecked} onChange={(e) => visibleIds.forEach((id) => toggleCheck(id, e.target.checked))} />
            <span className="box"><IconCheck /></span>全选
          </label>
          <div className="pk-list">
            {tree.length ? tree.map((d) => renderRow(d, 0)) : (
              <div className="empty" style={{ padding: '30px 0' }}>无匹配部门</div>
            )}
          </div>
        </div>
        <div className="picker-right">
          <div className="pk-selhead">已选择(<b>{sel.size}</b>/10000)</div>
          <div className="pk-tags">
            {sel.size === 0 && <span className="dash">暂未选择</span>}
            {[...sel.entries()].map(([id, name]) => (
              <span className="pk-tag" key={id}>
                <span className="d-ic"><IconDept /></span>
                {name}
                <span className="rm" onClick={() => toggleCheck(id, false)}><IconXsm /></span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
