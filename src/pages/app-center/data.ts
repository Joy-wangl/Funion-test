/* 应用中心数据：严格按原型图还原（应用列表/搜索/详情/我的应用/上传新创作） */

export interface IconSpec {
  /** 图标背景（CSS background） */
  bg: string;
  /** 图标字符 */
  g: string;
  /** 字符颜色 */
  c?: string;
}

export interface Preview {
  title: string;
  sub: string;
  hue: 'blue' | 'cyan' | 'news' | 'violet';
}

export interface AppItem {
  id: string;
  name: string;
  desc: string;
  icon: IconSpec;
  category: string;
  /** 已添加 */
  added: boolean;
  /** 我创建的 */
  mine: boolean;
  /** 已添加但有新版本 */
  hasUpdate?: boolean;
  users: number;
  release: string;
  creator: string;
  previews: Preview[];
  tags: string[];
}

/* 按钮态推导：我创建的→打开（无添加操作）；未添加→添加；已添加有新版本→更新；其余→打开 */
export const actKind = (a: AppItem): 'add' | 'update' | 'open' =>
  a.mine ? 'open' : !a.added ? 'add' : a.hasUpdate ? 'update' : 'open';

export const CATEGORIES = ['数据管理类', '浏览器插件', '绘图工具', '实用小工具', 'Agent工具'];

export const FORM_CATEGORIES = ['休闲娱乐', 'Agent', '运营插件', '社交活动'];

export const ICON_PRESETS: IconSpec[] = [
  { bg: '#fff', g: '🐝' },
  { bg: 'linear-gradient(135deg,#1e88ff,#63b3ff)', g: 'M', c: '#fff' },
  { bg: 'linear-gradient(135deg,#00c6ff,#0072ff)', g: 'G', c: '#fff' },
  { bg: 'linear-gradient(135deg,#7b2ff7,#b365ff)', g: 'Hi', c: '#fff' },
  { bg: 'linear-gradient(135deg,#ff512f,#dd2476)', g: '✊', c: '#fff' },
  { bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', g: 'U', c: '#fff' },
  { bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', g: 'N', c: '#fff' },
  { bg: 'linear-gradient(135deg,#f83600,#f9d423)', g: 'E', c: '#fff' },
  { bg: 'linear-gradient(135deg,#30cfd0,#330867)', g: 'J', c: '#fff' },
  { bg: 'linear-gradient(135deg,#c471f5,#fa71cd)', g: 'B', c: '#fff' },
];

export const PREVIEW_PRESETS: Preview[] = [
  { title: '华为云Flexus云服务', sub: '新一代性能倍增、体验跃级的云服务系列', hue: 'blue' },
  { title: '光谱慧医', sub: '更懂你的AI私人医生', hue: 'cyan' },
  { title: '热点直通车', sub: '今日起，与你有关的新规', hue: 'news' },
  { title: 'AI营销决策平台', sub: 'AI时代，营销增长新引擎', hue: 'violet' },
];

export const TAG_PRESETS = ['绿色', '高效', '协同', '智能'];

const bee = (n: number): IconSpec => ICON_PRESETS[n % ICON_PRESETS.length];

export const initialApps: AppItem[] = [
  { id: 'hb-1', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(1), category: '数据管理类', added: false, mine: false, users: 892, release: '2026/05/12', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-2', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: '数据管理类', added: true, mine: false, hasUpdate: true, users: 1521, release: '2026/06/01', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-3', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(3), category: '浏览器插件', added: false, mine: false, users: 356, release: '2026/07/15', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-4', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(4), category: '绘图工具', added: true, mine: false, users: 2210, release: '2026/01/20', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-5', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(5), category: '实用小工具', added: false, mine: false, users: 480, release: '2026/04/03', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-6', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(6), category: 'Agent工具', added: false, mine: false, users: 764, release: '2026/03/18', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-7', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: '绘图工具', added: false, mine: false, users: 233, release: '2026/06/22', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-8', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(3), category: '实用小工具', added: false, mine: false, users: 610, release: '2026/02/14', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-9', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(4), category: 'Agent工具', added: false, mine: false, users: 158, release: '2026/07/30', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'jst', name: '聚水潭ERP', desc: '小蜜蜂干活很刻苦', icon: bee(7), category: '数据管理类', added: false, mine: false, users: 1310, release: '2026/05/28', creator: '吴孝朝', previews: [PREVIEW_PRESETS[2]], tags: [] },
  { id: 'kingdee', name: '金蝶ERP', desc: '小蜜蜂干活很刻苦', icon: bee(8), category: '数据管理类', added: true, mine: false, hasUpdate: true, users: 980, release: '2026/04/19', creator: '吴孝朝', previews: [PREVIEW_PRESETS[1]], tags: [] },
  { id: 'hzw', name: '海贼王ERP', desc: '小蜜蜂干活很刻苦，不知劳累就是干', icon: bee(5), category: '数据管理类', added: false, mine: false, users: 599, release: '2026/08/13', creator: '吴孝朝', previews: [PREVIEW_PRESETS[0], PREVIEW_PRESETS[0], PREVIEW_PRESETS[0]], tags: [] },
  { id: 'c-1', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(1), category: 'Agent', added: false, mine: true, users: 120, release: '2026/06/10', creator: '七妮妮', previews: [PREVIEW_PRESETS[3]], tags: ['绿色'] },
  { id: 'c-2', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: 'Agent', added: false, mine: true, users: 86, release: '2026/07/02', creator: '七妮妮', previews: [PREVIEW_PRESETS[1]], tags: [] },
  { id: 'a-1', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(1), category: '数据管理类', added: true, mine: false, users: 892, release: '2026/05/12', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'a-2', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: '浏览器插件', added: true, mine: false, users: 1521, release: '2026/06/01', creator: '吴孝朝', previews: [], tags: [] },
];
