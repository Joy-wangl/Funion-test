import { useEffect, useMemo, useState, Fragment, type ReactNode } from 'react';
import {
  INITIAL_MEMBERS,
  avaColor,
  type Member,
} from './data';
import {
  INITIAL_OPS_GROUPS,
  INITIAL_OPS_MEMBERS,
  OPS_CHANNELS,
  OPS_ROLE_COLOR,
  OPS_ROLE_LABEL,
  nowStamp,
  newGroupId,
  opsMemberSource,
  type OpsChannel,
  type OpsChannelGroups,
  type OpsChannelMembers,
  type OpsGroup,
  type OpsMember,
  type OpsRole,
} from './opsGroupData';
import {
  Modal, ToastWrap, useToasts,
  IconArrow, IconMore, IconSearch, IconWarn, IconXsm,
  MemberPickPanel,
} from './shared';
import MoreActions, { type MoreActionItem } from '../../components/MoreActions';
import BubbleSelect from '../../components/BubbleSelect';
import './style.css';

type ModalState =
  | { kind: 'createGroup'; step: 1; name?: string }
  | { kind: 'createGroup'; step: 2; name: string }
  | { kind: 'editGroup'; group: OpsGroup }
  | { kind: 'addSub'; role: OpsRole; parentId: string; group: OpsGroup }
  | { kind: 'transfer'; entry: OpsMember; group: OpsGroup }
  | { kind: 'confirm'; title: string; msg: ReactNode; okText: string; onOk: () => void };

function RoleTag({ role }: { role: OpsRole }) {
  const c = OPS_ROLE_COLOR[role];
  return <span className="og-role-tag" style={{ color: c, background: `${c}14` }}>{OPS_ROLE_LABEL[role]}</span>;
}

/* 操作列规范：竖排直出最多两个，超出收进「更多」气泡 */
function ActionStack({ items }: { items: MoreActionItem[] }) {
  return (
    <div className="og-act-stack">
      {items.slice(0, 2).map((it) => (
        <button key={it.label} type="button" className={`text-link${it.danger ? ' danger' : ''}`} onClick={it.onClick}>{it.label}</button>
      ))}
      {items.length > 2 && <MoreActions items={items.slice(2)} />}
    </div>
  );
}

