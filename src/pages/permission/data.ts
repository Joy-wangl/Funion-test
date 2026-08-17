/* =========================================================
   Funion 权限管理 · 成员管理 Mock 数据（移植自原型 data.js）
   ========================================================= */

export interface OrgNode {
  id: string;
  name: string;
  count: number;
  children: OrgNode[];
}

export interface Role {
  id: string;
  name: string;
  group: string;
  color: string;
}

export interface DeptNode {
  id: string;
  name: string;
  type?: string;
  desc?: string;
  children: DeptNode[];
}

export type MemberStatus = 'normal' | 'frozen' | 'pending';

export interface Member {
  id: string;
  name: string;
  account: string;
  phone: string;
  status: MemberStatus;
  dept: string;
  deptId: string | null;
  roles: string[];
  addBy: string;
  addAt: string;
}

// 组织树（成员管理左侧）
export const ORG_TREE: OrgNode[] = [
  {
    id: 'o1', name: '一级组织', count: 128, children: [
      {
        id: 'o1-1', name: '二级组织', count: 64, children: [
          {
            id: 'o1-1-1', name: '三级组织', count: 32, children: [
              {
                id: 'o1-1-1-1', name: '四级组织', count: 12, children: [
                  { id: 'o1-1-1-1-1', name: '五级组织', count: 5, children: [] }
                ]
              }
            ]
          }
        ]
      },
      { id: 'o1-2', name: '二级组织B', count: 18, children: [] }
    ]
  },
  { id: 'o2', name: '一级组织A', count: 45, children: [] },
  { id: 'o3', name: '一级组织B', count: 30, children: [] }
];

// 角色列表（供分配角色使用）
export const ROLES: Role[] = [
  { id: 'r1', name: '超级管理员', group: '淘系', color: 'red' },
  { id: 'r2', name: '组长', group: '淘系', color: 'blue' },
  { id: 'r3', name: '专员', group: '淘系', color: 'blue' },
  { id: 'r4', name: '角色A', group: '拼多多', color: 'blue' },
  { id: 'r5', name: '角色B', group: '拼多多', color: 'green' },
  { id: 'r6', name: '角色C', group: '视频号', color: 'orange' },
  { id: 'r7', name: '只读成员', group: '通用', color: '' }
];

// 部门选择树（弹窗用，带公司层级）
export const DEPT_TREE: DeptNode[] = [
  {
    id: 'c1', name: '义乌市裂缝贸易有限公司', type: 'company', children: [
      { id: 'd1', name: '默认部门/子部门A', desc: '51人', children: [] },
      {
        id: 'd2', name: '江西南昌分公司', desc: '28人', children: [
          { id: 'd2-1', name: '运营组', desc: '12人', children: [] },
          { id: 'd2-2', name: '客服组', desc: '9人', children: [] }
        ]
      },
      { id: 'd3', name: '浙江杭州分公司', desc: '36人', children: [] },
      { id: 'd4', name: '湖南长沙分公司', desc: '22人', children: [] }
    ]
  }
];

// 成员列表
export const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: '张三', account: 'zhangsan', phone: '187****3456', status: 'normal', dept: '一级部门/二级部门', deptId: 'd1-1', roles: ['r2', 'r6'], addBy: '系统同步', addAt: '2026/02/18 12:00:00' },
  { id: 'm2', name: '李四', account: 'lisi', phone: '138****8899', status: 'frozen', dept: '一级部门/二级部门', deptId: 'd1-1', roles: ['r3'], addBy: '张三', addAt: '2026/02/18 12:00:00' },
  { id: 'm3', name: '王五', account: '-', phone: '-', status: 'pending', dept: '-', deptId: null, roles: [], addBy: '-', addAt: '-' },
  { id: 'm4', name: '赵六', account: 'zhaoliu', phone: '159****2211', status: 'normal', dept: '二级部门/三级部门', deptId: 'd1-2', roles: ['r1'], addBy: '系统同步', addAt: '2026/02/17 09:30:00' },
  { id: 'm5', name: '黄亚芳', account: 'huangyf', phone: '186****6677', status: 'normal', dept: '视频号/黄亚芳大组', deptId: 'd2-1', roles: ['r2', 'r4'], addBy: '李四', addAt: '2026/02/16 15:20:00' },
  { id: 'm6', name: '孙倩', account: 'sunqian', phone: '133****5432', status: 'normal', dept: '淘宝/绿佳华大组', deptId: 'd2-2', roles: ['r3'], addBy: '系统同步', addAt: '2026/02/15 11:10:00' },
  { id: 'm7', name: '周杰', account: 'zhoujie', phone: '150****9080', status: 'frozen', dept: '拼多多/推广模版', deptId: 'd4-1', roles: ['r5'], addBy: '赵六', addAt: '2026/02/14 18:45:00' },
  { id: 'm8', name: '吴敏', account: 'wumin', phone: '177****3322', status: 'normal', dept: '一级部门/二级部门', deptId: 'd3', roles: ['r7'], addBy: '系统同步', addAt: '2026/02/13 08:00:00' }
];

