/* 运营归属配置类型（对应 shared.tsx 中 RoleAssign / OpsBindCfg） */
import type { OpsChannel, OpsRole } from './opsGroupData';

export type RoleAssign = { groupId: string; parentId: string; groupName: string; memberIds: string[] };
export type OpsBindCfg = Record<OpsChannel, Record<OpsRole, RoleAssign>>;
export const emptyAssign = (): RoleAssign => ({ groupId: '', parentId: '', groupName: '', memberIds: [] });