export default function OpsGroupManagement() {
  const [groups, setGroups] = useState<OpsChannelGroups>(INITIAL_OPS_GROUPS);
  const [members, setMembers] = useState<OpsChannelMembers>(INITIAL_OPS_MEMBERS);
  const [channel, setChannel] = useState<OpsChannel>('taobao');
  const [gq, setGq] = useState('');
  const [selGroup, setSelGroup] = useState('');
  const [expSpecs, setExpSpecs] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState | null>(null);
  const { toasts, pushToast } = useToasts();

  const channelGroups = groups[channel];
  const channelMembers = members[channel];
  const channelLabel = OPS_CHANNELS.find((c) => c.key === channel)?.label ?? '';

  const mutateGroups = (fn: (list: OpsGroup[]) => OpsGroup[]) => {
    setGroups((prev) => ({ ...prev, [channel]: fn(prev[channel]) }));
  };
  const mutateMembers = (fn: (list: OpsMember[]) => OpsMember[]) => {
    setMembers((prev) => ({ ...prev, [channel]: fn(prev[channel]) }));
  };

  const groupViews = useMemo(() => {
    return channelGroups.map((g) => {
      const leader = channelMembers.find((m) => m.groupId === g.id && m.role === 'leader');
      const specs = channelMembers.filter((m) => m.groupId === g.id && m.role === 'specialist');
      const size = channelMembers.filter((m) => m.groupId === g.id).length;
      return { group: g, leader, specs, size };
    });
  }, [channelGroups, channelMembers]);

  const visibleGroups = useMemo(() => {
    const q = gq.trim().toLowerCase();
    if (!q) return groupViews;
    return groupViews.filter(({ group, leader, specs }) => {
      if (group.name.toLowerCase().includes(q)) return true;
      if (leader?.name.toLowerCase().includes(q)) return true;
      return specs.some((s) => s.name.toLowerCase().includes(q));
    });
  }, [groupViews, gq]);

  const activeView = visibleGroups.find((v) => v.group.id === selGroup) ?? visibleGroups[0];
  const activeGroup = activeView?.group;
  const activeLeader = activeView?.leader;
  const activeSpecs = activeView?.specs ?? [];

  useEffect(() => {
    setSelGroup('');
  }, [channel]);

  useEffect(() => {
    setExpSpecs(new Set());
  }, [activeGroup?.id]);

  const toggleSpec = (id: string) => {
    setExpSpecs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isMemberTaken = (memberId: string) => channelMembers.some((m) => m.memberId === memberId);

  const createGroup = (name: string, leaderId: string) => {
    if (isMemberTaken(leaderId)) {
      pushToast('该成员在当前平台已有运营归属', 'error');
      return;
    }
    const src = opsMemberSource(leaderId);
    if (!src) return;
    const gid = newGroupId();
    mutateGroups((list) => [...list, { id: gid, channel, name, leaderId, createdAt: nowStamp() }]);
    mutateMembers((list) => [
      ...list,
      { memberId: leaderId, name: src.name, role: 'leader', groupId: gid, parentId: null, addedBy: '管理员', addedAt: nowStamp() },
    ]);
    setSelGroup(gid);
    pushToast(`已创建运营组「${name}」`);
    setModal(null);
  };

  const renameGroup = (groupId: string, name: string) => {
    mutateGroups((list) => list.map((g) => (g.id === groupId ? { ...g, name } : g)));
    pushToast('已更新组名');
    setModal(null);
  };

  const deleteGroup = (group: OpsGroup) => {
    const size = channelMembers.filter((m) => m.groupId === group.id).length;
    if (size > 0) {
      pushToast('组内仍有成员，无法删除', 'error');
      return;
    }
    mutateGroups((list) => list.filter((g) => g.id !== group.id));
    pushToast('已删除运营组');
  };

  const addSubordinates = (groupId: string, role: OpsRole, parentId: string, ids: string[]) => {
    if (ids.some((id) => isMemberTaken(id))) {
      pushToast('部分成员在当前平台已有运营归属', 'error');
      return;
    }
    const srcs = ids.map((id) => opsMemberSource(id)).filter((s): s is Member => !!s);
    if (!srcs.length) return;
    mutateMembers((list) => [
      ...list,
      ...srcs.map((s) => ({ memberId: s.id, name: s.name, role, groupId, parentId, addedBy: '管理员', addedAt: nowStamp() })),
    ]);
    pushToast(`已添加 ${srcs.length} 名${OPS_ROLE_LABEL[role]}`);
    setModal(null);
  };

  const transferRole = (entry: OpsMember, fromGroup: OpsGroup, targetGroupId: string, targetParentId: string) => {
    const targetGroup = channelGroups.find((g) => g.id === targetGroupId);
    if (!targetGroup) return;

    if (entry.role === 'leader') {
      const oldLeaderId = targetGroup.leaderId;
      mutateGroups((list) => list.map((g) => {
        if (g.id === fromGroup.id) return { ...g, leaderId: '' };
        if (g.id === targetGroupId) return { ...g, leaderId: entry.memberId };
        return g;
      }));
      mutateMembers((list) => list.map((m) => {
        if (m.memberId === entry.memberId) {
          return { ...m, groupId: targetGroupId, parentId: null };
        }
        if (oldLeaderId && m.memberId === oldLeaderId && m.groupId === targetGroupId) {
          return { ...m, role: 'specialist', parentId: entry.memberId };
        }
        if (m.parentId === entry.memberId && m.groupId === fromGroup.id) {
          return { ...m, groupId: targetGroupId };
        }
        return m;
      }));
      pushToast('已转交组长');
    } else if (entry.role === 'specialist') {
      mutateMembers((list) => list.map((m) => {
        if (m.memberId === entry.memberId) {
          return { ...m, groupId: targetGroupId, parentId: targetParentId };
        }
        if (m.parentId === entry.memberId && m.groupId === fromGroup.id) {
          return { ...m, groupId: targetGroupId, parentId: targetParentId };
        }
        return m;
      }));
      pushToast('已转交专员');
    } else {
      mutateMembers((list) => list.map((m) =>
        m.memberId === entry.memberId ? { ...m, groupId: targetGroupId, parentId: targetParentId } : m
      ));
      pushToast('已转交助理');
    }
    setModal(null);
  };

  const transferLeader = (group: OpsGroup, oldLeader: OpsMember, newLeaderId: string) => {
    if (isMemberTaken(newLeaderId)) {
      pushToast('该成员在当前平台已有运营归属', 'error');
      return;
    }
    const src = opsMemberSource(newLeaderId);
    if (!src) return;
    mutateGroups((list) => list.map((g) => (g.id === group.id ? { ...g, leaderId: newLeaderId } : g)));
    mutateMembers((list) => [
      ...list.map((m) => (m.memberId === oldLeader.memberId ? { ...m, role: 'specialist' as OpsRole, parentId: newLeaderId } : m)),
      { memberId: newLeaderId, name: src.name, role: 'leader' as OpsRole, groupId: group.id, parentId: null, addedBy: oldLeader.name, addedAt: nowStamp() },
    ]);
    pushToast(`已将组长转交给「${src.name}」`);
    setModal(null);
  };

  const closeModal = () => setModal(null);

  return (
    <>
      <div className="og-wrap">
      <div className="og-toolbar">
        <div className="og-tabs">
          {OPS_CHANNELS.map((c) => (
            <button key={c.key} className={`og-tab ${channel === c.key ? 'active' : ''}`} onClick={() => setChannel(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="og-tools">
          <div className="input-icon og-search">
            <span className="ic"><IconSearch /></span>
            <input className="input" placeholder="搜索组名 / 组长 / 成员" value={gq} onChange={(e) => setGq(e.target.value)} />
          </div>
          <button className="btn primary" onClick={() => setModal({ kind: 'createGroup', step: 1 })}>+ 新建运营组</button>
        </div>
      </div>
      
      <div className="og-md">
        <div className="og-md-left">
          {visibleGroups.length ? visibleGroups.map(({ group, leader, size }) => (
            <div
              key={group.id}
              className={`og-md-item ${activeGroup?.id === group.id ? 'active' : ''}`}
              onClick={() => setSelGroup(group.id)}
            >
              <div className="og-md-item-hd">
                <span className="og-md-name">{group.name}</span>
                <span className="og-g-count">{size}人</span>
                <span className="og-md-more" onClick={(e) => e.stopPropagation()}>
                  <MoreActions
                    trigger={<IconMore />}
                    items={[
                      { label: '重命名', onClick: () => setModal({ kind: 'editGroup', group }) },
                      { label: '删除组织', danger: true, onClick: () => deleteGroup(group) },
                    ]}
                  />
                </span>
              </div>
              <div className="og-md-item-sub">
                {leader && <span className="og-lead-ava" style={{ background: avaColor(leader.name) }}>{leader.name.slice(0, 1)}</span>}
                组长：{leader?.name ?? '未指定'}
              </div>
            </div>
          )) : (
            <div className="empty" style={{ padding: '20px 0' }}>无匹配运营组</div>
          )}
        </div>

        <div className="og-md-right">
          {activeView && activeGroup ? (
            <div className="og-detail">
              <div className="og-detail-hd">
                <span className="og-g-name">{activeGroup.name}</span>
              </div>
              <div className="og-detail-body">
                <div className="og-table">
                  <div className="og-tr head">
                    <div className="og-cell">成员名称</div>
                    <div className="og-cell">职位</div>
                    <div className="og-cell">添加时间</div>
                    <div className="og-cell">添加人</div>
                    <div className="og-cell">操作</div>
                  </div>
                  {activeLeader ? (
                    <div className="og-tr">
                      <div className="og-cell og-td-name">
                        <span className="og-ava" style={{ background: avaColor(activeLeader.name) }}>{activeLeader.name.slice(0, 1)}</span>
                        <span className="og-cell-nm">{activeLeader.name}</span>
                      </div>
                      <div className="og-cell"><RoleTag role="leader" /></div>
                      <div className="og-cell og-td-dim">{activeLeader.addedAt}</div>
                      <div className="og-cell og-td-dim">{activeLeader.addedBy}</div>
                      <div className="og-cell">
                        <ActionStack items={[
                          { label: '添加专员', onClick: () => setModal({ kind: 'addSub', role: 'specialist', parentId: activeLeader.memberId, group: activeGroup }) },
                          { label: '转交组长', onClick: () => setModal({ kind: 'transfer', entry: activeLeader, group: activeGroup }) },
                        ]} />
                      </div>
                    </div>
                  ) : (
                    <div className="og-tr-empty">该组暂无组长</div>
                  )}
                  {activeSpecs.map((sp) => {
                    const assis = channelMembers.filter((m) => m.parentId === sp.memberId && m.role === 'assistant');
                    const open = expSpecs.has(sp.memberId);
                    return (
                      <Fragment key={sp.memberId}>
                        <div className="og-tr spec" onClick={() => toggleSpec(sp.memberId)}>
                          <div className="og-cell og-td-name d1">
                            <span className={`arrow ${open ? 'open' : ''} ${assis.length ? '' : 'leaf'}`}><IconArrow /></span>
                            <span className="og-ava" style={{ background: avaColor(sp.name) }}>{sp.name.slice(0, 1)}</span>
                            <span className="og-cell-nm">{sp.name}</span>
                            {assis.length > 0 && <span className="og-g-count">{assis.length}助理</span>}
                          </div>
                          <div className="og-cell"><RoleTag role="specialist" /></div>
                          <div className="og-cell og-td-dim">{sp.addedAt}</div>
                          <div className="og-cell og-td-dim">{sp.addedBy}</div>
                          <div className="og-cell" onClick={(e) => e.stopPropagation()}>
                            <ActionStack items={[
                              { label: '添加助理', onClick: () => setModal({ kind: 'addSub', role: 'assistant', parentId: sp.memberId, group: activeGroup }) },
                              { label: '转交专员', onClick: () => setModal({ kind: 'transfer', entry: sp, group: activeGroup }) },
                            ]} />
                          </div>
                        </div>
                        {open && (
                          assis.length ? assis.map((a) => (
                            <div key={a.memberId} className="og-tr sub">
                              <div className="og-cell og-td-name d2">
                                <span className="arrow leaf"><IconArrow /></span>
                                <span className="og-ava sm" style={{ background: avaColor(a.name) }}>{a.name.slice(0, 1)}</span>
                                <span className="og-cell-nm">{a.name}</span>
                              </div>
                              <div className="og-cell"><RoleTag role="assistant" /></div>
                              <div className="og-cell og-td-dim">{a.addedAt}</div>
                              <div className="og-cell og-td-dim">{a.addedBy}</div>
                              <div className="og-cell og-td-dim">-</div>
                            </div>
                          )) : (
                            <div className="og-tr sub">
                              <div className="og-cell og-td-name d2">
                                <span className="arrow leaf"><IconArrow /></span>
                                <span className="og-td-dim">暂无助理</span>
                              </div>
                              <div className="og-cell" />
                              <div className="og-cell" />
                              <div className="og-cell" />
                              <div className="og-cell" />
                            </div>
                          )
                        )}
                      </Fragment>
                    );
                  })}
                  {activeLeader && activeSpecs.length === 0 && (
                    <div className="og-tr-empty">暂无专员，可在组长行「添加专员」</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty" style={{ padding: '60px 0' }}>请选择左侧运营组</div>
          )}
        </div>
      </div>
      </div>

      {modal?.kind === 'createGroup' && modal.step === 1 && (
        <CreateGroupStep1Modal
          channelLabel={channelLabel}
          onNext={(name) => setModal({ kind: 'createGroup', step: 2, name })}
          onClose={closeModal}
        />
      )}
      {modal?.kind === 'createGroup' && modal.step === 2 && (
        <CreateGroupStep2Modal
          name={modal.name}
          channelLabel={channelLabel}
          taken={new Set(channelMembers.map((m) => m.memberId))}
          onConfirm={(leaderId) => createGroup(modal.name, leaderId)}
          onBack={() => setModal({ kind: 'createGroup', step: 1, name: modal.name })}
          onClose={closeModal}
        />
      )}
      {modal?.kind === 'editGroup' && (
        <EditGroupModal
          group={modal.group}
          onConfirm={(name) => renameGroup(modal.group.id, name)}
          onClose={closeModal}
        />
      )}
      {modal?.kind === 'addSub' && (
        <AddSubModal
          role={modal.role}
          group={modal.group}
          parentId={modal.parentId}
          channelMembers={channelMembers}
          taken={new Set(channelMembers.map((m) => m.memberId))}
          onConfirm={(ids) => addSubordinates(modal.group.id, modal.role, modal.parentId, ids)}
          onClose={closeModal}
        />
      )}
      {modal?.kind === 'transfer' && (modal.entry.role === 'leader' ? (
        <TransferLeaderModal
          entry={modal.entry}
          group={modal.group}
          taken={new Set(channelMembers.map((m) => m.memberId))}
          onConfirm={(memberId) => transferLeader(modal.group, modal.entry, memberId)}
          onClose={closeModal}
        />
      ) : (
        <TransferModal
          entry={modal.entry}
          group={modal.group}
          channelGroups={channelGroups}
          channelMembers={channelMembers}
          onConfirm={(targetGroupId, targetParentId) => transferRole(modal.entry, modal.group, targetGroupId, targetParentId)}
          onClose={closeModal}
        />
      ))}
      {modal?.kind === 'confirm' && (
        <Modal title={modal.title} onClose={closeModal} foot={
          <>
            <button className="btn" onClick={closeModal}>取消</button>
            <button className="btn danger" onClick={() => { modal.onOk(); closeModal(); }}>{modal.okText}</button>
          </>
        }>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--danger)', flexShrink: 0 }}><IconWarn /></span>
            <div style={{ color: 'var(--text-2)', lineHeight: 1.6, paddingTop: 1 }}>{modal.msg}</div>
          </div>
        </Modal>
      )}

      <ToastWrap toasts={toasts} />
    </>
  );
}

function CreateGroupStep1Modal({ channelLabel, onNext, onClose }: {
  channelLabel: string;
  onNext: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  return (
    <Modal title="新建运营组" sub={`步骤 1/2 · 渠道：${channelLabel}`} size="md" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!name.trim()) return; onNext(name.trim()); }}>下一步：选择组长</button>
      </>
    }>
      <div className="form-item">
        <label>运营组名称</label>
        <input className="input" value={name} placeholder="请输入组名" maxLength={20} onChange={(e) => setName(e.target.value)} />
      </div>
    </Modal>
  );
}

function CreateGroupStep2Modal({ name, channelLabel, taken, onConfirm, onBack, onClose }: {
  name: string;
  channelLabel: string;
  taken: Set<string>;
  onConfirm: (leaderId: string) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const pool = useMemo(() => INITIAL_MEMBERS.filter((m) => m.status !== 'pending'), []);
  const pickedMembers = pool.filter((m) => picked.has(m.id));
  const pickedSrc = pickedMembers[0];

  return (
    <Modal title="选择组长" sub={`步骤 2/2 · 组名：${name} · 渠道：${channelLabel}`} size="xl" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onBack}>上一步</button>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!pickedSrc) return; onConfirm(pickedSrc.id); }}>创建</button>
      </>
    }>
      <div className="member-transfer">
        <MemberPickPanel
          members={pool}
          selectedIds={picked}
          disabledIds={taken}
          noDeptPick
          onToggle={(id) => setPicked((prev) => (prev.has(id) ? new Set() : new Set([id])))}
          onBulk={() => {}}
        />
        <PickedSide picked={pickedMembers} max={1} onRemove={() => setPicked(new Set())} />
      </div>
    </Modal>
  );
}

