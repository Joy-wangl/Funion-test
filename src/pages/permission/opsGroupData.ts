/* =========================================================
   权限设置 · 运营组管理 数据层
   职级：运营组长 > 运营专员 > 运营助理
   规则：
     - 每个人在同一平台内只能有唯一的职位归属
     - 同一人可在不同平台担任不同职位（含组长）
     - 成员不能被移除，只能修改归属
   ========================================================= */

import { INITIAL_MEMBERS, type Member } from './data';

export type OpsChannel = 'taobao' | 'video';

export const OPS_CHANNELS: { key: OpsChannel; label: string }[] = [
  { key: 'taobao', label: '淘宝' },
  { key: 'video', label: '视频号' },
];

export type OpsRole = 'leader' | 'specialist' | 'assistant';

export const OPS_ROLE_LABEL: Record<OpsRole, string> = {
  leader: '运营组长',
  specialist: '运营专员',
  assistant: '运营助理',
};

export const OPS_ROLE_COLOR: Record<OpsRole, string> = {
  leader: '#165dff',
  specialist: '#ff9a2e',
  assistant: '#00b42a',
};

/* ---------- 运营组实体（独立于成员，组名可自定义） ---------- */
export interface OpsGroup {
  id: string;
  channel: OpsChannel;
  /** 组名，独立于组长姓名，如「淘宝A组」 */
  name: string;
  /** 当前组长的 memberId，null = 暂无组长 */
  leaderId: string | null;
  createdAt: string;
}

/* ---------- 组内成员归属 ---------- */
export interface OpsMember {
  /** 成员 id（来源于部门管理/成员管理） */
  memberId: string;
  name: string;
  role: OpsRole;
  /** 所属运营组 id */
  groupId: string;
  /** 挂靠上级：专员 → 组长 memberId；助理 → 专员 memberId；组长为 null */
  parentId: string | null;
  addedBy: string;
  addedAt: string;
}

export type OpsChannelGroups = Record<OpsChannel, OpsGroup[]>;
export type OpsChannelMembers = Record<OpsChannel, OpsMember[]>;

/* ---------- 初始运营组 ---------- */
export const INITIAL_OPS_GROUPS: OpsChannelGroups = {
  taobao: [
    { id: 'tg1', channel: 'taobao', name: '黄亚芳大组', leaderId: 'm5', createdAt: '2026/02/16 15:20:00' },
    { id: 'tg2', channel: 'taobao', name: '徐佳华大组', leaderId: 'm9', createdAt: '2026/02/15 10:00:00' },
  ],
  video: [
    { id: 'vg1', channel: 'video', name: '黄亚芳大组', leaderId: 'm5', createdAt: '2026/02/16 15:20:00' },
  ],
};

/* ---------- 初始运营组成员归属 ---------- */
export const INITIAL_OPS_MEMBERS: OpsChannelMembers = {
  taobao: [
    { memberId: 'm5',  name: '黄亚芳', role: 'leader',     groupId: 'tg1', parentId: null,  addedBy: '系统同步', addedAt: '2026/02/16 15:20:00' },
    { memberId: 'm6',  name: '孙倩',   role: 'specialist', groupId: 'tg1', parentId: 'm5',  addedBy: '黄亚芳',   addedAt: '2026/02/16 16:02:00' },
    { memberId: 'm14', name: '何静',   role: 'assistant',  groupId: 'tg1', parentId: 'm6',  addedBy: '孙倩',     addedAt: '2026/02/17 10:12:00' },
    { memberId: 'm15', name: '罗彬',   role: 'assistant',  groupId: 'tg1', parentId: 'm6',  addedBy: '孙倩',     addedAt: '2026/02/17 10:20:00' },
    { memberId: 'm11', name: '刘洋',   role: 'specialist', groupId: 'tg1', parentId: 'm5',  addedBy: '黄亚芳',   addedAt: '2026/02/17 09:00:00' },
    { memberId: 'm12', name: '陈晓',   role: 'assistant',  groupId: 'tg1', parentId: 'm11', addedBy: '刘洋',     addedAt: '2026/02/18 11:30:00' },
    { memberId: 'm9',  name: '徐佳华', role: 'leader',     groupId: 'tg2', parentId: null,  addedBy: '系统同步', addedAt: '2026/02/15 10:00:00' },
    { memberId: 'm13', name: '杨帆',   role: 'specialist', groupId: 'tg2', parentId: 'm9',  addedBy: '徐佳华',   addedAt: '2026/02/15 14:40:00' },
    /* 部门管理成员必有归属：添加归属前置到添加成员时，初始成员同样预置归属（dm* 为部门本地行 id） */
    { memberId: 'dm1', name: '张三', role: 'specialist', groupId: 'tg1', parentId: 'm5',  addedBy: '黄亚芳',   addedAt: '2026/02/18 12:00:00' },
    { memberId: 'dm2', name: '李四', role: 'assistant',  groupId: 'tg1', parentId: 'm6',  addedBy: '孙倩',     addedAt: '2026/02/18 12:00:00' },
    { memberId: 'dm3', name: '李四', role: 'specialist', groupId: 'tg2', parentId: 'm9',  addedBy: '徐佳华',   addedAt: '2026/02/18 12:00:00' },
    { memberId: 'dm4', name: '张三', role: 'assistant',  groupId: 'tg2', parentId: 'm13', addedBy: '杨帆',     addedAt: '2026/02/18 12:00:00' },
  ],
  video: [
    { memberId: 'm5',  name: '黄亚芳', role: 'leader',     groupId: 'vg1', parentId: null,  addedBy: '系统同步', addedAt: '2026/02/16 15:20:00' },
    { memberId: 'm10', name: '郑婷',   role: 'specialist', groupId: 'vg1', parentId: 'm5',  addedBy: '黄亚芳',   addedAt: '2026/02/16 17:10:00' },
    { memberId: 'm16', name: '高翔',   role: 'assistant',  groupId: 'vg1', parentId: 'm10', addedBy: '郑婷',     addedAt: '2026/02/17 15:00:00' },
    { memberId: 'm12', name: '陈晓',   role: 'assistant',  groupId: 'vg1', parentId: 'm10', addedBy: '郑婷',     addedAt: '2026/02/18 09:40:00' },
  ],
};

/* ---------- 工具函数 ---------- */

/** 成员池（部门管理成员数据） */
export function opsMemberSource(id: string): Member | undefined {
  return INITIAL_MEMBERS.find((m) => m.id === id);
}

/** 查询某成员在某平台的归属信息 */
export function getMemberChannelAssignment(
  memberId: string,
  groups: OpsGroup[],
  members: OpsMember[],
): { group: OpsGroup; role: OpsRole } | null {
  const entry = members.find((m) => m.memberId === memberId);
  if (!entry) return null;
  const group = groups.find((g) => g.id === entry.groupId);
  if (!group) return null;
  return { group, role: entry.role };
}

/** 查询某成员在所有平台的归属（用于部门成员列表展示） */
export function getMemberAllAssignments(
  memberId: string,
  allGroups: OpsChannelGroups,
  allMembers: OpsChannelMembers,
): Array<{ channel: OpsChannel; channelLabel: string; group: OpsGroup; role: OpsRole }> {
  return OPS_CHANNELS.flatMap(({ key, label }) => {
    const a = getMemberChannelAssignment(memberId, allGroups[key], allMembers[key]);
    if (!a) return [];
    return [{ channel: key, channelLabel: label, group: a.group, role: a.role }];
  });
}

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

let groupSeq = 100;
export function newGroupId(): string {
  return `g${++groupSeq}`;
}