// 成员操作日志
export const MEMBER_LOGS = [
  { t: '分配角色「组长」「角色C」', time: '2026/02/18 12:05:00', by: '张三' },
  { t: '从「未添加」变更为「正常」', time: '2026/02/18 12:00:00', by: '系统同步' },
  { t: '加入部门「一级部门/二级部门」', time: '2026/02/18 11:58:00', by: '系统同步' }
];

export const STATUS_TEXT: Record<MemberStatus, string> = {
  normal: '正常',
  frozen: '冻结',
  pending: '未添加'
};

export function roleById(id: string): Role | undefined {
  return ROLES.find((r) => r.id === id);
}

/** 组织节点路径，如 一级组织/二级组织/三级组织 */
export function buildOrgPath(id: string, tree: OrgNode[] = ORG_TREE): string {
  let path: string[] = [];
  const dfs = (nodes: OrgNode[], trail: string[]): boolean => {
    for (const n of nodes) {
      const t = [...trail, n.name];
      if (n.id === id) {
        path = t;
        return true;
      }
      if (n.children && dfs(n.children, t)) return true;
    }
    return false;
  };
  dfs(tree, []);
  return path.join('/');
}

/** 默认展开前两层（与原型 depth < 2 一致） */
export function initialExpandedOrgIds(tree: OrgNode[]): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: OrgNode[], depth: number) => {
    for (const n of nodes) {
      if (n.children.length && depth < 2) out.add(n.id);
      walk(n.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}

/** 重命名组织节点（不可变更新） */
export function renameOrgNode(tree: OrgNode[], id: string, name: string): OrgNode[] {
  return tree.map((n) =>
    n.id === id
      ? { ...n, name }
      : { ...n, children: renameOrgNode(n.children, id, name) },
  );
}

/* =========================================================
   部门管理页（原型 department.html）
   ========================================================= */
export interface DpTreeNode {
  id: string;
  name: string;
  children: DpTreeNode[];
}

export const DP_TREE: DpTreeNode[] = [
  {
    id: 't1', name: '淘系自动化', children: [
      {
        id: 't1-1', name: '视频号', children: [
          {
            id: 't1-1-1', name: '黄亚芳大组', children: [
              {
                id: 't1-1-1-1', name: '徐佳华大组', children: [
                  { id: 't1-1-1-1-1', name: '五级', children: [] }
                ]
              }
            ]
          }
        ]
      },
      { id: 't1-2', name: '淘宝', children: [] }
    ]
  },
  { id: 't2', name: '拼多多', children: [] },
  { id: 't3', name: '一级部门', children: [] }
];

export interface DpMember {
  name: string;
  roles: string[];
  adder: string;
  at: string;
}

export const DP_MEMBERS: DpMember[] = [
  { name: '张三', roles: ['角色A', '角色B', '角色C', '角色D'], adder: '张三', at: '2026/02/18 12:00:00' },
  { name: '李四', roles: ['角色A', '角色B'], adder: '邀请人名称', at: '2026/02/18 12:00:00' },
  { name: '李四', roles: ['角色A', '角色B'], adder: '邀请人名称', at: '2026/02/18 12:00:00' },
  { name: '张三', roles: ['角色A', '角色B', '角色C', '角色D'], adder: '邀请人名称', at: '2026/02/18 12:00:00' }
];

/** 部门树查找（通用泛型） */
export function findDpNode(id: string, nodes: DpTreeNode[] = DP_TREE): DpTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findDpNode(id, n.children);
      if (f) return f;
    }
  }
  return null;
}

