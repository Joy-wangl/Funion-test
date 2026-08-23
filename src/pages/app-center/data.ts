/* 应用中心数据：严格按原型图还原（应用列表/搜索/详情/我的应用/上传新创作） */

import { INITIAL_MEMBERS } from '../permission/data';

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
  /** 上新/更新描述（首页「应用上新」展示） */
  releaseNote?: string;
  /** 当前版本号 */
  version?: string;
  /** 更新前版本号（更新弹窗展示版本变化） */
  prevVersion?: string;
  /** 应用类型（第二步） */
  appType?: string;
  /** Web 部署模式 */
  deployMode?: 'link' | 'file';
  /** 外部链接地址 */
  linkUrl?: string;
  /** 已上传应用文件名 */
  appFile?: string;
  /** EXE 运行文件路径 */
  runFile?: string;
  /** 发布方式 */
  publishMode?: 'online' | 'test';
  /** 权限管理范围 */
  permScope?: string;
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

/* ---------- 标签颜色定义 ---------- */
export interface TagDef { name: string; color: string; }

export const INITIAL_TAG_DEFS: TagDef[] = [
  { name: '绿色', color: '#52c41a' },
  { name: '高效', color: '#4f7cff' },
  { name: '协同', color: '#fa8c16' },
  { name: '智能', color: '#7b2ff7' },
];

/** 新建标签弹窗预设色板 */
export const TAG_COLOR_PRESETS = ['#52c41a', '#4f7cff', '#fa8c16', '#7b2ff7', '#f5222d', '#eb2f96', '#13c2c2', '#faad14'];

/* ---------- 应用类型 / 发布配置（新建第二步） ---------- */
export const APP_TYPES = ['Web应用', 'EXE程序', '浏览器插件'];

export const PERM_SCOPES = ['所有人', '仅运营团队', '仅自己'];

/** 模拟上传：按类型生成演示文件名 */
export const demoFileName = (type: string): string =>
  type === 'EXE程序' ? 'installer.exe' : type === '浏览器插件' ? 'extension.zip' : 'webapp-dist.zip';

/* ---------- 详情：版本号 / 新功能介绍 ---------- */
export const versionOf = (a: AppItem): string => a.version ?? '1.0.0';

export interface Feature { t: string; d: string; }

const FEATURE_POOL: Feature[] = [
  { t: '智能分析', d: '自动生成数据报表，业务波动一目了然。' },
  { t: '批量操作', d: '支持海量数据批量导出与修改，告别重复劳动。' },
  { t: '多平台同步', d: '淘宝、拼多多、抖音等多平台数据实时同步。' },
  { t: '协同审批', d: '任务在团队成员间自动流转，进度透明可追溯。' },
  { t: 'AI 助手', d: '内置智能问答，运营建议随时获取。' },
  { t: '权限管控', d: '按角色细分权限配置，数据安全可控。' },
];

/** 按应用 id 确定性取 3 个新功能亮点 */
export const featuresOf = (appId: string): Feature[] => {
  const n = appId.charCodeAt(appId.length - 1) + appId.length;
  return Array.from({ length: 3 }, (_, i) => FEATURE_POOL[(n + i * 2) % FEATURE_POOL.length]);
};

const bee = (n: number): IconSpec => ICON_PRESETS[n % ICON_PRESETS.length];

