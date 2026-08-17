/* =========================================================
   Funion 权限管理 · 部门管理（移植自原型 department.html）
   ========================================================= */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DP_TREE, DP_MEMBERS, findDpNode, renameDpNode, type DpTreeNode } from './data';
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
import './style.css';

/* ---------- 弹窗状态 ---------- */
type ModalState =
  | { kind: 'deptForm'; title: string; value: string; onOk: (v: string) => void }
  | { kind: 'confirm'; title: string; msg: ReactNode; okText: string; danger?: boolean; onOk: () => void }
  | { kind: 'addMember' };

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
                <tr><th>姓名</th><th>角色</th><th>添加人</th><th>添加时间</th><th style={{ width: 100 }}>操作</th></tr>
              </thead>
              <tbody>
                {DP_MEMBERS.map((m, i) => (
                  <tr key={i}>
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
                    <td>{m.adder}</td>
                    <td style={{ color: 'var(--text-3)' }}>{m.at}</td>
                    <td><div className="op"><a className="danger" onClick={() => pushToast('已移除')}>移除</a></div></td>
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
          onClose={closeModal}
          notify={pushToast}
          onConfirm={(depts) => pushToast(`已添加成员，分配 ${depts.length} 个部门`)}
        />
      )}

      {/* toast */}
      <ToastWrap toasts={toasts} />
    </>
  );
}

/* ---------- 添加/编辑部门弹窗（0/10 计数） ---------- */
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