/** 重命名部门树节点（不可变更新） */
export function renameDpNode(tree: DpTreeNode[], id: string, name: string): DpTreeNode[] {
  return tree.map((n) =>
    n.id === id ? { ...n, name } : { ...n, children: renameDpNode(n.children, id, name) },
  );
}

/* =========================================================
   角色权限页（原型 role.html）
   ========================================================= */
export interface RoleGroupNode {
  id: string;
  name: string;
  members?: number;
  children?: RoleGroupNode[];
}

export const ROLE_GROUPS: RoleGroupNode[] = [
  {
    id: 'g1', name: '淘系', children: [
      { id: 'r1', name: '超级管理员', members: 2 },
      { id: 'r2', name: '组长', members: 3 },
      { id: 'r3', name: '专员', members: 34 }
    ]
  },
  { id: 'g2', name: '拼多多', children: [] },
  { id: 'g3', name: 'IT', children: [] }
];

export interface RoleMember {
  name: string;
  dept: string;
  adder: string;
  at: string;
}

export const INITIAL_ROLE_MEMBERS: RoleMember[] = [
  { name: '张三', dept: '浙江杭州分公司-IT部-项目组-产品组', adder: '18733748895', at: '2026/07/13 12:00:00' },
  { name: '张三', dept: '所在组织', adder: '18733748895', at: '2026/07/13 12:00:00' },
  { name: '张三', dept: '所在组织"-"拼接层级', adder: '18733748895', at: '2026/07/13 12:00:00' }
];

// 数据权限选项
export const OPT5 = ['全部数据', '指定部门及以下', '本级及下级部门', '本部门', '仅自己'];
export const OPT4 = ['全部数据', '本级及下级部门', '本部门', '仅自己'];

// 指定部门选择树（权限配置-选择部门弹窗）
export interface PickerDeptNode {
  id: string;
  name: string;
  children: PickerDeptNode[];
}

export const DEPT_PICKER: { company: string; depts: PickerDeptNode[] } = {
  company: '义乌市的晗贸易有限公司',
  depts: [
    {
      id: 'd1', name: '默认部门子部门A', children: [
        { id: 'd1-1', name: '子部门A-1', children: [] },
        { id: 'd1-2', name: '子部门A-2', children: [] }
      ]
    },
    {
      id: 'd2', name: '江西南昌分公司', children: [
        { id: 'd2-1', name: '运营组', children: [] },
        { id: 'd2-2', name: '客服组', children: [] }
      ]
    },
    {
      id: 'd3', name: '浙江杭州分公司', children: [
        { id: 'd3-1', name: '杭州一组', children: [] }
      ]
    },
    { id: 'd4', name: '湖南长沙分公司', children: [] }
  ]
};

// 权限矩阵配置（一级菜单/二级菜单/查看数据/管理数据/功能权限）
export interface PermRadioCfg { opts: string[]; sel: number; link?: string }

export interface PermMenuItem {
  name: string;
  checked: boolean;
  view: PermRadioCfg | null;
  manage: PermRadioCfg | null;
  func: string[];
  children?: PermMenuItem[];
}

