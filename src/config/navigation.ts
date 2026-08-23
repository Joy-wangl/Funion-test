/**
 * 顶部 Tab 与侧边栏菜单配置
 * 后续拿到真实菜单结构后，只需替换此处数据即可，无需改动组件代码
 */

export interface MenuItem {
  /** 唯一标识 */
  key: string;
  /** 菜单显示名称 */
  label: string;
  /** 子菜单（存在时渲染为可展开的分组） */
  children?: MenuItem[];
}

export interface TabConfig {
  /** 唯一标识 */
  key: string;
  /** Tab 显示名称 */
  label: string;
  /** 该 Tab 对应的侧边栏菜单 */
  menus: MenuItem[];
}

export const navigation: TabConfig[] = [
  { key: 'app-center', label: '应用中心', menus: [] },
  { key: 'ops-center', label: '智能运营中心', menus: [] },
  { key: 'qc-center', label: '品控中心', menus: [] },
  { key: 'reception-center', label: '聚合接待', menus: [] },
];