function EditGroupModal({ group, onConfirm, onClose }: {
  group: OpsGroup;
  onConfirm: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(group.name);
  return (
    <Modal title="编辑运营组" size="md" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!name.trim()) return; onConfirm(name.trim()); }}>保存</button>
      </>
    }>
      <div className="form-item">
        <label>运营组名称</label>
        <input className="input" value={name} placeholder="请输入组名" maxLength={20} onChange={(e) => setName(e.target.value)} />
      </div>
    </Modal>
  );
}

function AddSubModal({ role, group, parentId, channelMembers, taken, onConfirm, onClose }: {
  role: OpsRole;
  group: OpsGroup;
  parentId: string;
  channelMembers: OpsMember[];
  taken: Set<string>;
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const parent = channelMembers.find((m) => m.memberId === parentId);
  const pool = useMemo(() => INITIAL_MEMBERS.filter((m) => m.status !== 'pending'), []);
  const pickedMembers = pool.filter((m) => picked.has(m.id));

  return (
    <Modal title={`添加${OPS_ROLE_LABEL[role]}`} sub={`组：${group.name} · 上级：${parent?.name ?? ''}`} size="xl" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!picked.size) return; onConfirm([...picked]); }}>确认添加</button>
      </>
    }>
      <div className="member-transfer">
        <MemberPickPanel
          members={pool}
          selectedIds={picked}
          disabledIds={taken}
          noDeptPick
          onToggle={(id) => setPicked((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          })}
          onBulk={() => {}}
        />
        <PickedSide
          picked={pickedMembers}
          max={1000}
          onRemove={(id) => setPicked((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          })}
        />
      </div>
    </Modal>
  );
}