export const PERMISSION_MENU: PermMenuItem[] = [
  { name: '商品搜索', checked: true, view: null, manage: null, func: [] },
  { name: '链接商品库', checked: true, view: null, manage: null, func: [] },
  {
    name: '模版中心', checked: true, view: null, manage: null, func: [], children: [
      { name: '商品模版', checked: true, view: { opts: OPT5, sel: 1, link: '选择' }, manage: { opts: OPT5, sel: 1, link: '选择' }, func: ['竞品导入', '发布到店铺', '创建版本', '编辑版本详情', '删除版本信息'] },
      { name: '冲量模版', checked: true, view: { opts: OPT5, sel: 1, link: '选择' }, manage: { opts: OPT5, sel: 1, link: '查看已选' }, func: ['新建模版', '编辑模版', '删除模版'] }
    ]
  },
  {
    name: '店铺商品', checked: true, view: null, manage: null, func: [], children: [
      { name: '视频号', checked: true, view: { opts: OPT4, sel: 1 }, manage: { opts: OPT4, sel: 1 }, func: ['商品上架', '商品下架', '编辑商品信息'] },
      { name: '淘宝', checked: true, view: { opts: OPT4, sel: 1 }, manage: null, func: [] }
    ]
  },
  { name: '任务列表', checked: true, view: { opts: OPT4, sel: 1 }, manage: { opts: OPT4, sel: 1 }, func: ['失败重新执行'] },
  { name: '商品策略', checked: true, view: { opts: OPT4, sel: 1 }, manage: { opts: OPT4, sel: 1 }, func: ['新建策略', '编辑策略信息', '删除策略'] },
  { name: '店铺账号', checked: true, view: { opts: OPT4, sel: 1 }, manage: { opts: OPT4, sel: 1 }, func: ['进入店铺', '店铺管理'] },
  {
    name: '成员管理', checked: true, view: null, manage: null, func: [], children: [
      { name: '成员管理', checked: true, view: null, manage: null, func: ['管理成员'] },
      { name: '部门管理', checked: true, view: { opts: OPT4, sel: 1 }, manage: { opts: OPT4, sel: 1 }, func: ['新建根部门', '添加部门成员', '编辑部门信息', '删除部门', '添加下级部门'] },
      { name: '角色权限', checked: true, view: null, manage: null, func: ['全部权限'] }
    ]
  }
];

// 头像配色（选择成员弹窗）
export const AVA_COLORS = ['#165DFF', '#0FC6C2', '#722ED1', '#F77234', '#00B42A', '#F53F3F', '#EB4BA0', '#3491FA'];

export function avaColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVA_COLORS[h % AVA_COLORS.length];
}

// 部门管理树（选择成员弹窗用，含公司层级）
export const DEPT_MGMT_TREE: DeptNode[] = [
  {
    id: 'c1', name: '义乌市裂缝贸易有限公司', type: 'company', children: [
      {
        id: 'd1', name: '默认部门', desc: '51人', children: [
          { id: 'd1-1', name: '子部门A', desc: '12人', children: [] },
          { id: 'd1-2', name: '子部门B', desc: '8人', children: [] }
        ]
      },
      {
        id: 'd2', name: '江西南昌分公司', desc: '28人', children: [
          { id: 'd2-1', name: '运营组', desc: '12人', children: [] },
          { id: 'd2-2', name: '客服组', desc: '9人', children: [] }
        ]
      },
      { id: 'd3', name: '浙江杭州分公司', desc: '36人', children: [] },
      {
        id: 'd4', name: '湖南长沙分公司', desc: '22人', children: [
          { id: 'd4-1', name: '直播组', desc: '10人', children: [] }
        ]
      }
    ]
  }
];

export function findDeptNode(id: string, tree: DeptNode[] = DEPT_MGMT_TREE): DeptNode | null {
  let f: DeptNode | null = null;
  const dfs = (ns: DeptNode[]): boolean => {
    for (const n of ns) {
      if (n.id === id) { f = n; return true; }
      if (n.children && dfs(n.children)) return true;
    }
    return false;
  };
  dfs(tree);
  return f;
}

export function deptDescendantIds(id: string): Set<string> {
  const out = new Set<string>();
  const root = findDeptNode(id);
  if (root) {
    const col = (n: DeptNode) => { out.add(n.id); (n.children || []).forEach(col); };
    col(root);
  }
  return out;
}

export function membersOfDept(id: string, members: Member[]): Member[] {
  if (id === 'c1') return members;
  const ids = deptDescendantIds(id);
  return members.filter((m) => m.deptId && ids.has(m.deptId));
}
