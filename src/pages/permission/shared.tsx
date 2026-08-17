/* =========================================================
   Funion 权限管理 · 公共组件（图标 / 复选框 / 弹窗 / toast）
   ========================================================= */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ROLES, roleById, type DeptNode, DEPT_TREE } from './data';
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
export function Checkbox({ checked, indeterminate, onChange }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <label className="checkbox">
      <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="box"><IconCheck /></span>
    </label>
  );
}

/* ---------- 弹窗基础 ---------- */
export function Modal({ title, sub, size, foot, onClose, children }: {
  title: string;
  sub?: string;
  size?: 'md' | 'lg';
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

/* ---------- 添加成员（选择部门 → 分配角色 → 确认信息） ---------- */
export function AddMemberModal({ onClose, onConfirm, notify }: {
  onClose: () => void;
  onConfirm: (depts: { id: string; name: string }[], roles: string[]) => void;
  notify: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const [roles, setRoles] = useState<string[]>([]);
  const depts = [...picked.entries()].map(([id, name]) => ({ id, name }));

  const next = () => {
    if (step === 1) {
      if (!depts.length) { notify('请至少选择一个部门/成员', 'error'); return; }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      onConfirm(depts, roles);
      onClose();
    }
  };

  return (
    <Modal title="添加成员" sub="从组织架构选择成员，并分配部门与角色" size="lg" onClose={onClose} foot={
      <>
        {step > 1 && <button className="btn" onClick={() => setStep(step - 1)}>上一步</button>}
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={next}>{step === 3 ? '确认添加' : '下一步'}</button>
      </>
    }>
      <div className="steps">
        <div className={`step ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}><span className="num">1</span>选择部门</div>
        <div className="line"></div>
        <div className={`step ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}><span className="num">2</span>分配角色</div>
        <div className="line"></div>
        <div className={`step ${step === 3 ? 'active' : ''}`}><span className="num">3</span>确认信息</div>
      </div>
      {step === 1 && <DeptTransfer picked={picked} onPickedChange={setPicked} />}
      {step === 2 && (
        <>
          <div className="form-tip" style={{ marginBottom: 14 }}>为所选成员统一分配角色，可稍后在成员详情中单独调整。</div>
          <RoleSelector initial={[]} onChange={setRoles} />
        </>
      )}
      {step === 3 && (
        <div className="desc-list">
          <div className="row"><span className="k">选择部门</span><span className="v">
            <div className="tags-wrap">{depts.map((d) => <span className="tag blue" key={d.id}>{d.name}</span>)}</div>
          </span></div>
          <div className="row"><span className="k">分配角色</span><span className="v">
            {roles.length ? (
              <div className="tags-wrap">{roles.map((id) => {
                const r = roleById(id);
                return <span className={`tag ${r?.color || ''}`} key={id}>{r?.name || id}</span>;
              })}</div>
            ) : <span style={{ color: 'var(--text-4)' }}>未分配（默认只读）</span>}
          </span></div>
          <div className="row"><span className="k">账号状态</span><span className="v">
            <span className="status normal"><span className="dot"></span>正常（立即激活）</span>
          </span></div>
        </div>
      )}
    </Modal>
  );
}