function TransferModal({ entry, group, channelGroups, channelMembers, onConfirm, onClose }: {
  entry: OpsMember;
  group: OpsGroup;
  channelGroups: OpsGroup[];
  channelMembers: OpsMember[];
  onConfirm: (targetGroupId: string, targetParentId: string) => void;
  onClose: () => void;
}) {
  const [targetGroupId, setTargetGroupId] = useState(group.id);
  const [targetParentId, setTargetParentId] = useState('');

  const parentCandidates = useMemo(() => {
    if (entry.role === 'specialist') {
      return channelMembers.filter((m) => m.groupId === targetGroupId && m.role === 'leader' && m.memberId !== entry.memberId);
    }
    if (entry.role === 'assistant') {
      return channelMembers.filter((m) => m.groupId === targetGroupId && m.role === 'specialist' && m.memberId !== entry.memberId);
    }
    return [];
  }, [entry.role, targetGroupId, channelMembers]);

  useEffect(() => {
    setTargetParentId(parentCandidates[0]?.memberId ?? '');
  }, [targetGroupId, parentCandidates]);

  return (
    <Modal title={`转交${OPS_ROLE_LABEL[entry.role]}`} sub={`当前：${entry.name} · 组：${group.name}`} size="md" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!targetGroupId || !targetParentId) return; onConfirm(targetGroupId, targetParentId); }}>确认转交</button>
      </>
    }>
      <div className="form-item">
        <label>目标分组</label>
        <BubbleSelect
          className="input"
          value={targetGroupId}
          onChange={(v) => setTargetGroupId(v)}
          options={channelGroups.map((g) => ({ value: g.id, label: g.name }))}
        />
      </div>
      <div className="form-item">
        <label>{entry.role === 'specialist' ? '挂靠组长' : '挂靠专员'}</label>
        <BubbleSelect
          className="input"
          value={targetParentId || '请选择'}
          onChange={(v) => setTargetParentId(v)}
          options={parentCandidates.map((m) => ({ value: m.memberId, label: m.name }))}
        />
      </div>
    </Modal>
  );
}