export const initialApps: AppItem[] = [
  { id: 'hb-1', name: '小蜜蜂A', desc: '小蜜蜂干活很刻苦', icon: bee(1), category: '数据管理类', added: false, mine: false, users: 892, release: '2026/05/12', creator: '吴孝朝', previews: [], tags: ['高效'] },
  { id: 'hb-2', name: '小蜜蜂B', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: '数据管理类', added: true, mine: false, hasUpdate: true, releaseNote: '新增批量导出与快捷键，修复偶发卡顿', version: '2.3.1', prevVersion: '2.2.0', users: 1521, release: '2026/06/01', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-3', name: '小蜜蜂C', desc: '小蜜蜂干活很刻苦', icon: bee(3), category: '浏览器插件', added: false, mine: false, users: 356, release: '2026/08/16', creator: '徐佳华', previews: [], tags: [] },
  { id: 'hb-4', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(4), category: '绘图工具', added: true, mine: false, users: 2210, release: '2026/01/20', creator: '黄亚芳', previews: [], tags: [] },
  { id: 'hb-5', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(5), category: '实用小工具', added: false, mine: false, users: 480, release: '2026/07/28', creator: '陈晓', previews: [], tags: [] },
  { id: 'hb-6', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(6), category: 'Agent工具', added: false, mine: false, users: 764, release: '2026/03/18', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-7', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: '绘图工具', added: false, mine: false, users: 233, release: '2026/08/05', creator: '吴孝朝', previews: [], tags: [] },
  { id: 'hb-8', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(3), category: '实用小工具', added: false, mine: false, users: 610, release: '2026/02/14', creator: '郑婷', previews: [], tags: [] },
  { id: 'hb-9', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(4), category: 'Agent工具', added: false, mine: false, releaseNote: '新增 Agent 任务编排能力', users: 158, release: '2026/08/18', creator: '杨帆', previews: [], tags: [] },
  { id: 'jst', name: '聚水潭ERP', desc: '小蜜蜂干活很刻苦', icon: bee(7), category: '数据管理类', added: false, mine: false, users: 1310, release: '2026/05/28', creator: '吴孝朝', previews: [PREVIEW_PRESETS[2]], tags: ['高效', '协同'] },
  { id: 'kingdee', name: '金蝶ERP', desc: '小蜜蜂干活很刻苦', icon: bee(8), category: '数据管理类', added: true, mine: false, hasUpdate: true, releaseNote: '升级报表引擎，新增多账套切换', version: '3.1.0', prevVersion: '3.0.2', users: 980, release: '2026/04/19', creator: '吴孝朝', previews: [PREVIEW_PRESETS[1]], tags: [] },
  { id: 'hzw', name: '海贼王ERP', desc: '小蜜蜂干活很刻苦，不知劳累就是干', icon: bee(5), category: '数据管理类', added: false, mine: false, users: 599, release: '2026/08/13', creator: '吴孝朝', previews: [PREVIEW_PRESETS[0], PREVIEW_PRESETS[0], PREVIEW_PRESETS[0]], tags: ['高效'] },
  { id: 'c-1', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(1), category: 'Agent', added: false, mine: true, users: 120, release: '2026/06/10', creator: '七妮妮', previews: [PREVIEW_PRESETS[3]], tags: ['绿色'] },
  { id: 'c-2', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: 'Agent', added: false, mine: true, users: 86, release: '2026/08/20', creator: '七妮妮', previews: [PREVIEW_PRESETS[1]], tags: [] },
  { id: 'a-1', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(1), category: '数据管理类', added: true, mine: false, users: 892, release: '2026/05/12', creator: '吴孝朝', previews: [], tags: ['协同'] },
  { id: 'a-2', name: '勤劳小蜜蜂', desc: '小蜜蜂干活很刻苦', icon: bee(2), category: '浏览器插件', added: true, mine: false, users: 1521, release: '2026/06/01', creator: '吴孝朝', previews: [], tags: [] },
  { id: 't-1', name: '客服话术宝', desc: '客服常用话术一键回复', icon: bee(3), category: '实用小工具', added: false, mine: false, users: 320, release: '2026/08/16', creator: '张三', previews: [], tags: [] },
  { id: 't-2', name: '周报生成器', desc: '自动汇总本周工作生成周报', icon: bee(4), category: 'Agent工具', added: false, mine: false, users: 260, release: '2026/08/17', creator: '赵六', previews: [], tags: [] },
  { id: 't-3', name: '淘宝详情大师', desc: '详情页排版与主图优化', icon: bee(5), category: '绘图工具', added: false, mine: false, users: 410, release: '2026/08/18', creator: '孙倩', previews: [], tags: [] },
  { id: 't-4', name: '拼多多模板王', desc: '拼多多推广模板批量生成', icon: bee(6), category: '浏览器插件', added: false, mine: false, releaseNote: '首发上线：推广模板批量生成', users: 380, release: '2026/08/19', creator: '周杰', previews: [], tags: [] },
  { id: 't-5', name: '订单对账通', desc: '多平台订单自动对账', icon: bee(7), category: '数据管理类', added: false, mine: false, releaseNote: '首发上线：多平台订单自动对账', users: 520, release: '2026/08/20', creator: '刘洋', previews: [], tags: [] },
  { id: 't-6', name: '部门知识库', desc: '部门文档沉淀与问答', icon: bee(8), category: 'Agent', added: false, mine: false, releaseNote: '首发上线：文档沉淀与智能问答', users: 150, release: '2026/08/21', creator: '何静', previews: [], tags: [] },
  { id: 't-7', name: '杭州巡店助手', desc: '巡店记录与问题跟进', icon: bee(1), category: '实用小工具', added: false, mine: false, releaseNote: '首发上线：巡店打卡与问题跟进闭环', users: 290, release: '2026/08/21', creator: '陈晓', previews: [], tags: [] },
  { id: 't-8', name: '视频脚本库', desc: '短视频脚本灵感与模板', icon: bee(2), category: 'Agent工具', added: false, mine: false, releaseNote: '首发上线：内置 200+ 短视频脚本模板', users: 340, release: '2026/08/22', creator: '黄亚芳', previews: [], tags: [] },
];

/* ---------- 首页：组织归属 / 平台公告 / 区间使用人次 ---------- */

/** 未纳入成员管理的创作者（当前用户等）钉钉归属兑底 */
export const CREATOR_DEPT: Record<string, string> = {
  七妮妮: '江西南昌分公司/运营组',
  吴孝朝: '浙江杭州分公司',
};

/** 创作者组织架构：优先取成员管理（钉钉归属），未收录走兑底 */
export const creatorDept = (name: string): string =>
  INITIAL_MEMBERS.find((m) => m.name === name)?.dept ?? CREATOR_DEPT[name] ?? '其他部门';

/** 平台公告 */
export interface PlatformNotice { id: string; title: string; date: string; tag: string; content: string; }

export const PLATFORM_NOTICES: PlatformNotice[] = [
  { id: 'pn-1', title: '应用中心新版上线：首页与贡献榜发布', date: '2026/08/20', tag: '公告', content: '为帮助大家更快发现好应用，应用中心全新上线「首页」：支持最近使用、我收藏的应用、应用上新与升级公告、平台公告、贡献榜等能力，欢迎体验并反馈建议。' },
  { id: 'pn-2', title: '应用市场例行维护通知', date: '2026/08/15', tag: '维护', content: '为保障服务稳定，平台将于 8 月 16 日 02:00 - 04:00 进行系统例行维护，期间应用的添加、更新操作将短暂不可用，请提前安排相关操作。' },
  { id: 'pn-3', title: '创作者激励计划报名开启', date: '2026/08/08', tag: '活动', content: '本月起，上榜个人/部门贡献榜的创作者将获得季度激励与「创作之星」标识，最佳应用榜上榜应用将在首页获得推荐位，期待大家的优秀作品。' },
];

export const RANK_RANGES = ['近7天', '近30天', '全部时间'];

/** 时间范围内使用人次（按总使用人次折算） */
export const usageInRange = (a: AppItem, range: string): number =>
  range === '近7天' ? Math.round(a.users * 0.12) : range === '近30天' ? Math.round(a.users * 0.45) : a.users;

/* ---------- 首页：意见反馈（会话线程模型） ---------- */
export interface FbMsg {
  id: string;
  role: 'user' | 'admin';
  by: string;
  at: string;
  content: string;
}

export interface FeedbackItem {
  id: string;
  type: string;
  at: string;
  msgs: FbMsg[];
  /** 系统开发者已读标记（false=未读） */
  read?: boolean;
}

export const FB_TYPES = ['功能建议', '问题反馈', '体验优化'];

export const INITIAL_FEEDBACKS: FeedbackItem[] = [
  {
    id: 'fb-3', type: '体验优化', at: '2026/08/21 18:30', read: false, msgs: [
      { id: 'fb-3-m1', role: 'user', by: '七妮妮', at: '2026/08/21 18:30', content: '希望贡献榜支持一键展开所有人的应用，不用逐个点。' },
    ],
  },
  {
    id: 'fb-2', type: '问题反馈', at: '2026/08/20 09:12', msgs: [
      { id: 'fb-2-m1', role: 'user', by: '七妮妮', at: '2026/08/20 09:12', content: '我的应用页里，偶尔出现我添加的应用顺序错乱，刷新后恢复。' },
      { id: 'fb-2-m2', role: 'admin', by: '应用市场管理员', at: '2026/08/20 11:05', content: '已确认是本地缓存排序问题，v2.3.1 已修复上线，请刷新后重试，如仍复现请再反馈。' },
    ],
  },
  {
    id: 'fb-1', type: '功能建议', at: '2026/08/19 14:20', msgs: [
      { id: 'fb-1-m1', role: 'user', by: '七妮妮', at: '2026/08/19 14:20', content: '希望贡献榜支持查看近30天的排名趋势，方便看团队成长曲线。' },
      { id: 'fb-1-m2', role: 'admin', by: '应用市场管理员', at: '2026/08/19 16:40', content: '已采纳：时间维度（近7天/近30天/全部时间）已上线，感谢建议！' },
    ],
  },
];

/* ---------- 详情页：评分及评论（仅添加应用后可评价，评分取平均） ---------- */
export interface AppReview {
  id: string;
  appId: string;
  user: string;
  stars: number;
  title: string;
  text: string;
  date: string;
  /** 评价对应的应用版本（每个版本仅可评价一次） */
  version: string;
  /** 创作者回复（消息中心-应用渠道闭环） */
  reply?: { text: string; date: string };
  /** 评价配图（最多 3 张） */
  images?: string[];
  /** 创作者已读标记（false=未读） */
  read?: boolean;
}

/* ---------- 批量生成评价：同名演示应用每应用补齐 10 条，保证溢出演示不漏 ---------- */
const GEN_USERS = ['杨帆', '郑婷', '陈晓', '徐佳华', '黄亚芳', '吴孝朝'];
const GEN_TITLES = ['稳定好用', '整体满意', '效率提升', '值得推荐', '细节到位', '还有优化空间', '上手很快', '体验不错', '团队都在用', '期待更新'];
const GEN_TEXTS = [
  '日常使用稳定，任务处理清晰明了。',
  '功能全面，希望增加更多批量操作能力。',
  '工作流顺畅多了，团队协作也变好。',
  '上手成本低，用起来顺手。',
  '快捷键和提示设计得很贴心。',
  '高峰期偶尔卡顿，期待优化。',
  '五分钟就能上手，文档也清晰。',
  '界面清爽，流程顺畅。',
  '同事都说好，已经推荐给别的部门。',
  '整体不错，希望支持更多模板。',
];
const GEN_REPLIES = [
  '感谢支持！我们会持续更新，越做越好用。',
  '已收到建议，相关能力在排期中，预计下个版本上线。',
  '谢谢细致评价！后续还会打磨更多细节。',
  '已定位卡顿问题，正在优化，请关注修复版本。',
  '感谢推荐！团队版能力正在打磨，敬请期待。',
];
const GEN_DATES = ['2026/08/21', '2026/08/18', '2026/08/15', '2026/08/10', '2026/08/05', '2026/07/28', '2026/07/20', '2026/07/12', '2026/07/03', '2026/06/24'];
const GEN_STARS = [5, 4, 5, 4, 5, 3, 5, 4, 5, 4];

const genReviews = (appId: string, version: string, count = 10, offset = 0): AppReview[] =>
  Array.from({ length: count }, (_, k) => {
    const i = k + offset;
    const seed = appId.charCodeAt(appId.length - 1) + appId.length;
    const n = i + seed;
    return {
      id: `gv-${appId}-${k}`,
      appId,
      user: GEN_USERS[n % GEN_USERS.length],
      stars: GEN_STARS[n % GEN_STARS.length],
      title: GEN_TITLES[n % GEN_TITLES.length],
      text: GEN_TEXTS[n % GEN_TEXTS.length],
      date: GEN_DATES[i % GEN_DATES.length],
      version,
      images: n % 4 === 0 ? ['/products/main.png'] : n % 5 === 0 ? ['/products/serum.png'] : undefined,
      reply: n % 2 === 0 ? { text: GEN_REPLIES[n % GEN_REPLIES.length], date: '2026/08/22' } : undefined,
    };
  });

export const seedReviews: AppReview[] = [
  { id: 'rv-1', appId: 'kingdee', user: '吴孝朝', stars: 5, title: '问题修复及时', text: '开发者及时，是值得购买的好软件！', date: '2026/07/15', version: '3.0.2', images: ['/products/main.png'] },
  { id: 'rv-2', appId: 'kingdee', user: '徐佳华', stars: 5, title: '真的是非常好用的软件', text: '报表引擎升级后更好用了，多账套切换很方便，推荐！！！', date: '2026/08/02', version: '3.1.0' },
  { id: 'rv-3', appId: 'kingdee', user: '黄亚芳', stars: 4, title: '整体满意', text: '功能全面，希望增加更多自定义报表模板。', date: '2026/06/20', version: '3.0.2', images: ['/products/serum.png', '/products/main.png'] },
  { id: 'rv-4', appId: 'kingdee', user: '陈晓', stars: 5, title: '效率提升明显', text: '财务团队每天在用，月结效率提升明显。', date: '2026/08/18', version: '3.1.0' },
  { id: 'rv-5', appId: 'kingdee', user: '郑婷', stars: 3, title: '还有优化空间', text: '高峰期加载有点慢，期待优化。', date: '2026/05/30', version: '3.0.2' },
  
  { id: 'rv-9', appId: 'jst', user: '郑婷', stars: 5, title: '对接顺畅', text: '与订单系统对接顺畅，库存同步很准。', date: '2026/07/08', version: '1.0.0' },
  { id: 'rv-10', appId: 'jst', user: '徐佳华', stars: 4, title: '值得推荐', text: '界面简洁，上手快，适合运营同学。', date: '2026/05/19', version: '1.0.0' },
  { id: 'rv-11', appId: 'hzw', user: '杨帆', stars: 5, title: '好用', text: '功能扎实，几乎没遇到过 bug。', date: '2026/08/01', version: '1.0.0' },
  { id: 'rv-12', appId: 'c-1', user: '吴孝朝', stars: 5, title: '巡店记录清晰', text: '巡店记录清晰，问题跟进很快，团队每天都在用。', date: '2026/08/18', version: '1.0.0', reply: { text: '感谢支持！我们会持续优化体验。', date: '2026/08/19' } },
  { id: 'rv-13', appId: 'c-1', user: '黄亚芳', stars: 4, title: '期待更多模板', text: '整体体验不错，希望增加更多巡店模板。', date: '2026/08/21', version: '1.0.0', read: false },
  { id: 'rv-14', appId: 'c-2', user: '杨帆', stars: 5, title: '灵感库很扎实', text: '视频脚本灵感库很扎实，更新也快。', date: '2026/08/21', version: '1.0.0', read: false },
  { id: 'rv-15', appId: 'c-2', user: '吴孝朝', stars: 5, title: '模板丰富', text: '模板分类齐全，脚本照着拍命中率很高。', date: '2026/08/20', version: '1.0.0', images: ['/products/main.png'] },
  { id: 'rv-16', appId: 'c-2', user: '徐佳华', stars: 4, title: '很实用', text: '希望能收藏常用脚本，下次直接复用。', date: '2026/08/19', version: '1.0.0' },
  { id: 'rv-17', appId: 'c-2', user: '陈晓', stars: 5, title: '新手友好', text: '跟着模板就能上手，省去憋灵感的功夫。', date: '2026/08/18', version: '1.0.0' },
  { id: 'rv-18', appId: 'c-2', user: '郑婷', stars: 4, title: '内容充实', text: '灵感库更新频率高，质量也不错。', date: '2026/08/17', version: '1.0.0', images: ['/products/serum.png'] },
  { id: 'rv-19', appId: 'c-2', user: '黄亚芳', stars: 5, title: '效率高', text: '批量参考 + 二次创作，内容产出效率翻倍。', date: '2026/08/16', version: '1.0.0' },
  { id: 'rv-20', appId: 'c-1', user: '郑婷', stars: 5, title: '跟进闭环好用', text: '问题拍照记录、指派、复核一条龙，门店整改快多了。', date: '2026/08/20', version: '1.0.0', images: ['/products/main.png'] },
  { id: 'rv-21', appId: 'c-1', user: '陈晓', stars: 4, title: '记录清晰', text: '巡店路线和记录都很清晰，新人也能快速上手。', date: '2026/08/19', version: '1.0.0' },
  { id: 'rv-22', appId: 'c-1', user: '徐佳华', stars: 5, title: '团队必备', text: '多门店统一标准，复查有依据，团队每天都在用。', date: '2026/08/18', version: '1.0.0', images: ['/products/serum.png'] },
  { id: 'rv-23', appId: 'c-1', user: '杨帆', stars: 4, title: '希望支持导出', text: '整体很好用，希望巡店报告能一键导出周报。', date: '2026/08/17', version: '1.0.0' },
  { id: 'rv-24', appId: 'kingdee', user: '杨帆', stars: 5, title: '月结神器', text: '月结流程自动化程度高，加班明显变少了。', date: '2026/08/19', version: '3.1.0', images: ['/products/main.png'] },
  { id: 'rv-25', appId: 'kingdee', user: '吴孝朝', stars: 4, title: '稳定可靠', text: '大账套跑起来也稳，希望报表样式更多些。', date: '2026/08/17', version: '3.1.0' },
  { id: 'rv-26', appId: 'jst', user: '黄亚芳', stars: 5, title: '库存同步准', text: '多平台库存实时同步，超卖情况基本没了。', date: '2026/08/18', version: '1.0.0', images: ['/products/serum.png'] },
  { id: 'rv-27', appId: 'jst', user: '陈晓', stars: 4, title: '运营好帮手', text: '打单发货流程顺畅，售后处理也方便。', date: '2026/08/16', version: '1.0.0' },
  /* hb-1：10 条 */
  { id: 'rv-28', appId: 'hb-1', user: '杨帆', stars: 5, title: '稳定好用', text: '用了两个月，任务分配清晰明了。', date: '2026/08/20', version: '1.0.0', reply: { text: '感谢支持！我们会持续更新，越做越好用。', date: '2026/08/21' } },
  { id: 'rv-29', appId: 'hb-1', user: '郑婷', stars: 4, title: '整体满意', text: '功能全面，希望增加批量操作。', date: '2026/08/18', version: '1.0.0', reply: { text: '已收到建议，批量操作在排期中，预计下个版本上线。', date: '2026/08/19' } },
  { id: 'rv-30', appId: 'hb-1', user: '陈晓', stars: 5, title: '效率提升', text: '日常工作流顺畅多了，团队协作也变好。', date: '2026/08/15', version: '1.0.0', images: ['/products/main.png'], reply: { text: '感谢反馈！协作能力刚升级，欢迎体验。', date: '2026/08/16' } },
  { id: 'rv-31', appId: 'hb-1', user: '徐佳华', stars: 4, title: '值得推荐', text: '上手成本低，用起来顺手。', date: '2026/08/12', version: '1.0.0' },
  { id: 'rv-32', appId: 'hb-1', user: '黄亚芳', stars: 5, title: '细节到位', text: '快捷键和提示设计得很贴心。', date: '2026/08/08', version: '1.0.0', reply: { text: '谢谢细致评价！后续还会打磨更多细节。', date: '2026/08/09' } },
  { id: 'rv-33', appId: 'hb-1', user: '吴孝朝', stars: 3, title: '还有优化空间', text: '高峰期偶尔卡顿，期待优化。', date: '2026/07/30', version: '1.0.0', reply: { text: '已定位高峰期卡顿问题，正在优化，请关注修复版本。', date: '2026/07/31' } },
  { id: 'rv-34', appId: 'hb-1', user: '杨帆', stars: 5, title: '可靠', text: '数据同步准确，几乎没出过差错。', date: '2026/07/22', version: '1.0.0' },
  { id: 'rv-35', appId: 'hb-1', user: '郑婷', stars: 4, title: '体验不错', text: '界面清爽，流程顺畅。', date: '2026/07/15', version: '1.0.0', images: ['/products/serum.png'] },
  { id: 'rv-36', appId: 'hb-1', user: '陈晓', stars: 5, title: '团队都在用', text: '同事都说好，已经推荐给别的部门。', date: '2026/07/05', version: '1.0.0', reply: { text: '感谢推荐！团队版能力正在打磨，敬请期待。', date: '2026/07/06' } },
  { id: 'rv-37', appId: 'hb-1', user: '徐佳华', stars: 4, title: '期待更新', text: '整体不错，希望支持更多模板。', date: '2026/06/25', version: '1.0.0' },
  /* hb-2：10 条 */
  { id: 'rv-38', appId: 'hb-2', user: '黄亚芳', stars: 5, title: '新版更好用', text: '2.3.1 的批量导出很顺手，效率翻倍。', date: '2026/08/21', version: '2.3.1', images: ['/products/serum.png'], reply: { text: '感谢及时反馈！快捷键自定义也已开放，欢迎试用。', date: '2026/08/22' } },
  { id: 'rv-39', appId: 'hb-2', user: '吴孝朝', stars: 5, title: '批量导出方便', text: '新增的批量导出省了大量时间。', date: '2026/08/20', version: '2.3.1' },
  { id: 'rv-40', appId: 'hb-2', user: '杨帆', stars: 4, title: '体验流畅', text: '偶发卡顿修复了，目前很稳定。', date: '2026/08/18', version: '2.3.1', reply: { text: '这个版本重点修复了卡顿，感谢长期支持！', date: '2026/08/18' } },
  { id: 'rv-41', appId: 'hb-2', user: '郑婷', stars: 5, title: '老用户了', text: '从 2.0 用到现在，越来越完善。', date: '2026/08/12', version: '2.2.0', images: ['/products/main.png'] },
  { id: 'rv-42', appId: 'hb-2', user: '陈晓', stars: 4, title: '功能丰富', text: '常用功能都有，希望支持主题切换。', date: '2026/08/05', version: '2.2.0', reply: { text: '主题切换已进入设计阶段，预计四季度上线。', date: '2026/08/06' } },
  { id: 'rv-43', appId: 'hb-2', user: '徐佳华', stars: 5, title: '上手快', text: '五分钟就能上手，文档也清晰。', date: '2026/07/28', version: '2.2.0' },
  { id: 'rv-44', appId: 'hb-2', user: '黄亚芳', stars: 4, title: '整体满意', text: '日常任务处理游刃有余，报表清晰。', date: '2026/07/20', version: '2.2.0', images: ['/products/serum.png'] },
  { id: 'rv-45', appId: 'hb-2', user: '吴孝朝', stars: 5, title: '稳定可靠', text: '连跑两个月没出过故障。', date: '2026/07/10', version: '2.2.0', reply: { text: '稳定性是我们的底线，感谢信任！', date: '2026/07/11' } },
  { id: 'rv-46', appId: 'hb-2', user: '杨帆', stars: 4, title: '期待新功能', text: '希望能接入更多系统集成。', date: '2026/06/28', version: '2.2.0' },
  { id: 'rv-47', appId: 'hb-2', user: '郑婷', stars: 5, title: '值得推荐', text: '推荐给团队后大家都在用。', date: '2026/06/18', version: '2.2.0', reply: { text: '谢谢支持！团队协作版正在路上。', date: '2026/06/19' } },
  /* hb-3：10 条 */
  { id: 'rv-48', appId: 'hb-3', user: '陈晓', stars: 5, title: '轻量好用', text: '作为插件足够轻，打开即用。', date: '2026/08/21', version: '1.0.0', reply: { text: '我们一直在做减法！更多顺手小功能陆续上线。', date: '2026/08/22' } },
  { id: 'rv-49', appId: 'hb-3', user: '徐佳华', stars: 4, title: '日常方便', text: '常用功能触手可及。', date: '2026/08/19', version: '1.0.0' },
  { id: 'rv-50', appId: 'hb-3', user: '黄亚芳', stars: 5, title: '意外顺手', text: '本来没抱期待，现在每天必开。', date: '2026/08/16', version: '1.0.0', images: ['/products/main.png'], reply: { text: '感谢喜爱！想要什么功能随时提。', date: '2026/08/17' } },
  { id: 'rv-51', appId: 'hb-3', user: '吴孝朝', stars: 4, title: '整体流畅', text: '偶尔有小 bug，但修复很快。', date: '2026/08/10', version: '1.0.0', reply: { text: '已修复你反馈的小问题，更新到最新版即可。', date: '2026/08/11' } },
  { id: 'rv-52', appId: 'hb-3', user: '杨帆', stars: 5, title: '小工具大作用', text: '很适合浏览器使用场景。', date: '2026/08/02', version: '1.0.0' },
  { id: 'rv-53', appId: 'hb-3', user: '郑婷', stars: 4, title: '简洁明了', text: '无广告无冗余，刚刚好。', date: '2026/07/25', version: '1.0.0', images: ['/products/serum.png'], reply: { text: '轻量是我们一直坚持的，会继续保持！', date: '2026/07/26' } },
  { id: 'rv-54', appId: 'hb-3', user: '陈晓', stars: 5, title: '推荐安装', text: '推荐给同事后都装上了。', date: '2026/07/16', version: '1.0.0', reply: { text: '感谢口碑支持！邀请奖励活动正在筹备。', date: '2026/07/17' } },
  { id: 'rv-55', appId: 'hb-3', user: '徐佳华', stars: 4, title: '期待同步', text: '希望支持跨设备配置同步。', date: '2026/07/08', version: '1.0.0' },
  { id: 'rv-56', appId: 'hb-3', user: '黄亚芳', stars: 5, title: '更新勤快', text: '开发者更新勤快，反馈响应快。', date: '2026/06/27', version: '1.0.0', reply: { text: '用户反馈就是更新动力，感谢陪伴！', date: '2026/06/28' } },
  { id: 'rv-57', appId: 'hb-3', user: '吴孝朝', stars: 4, title: '体验良好', text: '整体体验超出预期。', date: '2026/06/17', version: '1.0.0' },
  /* 同名应用批量补齐 10 条（含 a-1/a-2 等外观重复项，点到哪个都有数据） */
  ...genReviews('hb-4', '1.0.0'),
  ...genReviews('hb-5', '1.0.0'),
  ...genReviews('hb-6', '1.0.0'),
  ...genReviews('hb-7', '1.0.0'),
  ...genReviews('hb-8', '1.0.0'),
  ...genReviews('hb-9', '1.0.0'),
  ...genReviews('a-1', '1.0.0'),
  ...genReviews('a-2', '1.0.0'),
  /* 自己的两个应用补到 10 条 */
  ...genReviews('c-1', '1.0.0', 4, 3),
  ...genReviews('c-2', '1.0.0', 4, 5),
];