/* 转交组长：唤起成员选择组件（仅可选人、已有归属禁选），不含运营组配置 */
function TransferLeaderModal({ entry, group, taken, onConfirm, onClose }: {
  entry: OpsMember;
  group: OpsGroup;
  taken: Set<string>;
  onConfirm: (memberId: string) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const pool = useMemo(() => INITIAL_MEMBERS.filter((m) => m.status !== 'pending'), []);
  const disabled = useMemo(() => new Set([...taken, entry.memberId]), [taken, entry.memberId]);
  const pickedMembers = pool.filter((m) => picked.has(m.id));
  const pickedSrc = pickedMembers[0];

  return (
    <Modal title="转交运营组长" sub={`当前：${entry.name} · 组：${group.name}`} size="xl" onClose={onClose} foot={
      <>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => { if (!pickedSrc) return; onConfirm(pickedSrc.id); }}>确认转交</button>
      </>
    }>
      <div className="member-transfer">
        <MemberPickPanel
          members={pool}
          selectedIds={picked}
          disabledIds={disabled}
          noDeptPick
          onToggle={(id) => setPicked((prev) => (prev.has(id) ? new Set() : new Set([id])))}
          onBulk={() => {}}
        />
        <PickedSide picked={pickedMembers} max={1} onRemove={() => setPicked(new Set())} />
      </div>
      {pickedSrc && (
        <div className="form-tip" style={{ marginTop: 10 }}>转交后：<b>{pickedSrc.name}</b> 将成为「{group.name}」组长，原组长 {entry.name} 转为专员。</div>
      )}
    </Modal>
  );
}

/* 已选侧栏：与「选择成员」弹窗同款 */
function PickedSide({ picked, max, onRemove }: {
  picked: Member[];
  max: number;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="member-transfer-right">
      <div className="mtr-head">已选择({picked.length}/{max})</div>
      <div className="mtr-body">
        {picked.length === 0 ? (
          <div className="mtr-empty">暂未选择成员</div>
        ) : picked.map((m) => (
          <div className="mtr-selected" key={m.id}>
            <span className="og-ava" style={{ background: avaColor(m.name) }}>{m.name.slice(0, 1)}</span>
            <span className="mtr-name">{m.name}</span>
            <span className="mtr-rm" onClick={() => onRemove(m.id)}><IconXsm /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

