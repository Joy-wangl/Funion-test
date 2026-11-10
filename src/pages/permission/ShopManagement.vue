<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from '../ops-center/data';
import MemberPickPanel from './MemberPickPanel.vue';
import OgPickedSide from './OgPickedSide.vue';
import { INITIAL_MEMBERS, avaColor } from './data';
import { CAT_LEVEL_NAMES, CAT_STATUS_TEXT, CAT_TREE, QUAL_REQ, catFlowsOf, catLeaf, catNeedQual, catPathText, nextFlowId, nowText } from './shopCategoryData';
import type { CatFlowStatus, CatNode, ShopCatFlow } from './shopCategoryData';
import { addShopBlacklist, hasShopBlacklist, removeShopBlacklist, removeShopBlSeries, saveShopBlSeriesCodes, shopBlCatalog, shopBlCounts, shopBlGoodsName, shopBlSearch, shopBlSeriesOf, shopBlacklistOf, updateShopBlacklist } from './shopBlacklistData';
import type { ShopBlDim, ShopBlEntry, ShopBlHit } from './shopBlacklistData';
import SortTh from '../../components/SortTh.vue';
import './style.css';

/* =========================================================
   权限设置 › 店铺管理（店铺→账号两层可展开列表，展开样式同品控监控列表）
   平台 tab（全部+各平台店铺计数）+ 状态胶囊（全部/在线/离线）+ 筛选（关键词/账号类型/店铺分组/可用成员）
   第一层店铺行（店铺信息/账号数/可用成员/更新时间；进入店铺下沉到账号维度）
   第二层账号子表（账号ID/登录账号/账号类型/账号分组/可用成员/更新时间/进入店铺＋管理账号）
   源系统筛选区无查询按钮：条件变更即生效；分配店铺走 MemberPickPanel 选成员
   ========================================================= */

interface AcctRow {
  acctId: string;
  /** 登录账号（主账号 或 主账号:成员） */
  login: string;
  acctType: string;
  /** 账号分组（空展示 —） */
  group: string;
  /** 可用成员（空展示 —） */
  members: string[];
  /** 更新时间 */
  updated: string;
  status: 'online' | 'offline';
}
interface ShopRow {
  shopId: string;
  platform: string;
  name: string;
  /** 店铺分组（空展示 —；分组管理写入） */
  group: string;
  accts: AcctRow[];
  /** 店铺配置（运费险/换货/7天无理由/运费模板；未设置时取默认值；blockedBrands/blockedCats=限制发布品牌/品类；customBrands=本店铺自定义品牌） */
  settings?: { shippingInsurance: 'yes' | 'no'; fakeComp: 'yes' | 'no'; noReason7d: 'yes'; brand?: string; blockedBrands?: string[]; blockedCats?: string[]; customBrands?: string[] };
}

/* 静态行（还原源系统首屏；同店铺ID聚合为店铺行，账号为其子行） */
const rows = ref<ShopRow[]>([
  { shopId: '305428412', platform: '淘宝', name: '淘系C店-環球甄选好物店', group: '', accts: [
    { acctId: '15769', login: 'tb6688087462', acctType: '主账号', group: '', members: ['张三'], updated: '2026-08-23 18:42:10', status: 'online' },
  ] },
  { shopId: '269190799', platform: '淘宝', name: '淘系C店-一点就到百货', group: '', accts: [
    { acctId: '15768', login: 'frand956666:小孔', acctType: '子账号', group: '', members: ['李四', '赵六'], updated: '2026-08-23 16:21:33', status: 'online' },
  ] },
  { shopId: '172420524', platform: '淘宝', name: '淘系C店-悦勤家居', group: '', accts: [
    { acctId: '15767', login: '狂宠每个热粉:孔意飞', acctType: '子账号', group: '', members: [], updated: '2026-08-22 09:15:47', status: 'offline' },
  ] },
  { shopId: '319800402', platform: '淘宝', name: '淘系C店-泰有钱百货店', group: '', accts: [
    { acctId: '15753', login: 'tb709930255172:熊博韬', acctType: '子账号', group: '', members: ['黄亚芳', '孙倩', '周杰', '吴敏', '徐佳华', '郑婷'], updated: '2026-08-21 20:08:12', status: 'online' },
  ] },
  { shopId: '15074719', platform: '淘宝', name: '淘系C店-义乌日用家居直供店', group: '', accts: [
    { acctId: '15742', login: '义乌日用家居直供店:乐游原', acctType: '子账号', group: '', members: ['徐佳华', '黄亚芳', '张三', '李四', '赵六', '孙倩'], updated: '2026-08-23 11:36:05', status: 'offline' },
    { acctId: '15741', login: '义乌日用家居直供店:奉天', acctType: '子账号', group: '', members: ['吴敏', '黄亚芳', '张三', '李四', '赵六', '孙倩', '周杰'], updated: '2026-08-23 08:54:29', status: 'online' },
    { acctId: '15740', login: '义乌日用家居直供店:八一', acctType: '子账号', group: '', members: ['吴敏', '黄亚芳', '张三', '李四', '赵六', '孙倩'], updated: '2026-08-20 17:47:56', status: 'online' },
  ] },
  { shopId: '15074742', platform: '淘宝', name: '淘系C店-天天有百货直供店', group: '', accts: [
    { acctId: '15739', login: '天天有百货直供店:梓昌', acctType: '子账号', group: '', members: ['吴敏', '黄亚芳', '张三', '李四'], updated: '2026-08-19 14:23:41', status: 'offline' },
    { acctId: '15738', login: '天天有百货直供店:熊博韬', acctType: '子账号', group: '', members: ['吴敏', '黄亚芳', '张三', '李四', '赵六', '孙倩', '周杰', '徐佳华'], updated: '2026-08-23 19:02:18', status: 'online' },
  ] },
  { shopId: '20886632', platform: '淘宝', name: '淘系C店-雅集臻品 Greenery', group: '', accts: [
    { acctId: '15734', login: 'yajizhenpin:竹林', acctType: '子账号', group: '', members: ['吴敏', '黄亚芳', '张三', '李四', '赵六', '孙倩', '周杰', '徐佳华', '郑婷', '刘洋'], updated: '2026-08-22 21:39:54', status: 'online' },
  ] },
  { shopId: '319800403', platform: '天猫', name: '雅集臻品天猫旗舰店', group: '', accts: [
    { acctId: '15801', login: 'yajizhenpin:旗舰店', acctType: '主账号', group: '', members: ['吴敏', '黄亚芳', '孙倩'], updated: '2026-11-08 10:12:44', status: 'online' },
  ] },
  { shopId: '172420526', platform: '天猫', name: '悦勤家居天猫旗舰店', group: '', accts: [
    { acctId: '15802', login: 'yueqin:家居旗舰', acctType: '子账号', group: '', members: ['李四'], updated: '2026-11-07 18:40:02', status: 'offline' },
  ] },
  { shopId: '220886633', platform: '拼多多', name: '义乌日用拼多多专营店', group: '', accts: [
    { acctId: '15811', login: 'yiwu:日用专营', acctType: '主账号', group: '', members: ['徐佳华', '张三'], updated: '2026-11-08 09:26:31', status: 'online' },
    { acctId: '15810', login: 'yiwu:日用专营:客服', acctType: '子账号', group: '', members: ['赵六'], updated: '2026-11-06 15:03:19', status: 'offline' },
  ] },
  { shopId: '220886634', platform: '拼多多', name: '天天有拼多多直供店', group: '', accts: [
    { acctId: '15812', login: 'tiantianyou:直供', acctType: '子账号', group: '', members: ['吴敏', '郑婷'], updated: '2026-11-07 11:47:55', status: 'online' },
  ] },
  { shopId: '430542841', platform: '抖音', name: '泰有钱抖音旗舰店', group: '', accts: [
    { acctId: '15821', login: 'taiyouqian:抖音旗舰', acctType: '主账号', group: '', members: ['黄亚芳', '孙倩', '周杰'], updated: '2026-11-08 14:05:12', status: 'online' },
  ] },
  { shopId: '430542842', platform: '抖音', name: '環球甄选抖音小店', group: '', accts: [
    { acctId: '15822', login: 'huanqiu:甄选小店', acctType: '子账号', group: '', members: [], updated: '2026-11-05 20:31:47', status: 'offline' },
  ] },
  { shopId: '519800402', platform: '快手', name: '天天有快手小店', group: '', accts: [
    { acctId: '15831', login: 'tiantianyou:快手店', acctType: '主账号', group: '', members: ['李四', '赵六'], updated: '2026-11-07 09:58:23', status: 'online' },
  ] },
  { shopId: '605428412', platform: '视频号', name: '雅集臻品视频号小店', group: '', accts: [
    { acctId: '15841', login: 'yajizhenpin:视频号', acctType: '主账号', group: '', members: ['吴敏', '黄亚芳', '张三', '李四'], updated: '2026-11-08 16:22:58', status: 'online' },
  ] },
  { shopId: '605428413', platform: '视频号', name: '一点就到视频号小店', group: '', accts: [
    { acctId: '15842', login: 'yidianjiudao:视频号', acctType: '子账号', group: '', members: ['孙倩'], updated: '2026-11-06 13:14:09', status: 'offline' },
  ] },
]);

/** 可用成员单元格文案（>2 人）：首名、次名等N人；≤2 人逐人「头像+姓名」对展示 */
const memberText = (ms: string[]) => `${ms[0]}、${ms[1]}等${ms.length}人`;

/* ---------- 平台 tab（图一红框）：全部 + 各平台店铺计数，点击收敛列表与状态胶囊计数 ---------- */
const platTab = ref('全部');
const platTabs = computed(() => [
  { key: '全部', count: rows.value.length },
  ...PLATFORM_OPTS.map((p) => ({ key: p, count: rows.value.filter((s) => s.platform === p).length })),
]);
/* ---------- 状态胶囊（当前平台 tab 内店铺计数） ---------- */
type TabKey = 'all' | 'online' | 'offline';
const tab = ref<TabKey>('all');

/* ---------- 筛选（即效，无查询按钮；平台由顶部 tab 接管） ---------- */
const fKw = ref('');
const fAcctType = ref('');
const fGroup = ref('');
const fMember = ref('');
const PLATFORM_OPTS = ['淘宝', '天猫', '拼多多', '抖音', '快手', '视频号'];
const ACCT_OPTS = ['主账号', '子账号'];
/* ---------- 店铺分组（分组管理维护；未分组店铺为默认项，不写入行） ---------- */
interface ShopGroup { name: string; isDefault?: boolean; fresh?: boolean }
const groups = ref<ShopGroup[]>([{ name: '未分组店铺', isDefault: true }]);
const GROUP_OPTS = computed(() => groups.value.map((g) => g.name));
const pool = INITIAL_MEMBERS.filter((m) => m.status !== 'pending');
const MEMBER_OPTS = [...new Set(pool.map((m) => m.name))];

/* 排序状态：单列激活，点击循环 desc → asc → 取消（作用于主表店铺行） */
const sortKey = ref<'accts' | 'updated' | ''>('');
const sortDir = ref<'none' | 'asc' | 'desc'>('none');
const onSort = (k: 'accts' | 'updated') => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else if (sortDir.value === 'asc') { sortKey.value = ''; sortDir.value = 'none'; }
  else sortDir.value = 'desc';
};
const sortState = (k: string) => (sortKey.value === k ? sortDir.value : 'none');

/* 两层筛选：账号类型/可用成员/状态 tab 过滤账号子行，平台/店铺分组过滤店铺行；
   关键词命中店铺则展示其全部账号，仅命中账号则只展示该账号；无匹配账号的店铺不展示 */
const filtered = computed(() => {
  const kw = fKw.value.trim().toLowerCase();
  const rowsOut = rows.value.map((s) => {
    const shopKw = !kw || [s.name, s.shopId].some((v) => v.toLowerCase().includes(kw));
    const accts = s.accts.filter((a) => {
      if (tab.value !== 'all' && a.status !== tab.value) return false;
      if (fAcctType.value && a.acctType !== fAcctType.value) return false;
      if (fMember.value && !a.members.includes(fMember.value)) return false;
      if (kw && !shopKw && ![a.login, a.acctId].some((v) => v.toLowerCase().includes(kw))) return false;
      return true;
    });
    return { shop: s, accts };
  }).filter(({ shop, accts }) => {
    if (accts.length === 0) return false;
    if (platTab.value !== '全部' && shop.platform !== platTab.value) return false;
    if (fGroup.value && shop.group !== fGroup.value) return false;
    return true;
  });
  if (sortKey.value && sortDir.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1;
    if (sortKey.value === 'accts') {
      return [...rowsOut].sort((a, b) => (a.accts.length - b.accts.length) * dir);
    }
    return [...rowsOut].sort((a, b) => shopUpdated(a.accts).localeCompare(shopUpdated(b.accts)) * dir);
  }
  return rowsOut;
});
/** 店铺行可用成员：子行账号成员并集（去重保序） */
const shopMembers = (accts: AcctRow[]) => [...new Set(accts.flatMap((a) => a.members))];
/** 店铺在线状态：账号有一个在线即店铺在线；全部离线才离线 */
const shopOnline = (accts: AcctRow[]) => accts.some((a) => a.status === 'online');
/* 状态胶囊计数：当前平台 tab 内按店铺在线状态聚合（与列表行同源，切换平台即收敛） */
const platShops = computed(() => rows.value.filter((s) => platTab.value === '全部' || s.platform === platTab.value));
const statusTabs = computed(() => [
  { key: 'all' as TabKey, label: '全部', count: platShops.value.length },
  { key: 'online' as TabKey, label: '在线', count: platShops.value.filter((s) => shopOnline(s.accts)).length },
  { key: 'offline' as TabKey, label: '离线', count: platShops.value.filter((s) => !shopOnline(s.accts)).length },
]);
/** 店铺行更新时间：子行账号更新时间的最新值（格式定长，字符串序即时间序） */
const shopUpdated = (accts: AcctRow[]) => accts.reduce((m, a) => (a.updated > m ? a.updated : m), '');
/** 分页页数：50 条/页，与当前筛选总数同源 */
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / 50)));

/* ---------- 行展开（品控监控列表式）：默认收起，点箭头展开账号子表 ---------- */
const expanded = ref<Set<string>>(new Set());
const toggleExpand = (id: string) => {
  const s = new Set(expanded.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  expanded.value = s;
};

/* ---------- 行勾选（店铺维度） ---------- */
const checked = ref<Set<string>>(new Set());
const allChecked = computed(() => filtered.value.length > 0 && filtered.value.every((f) => checked.value.has(f.shop.shopId)));
const toggleCheck = (id: string) => {
  const s = new Set(checked.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  checked.value = s;
};
const toggleAll = () => {
  checked.value = allChecked.value ? new Set() : new Set(filtered.value.map((f) => f.shop.shopId));
};

/* ---------- 分配店铺：MemberPickPanel 选成员 → 写入选中行的可用成员 ---------- */
const assignOpen = ref(false);
const picked = ref<Set<string>>(new Set());
const pickedMembers = computed(() => pool.filter((m) => picked.value.has(m.id)));
const togglePick = (id: string) => {
  const s = new Set(picked.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  picked.value = s;
};
const bulkPick = (ids: string[], on: boolean) => {
  const s = new Set(picked.value);
  ids.forEach((id) => (on ? s.add(id) : s.delete(id)));
  picked.value = s;
};
const openAssign = () => {
  if (!checked.value.size) { pushToast('请先勾选需要分配的店铺', 'error'); return; }
  picked.value = new Set();
  assignOpen.value = true;
};
const confirmAssign = () => {
  if (!pickedMembers.value.length) { pushToast('请先选择要分配的成员', 'error'); return; }
  const names = pickedMembers.value.map((m) => m.name);
  const n = checked.value.size;
  rows.value = rows.value.map((s) => (checked.value.has(s.shopId)
    ? { ...s, accts: s.accts.map((a) => ({ ...a, members: [...new Set([...a.members, ...names])] })) }
    : s));
  pushToast(`已将 ${n} 个店铺分配给 ${names.join('、')}`);
  checked.value = new Set();
  assignOpen.value = false;
};

/* ---------- 管理账号抽屉：分组可选 + 可用成员增删（保存写回账号子行） ---------- */
const acctId = ref<string | null>(null);
const draftGroup = ref('');
const draftMembers = ref<string[]>([]);
const acctRow = computed(() => {
  for (const s of rows.value) {
    const a = s.accts.find((x) => x.acctId === acctId.value);
    /* 抽屉只读字段平台/店铺名称取自父店铺行，账号行自身不携带 */
    if (a) return { ...a, platform: s.platform, name: s.name };
  }
  return null;
});
const openAccount = (a: AcctRow) => {
  acctId.value = a.acctId;
  draftGroup.value = a.group;
  draftMembers.value = [...a.members];
};
const addMemberOpen = ref(false);
const pickedAdd = ref<Set<string>>(new Set());
const pickedAddMembers = computed(() => pool.filter((m) => pickedAdd.value.has(m.id)));
const togglePickAdd = (id: string) => {
  const s = new Set(pickedAdd.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  pickedAdd.value = s;
};
const bulkPickAdd = (ids: string[], on: boolean) => {
  const s = new Set(pickedAdd.value);
  ids.forEach((id) => (on ? s.add(id) : s.delete(id)));
  pickedAdd.value = s;
};
const openAddMember = () => {
  pickedAdd.value = new Set();
  addMemberOpen.value = true;
};
const confirmAddMember = () => {
  if (!pickedAddMembers.value.length) { pushToast('请先选择要添加的成员', 'error'); return; }
  draftMembers.value = [...new Set([...draftMembers.value, ...pickedAddMembers.value.map((m) => m.name)])];
  addMemberOpen.value = false;
};
const removeDraftMember = (name: string) => {
  draftMembers.value = draftMembers.value.filter((n) => n !== name);
};
const saveAccount = () => {
  if (!acctRow.value) return;
  const g = draftGroup.value === '未分组店铺' ? '' : draftGroup.value;
  rows.value = rows.value.map((s) => ({
    ...s,
    accts: s.accts.map((a) => (a.acctId === acctId.value ? { ...a, group: g, members: [...draftMembers.value] } : a)),
  }));
  pushToast('已保存账号设置');
  acctId.value = null;
};

/* ---------- 分组管理抽屉：所选分组应用到勾选店铺；齿轮维护分组清单 ---------- */
const groupOpen = ref(false);
const groupSel = ref('');
const groupModalOpen = ref(false);
const gpDraft = ref<ShopGroup[]>([]);
const openGroupModal = () => {
  gpDraft.value = groups.value.map((g) => ({ ...g }));
  groupModalOpen.value = true;
};
const gpAdd = () => { gpDraft.value = [...gpDraft.value, { name: '', fresh: true }]; };
const gpRemove = (name: string) => { gpDraft.value = gpDraft.value.filter((g) => g.name !== name); };
const gpSave = () => {
  const names = gpDraft.value.map((g) => g.name.trim());
  if (names.some((n) => !n)) { pushToast('分组名称不能为空', 'error'); return; }
  if (new Set(names).size !== names.length) { pushToast('分组名称不能重复', 'error'); return; }
  groups.value = gpDraft.value.map((g, i) => ({ name: names[i], isDefault: g.isDefault }));
  rows.value = rows.value.map((s) => (s.group && !names.includes(s.group) ? { ...s, group: '' } : s));
  if (groupSel.value && !names.includes(groupSel.value)) groupSel.value = '';
  if (draftGroup.value && !names.includes(draftGroup.value)) draftGroup.value = '';
  groupModalOpen.value = false;
  pushToast('已保存分组');
};
const saveGroupDrawer = () => {
  if (!checked.value.size) { pushToast('请先勾选需要分组的店铺', 'error'); return; }
  if (!groupSel.value) { pushToast('请选择分组', 'error'); return; }
  const g = groupSel.value === '未分组店铺' ? '' : groupSel.value;
  rows.value = rows.value.map((s) => (checked.value.has(s.shopId) ? { ...s, group: g } : s));
  pushToast(`已将 ${checked.value.size} 个店铺移入「${groupSel.value}」`);
  checked.value = new Set();
  groupOpen.value = false;
};

/* ---------- 发布设置抽屉：商家编码只读 ---------- */
const publishOpen = ref(false);
const savePublish = () => {
  pushToast('已保存发布设置');
  publishOpen.value = false;
};

/* ---------- 行操作 / 入口按钮（原型演示交互） ---------- */
const enterShop = (s: ShopRow) => pushToast(`已进入店铺：${s.name}`);

/* ---------- 店铺配置二级页：基本配置（运费险/假一赔三/7天无理由/品牌）＋发布配置（限制发布品牌） ---------- */
const shopSettingsId = ref<string | null>(null);
const draftInsurance = ref<'yes' | 'no'>('no');
const draftFakeComp = ref<'yes' | 'no'>('no');
/* 品牌：预置项单选＋本店铺自定义品牌（增删改），默认无品牌、不可为空 */
const BRAND_OPTS = ['无品牌', '環球甄选', '一点就到', '悦勤家居', '泰有钱', '义乌日用', '天天有', '雅集臻品'];
const draftBrand = ref('无品牌');
const draftCustomBrands = ref<string[]>([]);
const brandAllNames = computed(() => [...BRAND_OPTS, ...draftCustomBrands.value]);
/* 新增/改名走标签位内联输入：回车或失焦提交、ESC 取消 */
const brandAdding = ref(false);
const brandNewName = ref('');
const brandEditing = ref<string | null>(null);
const brandEditName = ref('');
const focusBrandInput = (sel: string) => nextTick(() => { (document.querySelector(sel) as HTMLInputElement | null)?.focus(); });
const brandNameTaken = (n: string, skip?: string) => brandAllNames.value.some((x) => x === n && x !== skip);
const startBrandAdd = () => {
  brandEditing.value = null;
  brandAdding.value = true;
  brandNewName.value = '';
  focusBrandInput('.smg-tag-input.add');
};
const commitBrandAdd = () => {
  if (!brandAdding.value) return;
  const n = brandNewName.value.trim();
  brandAdding.value = false;
  brandNewName.value = '';
  if (!n) return;
  if (brandNameTaken(n)) { pushToast('品牌名称已存在'); return; }
  draftCustomBrands.value = [...draftCustomBrands.value, n];
};
const cancelBrandAdd = () => { brandAdding.value = false; brandNewName.value = ''; };
const startBrandEdit = (n: string) => {
  brandAdding.value = false;
  brandEditing.value = n;
  brandEditName.value = n;
  focusBrandInput('.smg-tag-input.edit');
};
const commitBrandEdit = () => {
  const old = brandEditing.value;
  if (old === null) return;
  const n = brandEditName.value.trim();
  brandEditing.value = null;
  if (!n || n === old) return;
  if (brandNameTaken(n, old)) { pushToast('品牌名称已存在'); return; }
  draftCustomBrands.value = draftCustomBrands.value.map((x) => (x === old ? n : x));
  if (draftBrand.value === old) draftBrand.value = n;
};
const cancelBrandEdit = () => { brandEditing.value = null; brandEditName.value = ''; };
const removeCustomBrand = (n: string) => {
  draftCustomBrands.value = draftCustomBrands.value.filter((x) => x !== n);
  if (draftBrand.value === n) draftBrand.value = '无品牌';
};
/* 发布配置：限制发布品牌（源系统选择品牌弹层已勾选口径，点选/再点取消） */
const BLOCK_BRAND_OPTS = ['男士测试编码', '测试数据', '无需采购', '测试品牌', '保时捷入库', '罗小曼', '木兰朵', '小茶日记', '俏宝陈皮', '婧余', '恒源祥', '无', '咔巴熊', 'UIMO', '欧酷曼', '槐厅', '得力', '潮牛壹号', '天利vip', '优卓饰品', '煌上煌', '测试001', '匡匡', '★待下架-处理', '★已下架-禁用', '☆代拍产品', '☆耗材包材', '☆系统挂链', '☆供应链代发商品'];
/* 发布配置：限制发布商品品类（源系统品类下拉已选口径） */
const BLOCK_CAT_OPTS = ['左玉玲-品类'];
const draftBlockedBrands = ref<string[]>([...BLOCK_BRAND_OPTS]);
const draftBlockedCats = ref<string[]>([...BLOCK_CAT_OPTS]);
const toggleBlockBrand = (b: string) => {
  draftBlockedBrands.value = draftBlockedBrands.value.includes(b) ? draftBlockedBrands.value.filter((x) => x !== b) : [...draftBlockedBrands.value, b];
};
const toggleBlockCat = (c: string) => {
  draftBlockedCats.value = draftBlockedCats.value.includes(c) ? draftBlockedCats.value.filter((x) => x !== c) : [...draftBlockedCats.value, c];
};
/* 每组首位「全选」：已全选时再点即全部取消 */
const allBlockBrandsOn = computed(() => BLOCK_BRAND_OPTS.every((b) => draftBlockedBrands.value.includes(b)));
const allBlockCatsOn = computed(() => BLOCK_CAT_OPTS.every((c) => draftBlockedCats.value.includes(c)));
const toggleAllBlockBrands = () => { draftBlockedBrands.value = allBlockBrandsOn.value ? [] : [...BLOCK_BRAND_OPTS]; };
const toggleAllBlockCats = () => { draftBlockedCats.value = allBlockCatsOn.value ? [] : [...BLOCK_CAT_OPTS]; };
/* 页签：基本配置 / 限制编码配置 / 类目申请 / 店铺黑品限制 */
const settingsTab = ref<'basic' | 'publish' | 'category' | 'blacklist'>('basic');

/* ---------- 类目申请：弹窗内查询条件（保证金区间/申请状态/资质限制）→ 级联穿梭选类目 → 提交审核 ---------- */
const CAT_STATUS_CHIPS: { key: 'all' | CatFlowStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'applied', label: '已申请' },
  { key: 'auditing', label: '审核中' },
  { key: 'failed', label: '审核失败' },
  { key: 'canceled', label: '已撤销' },
];
const CAT_F_STATUS_OPTS = ['全部', '未审核', '已审核', '审核中'];
const CAT_F_QUAL_OPTS = ['全部', '是', '否'];
/* 申请状态口径：已审核=类目权限已生效；审核中=平台审核中；未审核=尚未申请（含审核失败/已撤销，可重新申请） */
const CAT_F_STATUS_KEY: Record<string, 'unaudited' | 'audited' | 'auditing'> = { 未审核: 'unaudited', 已审核: 'audited', 审核中: 'auditing' };
const catPickerOpen = ref(false);
const catDepMin = ref('');
const catDepMax = ref('');
const catFStatus = ref('全部');
const catFQual = ref('全部');
const catPath = ref<string[]>([]);
const catSelected = ref<string[]>([]);
/* 第二步逐份上传的资质材料（类目→材料名→文件名）；提交写入审核单，未传齐不可提交 */
const catQualFiles = ref<Record<string, Record<string, string>>>({});
const catStatusTab = ref<'all' | CatFlowStatus>('all');
const catDetail = ref<ShopCatFlow | null>(null);
const catStep = ref<1 | 2>(1);
const catCancelFlow = ref<ShopCatFlow | null>(null);

const catFlows = computed(() => (shopSettingsId.value ? catFlowsOf(shopSettingsId.value) : []));
/* 已申请/审核中的叶子不可再选；审核失败/已撤销可重新勾选申请 */
const catFlowStatusOf = (catId: string): CatFlowStatus | null => {
  if (catFlows.value.some((f) => f.catId === catId && f.status === 'applied')) return 'applied';
  if (catFlows.value.some((f) => f.catId === catId && f.status === 'auditing')) return 'auditing';
  return null;
};
const catApplyState = (catId: string) => {
  const s = catFlowStatusOf(catId);
  return s === 'applied' ? 'audited' : s === 'auditing' ? 'auditing' : 'unaudited';
};
const catDepNum = (v: string) => {
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};
const catLeafPass = (l: CatNode) => {
  const dep = l.deposit ?? 0;
  const min = catDepNum(catDepMin.value);
  const max = catDepNum(catDepMax.value);
  if (min !== null && dep < min) return false;
  if (max !== null && dep > max) return false;
  if (catFStatus.value !== '全部' && catApplyState(l.catId) !== CAT_F_STATUS_KEY[catFStatus.value]) return false;
  if (catFQual.value !== '全部' && catNeedQual(l) !== (catFQual.value === '是')) return false;
  return true;
};
/* 查询条件命中：仅保留通过筛选的叶子及其祖先链 */
const catTree = computed(() => {
  const walk = (nodes: CatNode[]): CatNode[] => nodes
    .map((n) => {
      if (!n.children?.length) return catLeafPass(n) ? n : null;
      const kids = walk(n.children);
      return kids.length ? { ...n, children: kids } : null;
    })
    .filter((x): x is CatNode => !!x);
  return walk(CAT_TREE);
});
/* 穿梭列：首列=一级类目，逐列取路径节点的子级；末列固定为已选类目 */
const catCols = computed<CatNode[][]>(() => {
  const cols: CatNode[][] = [catTree.value];
  let level = catTree.value;
  for (const id of catPath.value) {
    const node = level.find((n) => n.catId === id);
    if (!node?.children?.length) break;
    level = node.children;
    cols.push(level);
  }
  return cols;
});
const catToggleLeaf = (id: string) => {
  catSelected.value = catSelected.value.includes(id) ? catSelected.value.filter((x) => x !== id) : [...catSelected.value, id];
  if (!catSelected.value.length && catStep.value === 2) catStep.value = 1;
};
/* 任一层级可直接勾选：勾选父级=其下全部可选叶子一并选中；勾选态=该节点下可选叶子已全部在选 */
const catLeavesOf = (n: CatNode): CatNode[] => (n.children?.length ? n.children.flatMap(catLeavesOf) : [n]);
const catPickableLeaves = (n: CatNode) => catLeavesOf(n).filter((l) => !catFlowStatusOf(l.catId));
const catSubChecked = (n: CatNode) => {
  const pick = catPickableLeaves(n);
  return pick.length > 0 && pick.every((l) => catSelected.value.includes(l.catId));
};
const catToggleNode = (n: CatNode) => {
  const ids = catPickableLeaves(n).map((l) => l.catId);
  catSelected.value = catSubChecked(n)
    ? catSelected.value.filter((id) => !ids.includes(id))
    : [...new Set([...catSelected.value, ...ids])];
};
const catPickRow = (level: number, n: CatNode) => {
  catPath.value = [...catPath.value.slice(0, level), n.catId];
  if (!n.children?.length && !catFlowStatusOf(n.catId)) catToggleLeaf(n.catId);
};
const catSelectedLeaves = computed(() => catSelected.value.map((id) => catLeaf(id)).filter((x): x is CatNode => !!x));
const catSelectedMaxDeposit = computed(() => catSelectedLeaves.value.reduce((m, l) => Math.max(m, l.deposit ?? 0), 0));
/* 需上传资质的所选类目：每份材料都上传后方可提交 */
const catQualFile = (catId: string, q: string) => catQualFiles.value[catId]?.[q] ?? '';
const onQualFilePick = (catId: string, q: string, e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) catQualFiles.value = { ...catQualFiles.value, [catId]: { ...(catQualFiles.value[catId] ?? {}), [q]: f.name } };
  input.value = '';
};
const removeCatQualFile = (catId: string, q: string) => {
  const m = { ...(catQualFiles.value[catId] ?? {}) };
  delete m[q];
  catQualFiles.value = { ...catQualFiles.value, [catId]: m };
};
const catQualMissing = computed(() => catSelectedLeaves.value.flatMap((l) => (l.quals ?? []).filter((q) => !catQualFile(l.catId, q))));
const catQualText = (f: ShopCatFlow) => (f.quals.length ? f.quals.map((q) => (f.qualFiles?.[q] ? `${q}：${f.qualFiles[q]}` : q)).join('、') : '无需补充资质材料');
const openCatPicker = () => {
  catPath.value = [];
  catStep.value = 1;
  catPickerOpen.value = true;
};
/* 第二步清空即无确认可言，回到选择步 */
const catClearAll = () => {
  catSelected.value = [];
  catQualFiles.value = {};
  catStep.value = 1;
};
const catSubmitApply = () => {
  const flows = catFlows.value;
  catSelected.value.forEach((id) => {
    const leaf = catLeaf(id);
    flows.push({ flowId: nextFlowId(), catId: id, status: 'auditing', deposit: leaf?.deposit ?? 0, quals: [...(leaf?.quals ?? [])], qualFiles: { ...(catQualFiles.value[id] ?? {}) }, submitTime: nowText() });
  });
  catSelected.value = [];
  catPickerOpen.value = false;
  catStep.value = 1;
  catQualFiles.value = {};
  catStatusTab.value = 'auditing';
  pushToast('类目申请已提交');
};
const catDoCancel = () => {
  const f = catCancelFlow.value;
  if (f) {
    f.status = 'canceled';
    f.cancelTime = nowText();
    pushToast('已撤销类目审核');
  }
  catCancelFlow.value = null;
};
const catReapply = (f: ShopCatFlow) => {
  catFlows.value.push({ flowId: nextFlowId(), catId: f.catId, status: 'auditing', deposit: f.deposit, quals: [...f.quals], submitTime: nowText() });
  catStatusTab.value = 'auditing';
  pushToast('已重新提交类目申请');
};
const catFlowRows = computed(() => {
  const rows = [...catFlows.value].reverse();
  return catStatusTab.value === 'all' ? rows : rows.filter((f) => f.status === catStatusTab.value);
});
const catFlowCounts = computed(() => {
  const c: Record<string, number> = { all: catFlows.value.length, applied: 0, auditing: 0, failed: 0, canceled: 0 };
  catFlows.value.forEach((f) => { c[f.status] += 1; });
  return c;
});
/* ---------- 店铺黑品限制：商品编码（系列编码为父项的两级树）/ 商品ID 两个子 tab，支持增删改查 ---------- */
type BlTab = 'code' | 'goods';
const BL_TABS: { key: BlTab; label: string }[] = [
  { key: 'code', label: '商品编码' },
  { key: 'goods', label: '母链接' },
];
/* 维度对外文案：商品ID 维度业务口径称「母链接」（数据层 dim 值不变） */
const BL_DIM_LABEL: Record<ShopBlDim, string> = { 商品编码: '商品编码', 系列编码: '系列编码', 商品ID: '母链接' };
const blDim = ref<BlTab>('code');
const blKw = ref('');
const blSort = ref<'none' | 'asc' | 'desc'>('none');
const blCounts = computed(() => (shopSettingsId.value ? shopBlCounts(shopSettingsId.value) : { code: 0, goods: 0 }));
/* 商品编码子 tab 两级树：系列编码（纯文字）父行 → 其下商品编码（字母+数字）子行；指定系列编码＝其下全部商品编码选中（随系列限制） */
interface BlChild { key: string; code: string; entry: ShopBlEntry | null; }
interface BlGroup { series: string; entry: ShopBlEntry | null; children: BlChild[]; total: number; }
const blGroups = computed<BlGroup[]>(() => {
  if (!shopSettingsId.value) return [];
  const list = shopBlacklistOf(shopSettingsId.value);
  const seriesEntries = new Map<string, ShopBlEntry>();
  const codeEntries = new Map<string, ShopBlEntry[]>();
  list.forEach((e) => {
    if (e.dim === '系列编码') seriesEntries.set(e.value, e);
    else if (e.dim === '商品编码') codeEntries.set(e.series || '未归属系列', [...(codeEntries.get(e.series || '未归属系列') ?? []), e]);
  });
  const names = [...new Set([...shopBlCatalog().map((c) => c.series), ...seriesEntries.keys(), ...codeEntries.keys()])];
  const groups: BlGroup[] = [];
  names.forEach((se) => {
    const entry = seriesEntries.get(se) ?? null;
    const own = codeEntries.get(se) ?? [];
    if (!entry && !own.length) return;
    const catalog = shopBlSeriesOf(se);
    /* 整系列受限时子行＝系列下全部商品编码（随系列）；同系列的单独条目被系列条目吸收不重复展示 */
    const children: BlChild[] = entry
      ? (catalog?.codes ?? []).map((c) => ({ key: `i-${c}`, code: c, entry: null }))
      : [...own]
        .sort((a, b) => {
          const ia = catalog ? catalog.codes.indexOf(a.value) : -1;
          const ib = catalog ? catalog.codes.indexOf(b.value) : -1;
          return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
        })
        .map((e) => ({ key: `e-${e.id}`, code: e.value, entry: e }));
    groups.push({ series: se, entry, children, total: catalog?.codes.length ?? children.length });
  });
  /* 搜索即效：命中系列名保留全部子行，命中编码仅收敛子行 */
  const kw = blKw.value.trim().toLowerCase();
  const filtered = kw
    ? groups.map((g) => {
      if (g.series.toLowerCase().includes(kw)) return g;
      const kids = g.children.filter((c) => c.code.toLowerCase().includes(kw));
      return kids.length ? { ...g, children: kids } : null;
    }).filter((x): x is BlGroup => !!x)
    : groups;
  if (blSort.value === 'none') return filtered;
  const dir = blSort.value === 'asc' ? 1 : -1;
  const ts = (s: string) => new Date(s.replace(' ', 'T')).getTime() || 0;
  const timeOf = (g: BlGroup) => ts(g.entry?.addTime ?? g.children.find((c) => c.entry)?.entry?.addTime ?? '');
  return [...filtered].sort((a, b) => (timeOf(a) - timeOf(b)) * dir);
});
/* 商品ID 子 tab：单层列表 */
const blGoodsRows = computed(() => {
  if (!shopSettingsId.value) return [] as ShopBlEntry[];
  const kw = blKw.value.trim().toLowerCase();
  const out = shopBlacklistOf(shopSettingsId.value).filter((r) => r.dim === '商品ID'
    && (!kw || r.value.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw)));
  if (blSort.value === 'none') return out;
  const dir = blSort.value === 'asc' ? 1 : -1;
  const ts = (s: string) => new Date(s.replace(' ', 'T')).getTime() || 0;
  return [...out].sort((a, b) => (ts(a.addTime) - ts(b.addTime)) * dir);
});
const onBlSort = () => {
  if (blSort.value === 'none') blSort.value = 'desc';
  else if (blSort.value === 'desc') blSort.value = 'asc';
  else blSort.value = 'none';
};
/* 系列行添加人/时间：整系列条目优先，否则取其下首个单独编码条目 */
const blWhoOf = (g: BlGroup) => g.entry ?? g.children.find((c) => c.entry)?.entry ?? null;
/* 详情抽屉（系列级）：查看态与编辑态同构——查看态控件禁选、编辑态可选，保存后回查看态 */
const blDrawerSeries = ref<string | null>(null);
const blDrawerEdit = ref(false);
const blEditSel = ref<Set<string>>(new Set());
const blDrawerGroup = computed(() => {
  const s = blDrawerSeries.value;
  if (!s) return null;
  return blGroups.value.find((g) => g.series === s) ?? null;
});
const blEditAllCodes = computed(() => (blDrawerSeries.value ? shopBlSeriesOf(blDrawerSeries.value)?.codes ?? [] : []));
/* 限制范围双档：整系列限制＝不再逐个展示编码（新增编码自动同步）；部分编码＝点选具体编码 */
const blEditScope = ref<'all' | 'part'>('part');
const blSavedScope = computed<'all' | 'part'>(() => {
  const g = blDrawerGroup.value;
  if (!g) return 'part';
  return g.entry || (g.total > 0 && g.children.length === g.total) ? 'all' : 'part';
});
const blScopeNow = computed(() => (blDrawerEdit.value ? blEditScope.value : blSavedScope.value));
const blDrawerAll = computed(() => blScopeNow.value === 'all');
/* 选中态编码：编辑态取草稿勾选，查看态取已保存受限集合（禁选展示） */
const blSelNow = computed(() => (blDrawerEdit.value ? blEditSel.value : new Set(blDrawerGroup.value?.children.map((c) => c.code) ?? [])));
const openBlView = (s: string) => { blDrawerSeries.value = s; blDrawerEdit.value = false; };
const startBlEdit = () => {
  const g = blDrawerGroup.value;
  if (!g) return;
  blEditSel.value = new Set(g.children.map((c) => c.code));
  blEditScope.value = blSavedScope.value;
  blDrawerEdit.value = true;
};
const setBlScope = (v: 'all' | 'part') => {
  blEditScope.value = v;
  if (v === 'all') blEditSel.value = new Set(blEditAllCodes.value);
};
const toggleBlCode = (c: string) => {
  const next = new Set(blEditSel.value);
  if (next.has(c)) next.delete(c);
  else next.add(c);
  blEditSel.value = next;
};
const closeBlDrawer = () => { blDrawerSeries.value = null; blDrawerEdit.value = false; };
const submitBlEditSeries = () => {
  const shopId = shopSettingsId.value;
  const s = blDrawerSeries.value;
  if (!shopId || !s) return;
  const codes = blEditScope.value === 'all' ? blEditAllCodes.value : [...blEditSel.value];
  if (!codes.length) { pushToast('请至少选择一个商品编码', 'warning'); return; }
  saveShopBlSeriesCodes(shopId, s, codes);
  pushToast('已保存修改');
  blDrawerEdit.value = false;
};
/* 商品信息缩略图：同店铺商品口径按关联商品ID取图；无关联商品则灰底占位 */
const BL_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const blThumbOf = (goodsId?: string) => {
  const n = Number(goodsId);
  return goodsId && Number.isFinite(n) ? BL_THUMBS[Math.abs(n) % BL_THUMBS.length] : '';
};

/* 添加 / 编辑弹窗：商品编码＝输入即模糊检索（系列编码&商品编码）点选命中；商品ID＝手动输入多个、可删、查询后入列 */
const blFormOpen = ref(false);
const blEditId = ref<number | null>(null);
/* 商品编码：检索关键字＋命中候选＋当前点选（单条） */
const blQ = ref('');
const blHits = computed(() => shopBlSearch(blQ.value));
const blPick = ref<ShopBlHit | null>(null);
/* 命中系列编码时须再定限制范围：整系列＝按系列编码入列（新增编码自动同步）；指定编码＝逐枚商品编码入列 */
const blAddScope = ref<'all' | 'part'>('all');
const blAddCodes = ref<Set<string>>(new Set());
const blAddSeriesCodes = computed(() => (blPick.value?.dim === '系列编码' ? shopBlSeriesOf(blPick.value.value)?.codes ?? [] : []));
const pickBlHit = (h: ShopBlHit) => {
  blPick.value = h;
  blAddScope.value = 'all';
  blAddCodes.value = new Set();
};
const toggleBlAddCode = (c: string) => {
  const next = new Set(blAddCodes.value);
  if (next.has(c)) next.delete(c);
  else next.add(c);
  blAddCodes.value = next;
};
/* 商品ID：标签式多值输入，回车/查询把输入拆成多个 ID 入列，× 删除 */
interface BlIdChip { id: string; name: string; }
const blIdInput = ref('');
const blIdChips = ref<BlIdChip[]>([]);
const commitBlIds = () => {
  const parts = blIdInput.value.split(/[,，\s;；]+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) { pushToast('请输入母链接', 'warning'); return; }
  parts.forEach((id) => {
    if (blIdChips.value.some((c) => c.id === id)) return;
    blIdChips.value.push({ id, name: shopBlGoodsName(id) });
  });
  blIdInput.value = '';
};
const removeBlId = (id: string) => { blIdChips.value = blIdChips.value.filter((c) => c.id !== id); };
const openBlAdd = () => {
  blEditId.value = null;
  blQ.value = '';
  blPick.value = null;
  blAddScope.value = 'all';
  blAddCodes.value = new Set();
  blIdInput.value = '';
  blIdChips.value = [];
  blFormOpen.value = true;
};
const openBlEdit = (r: ShopBlEntry) => {
  blEditId.value = r.id;
  blQ.value = '';
  blPick.value = null;
  blIdInput.value = '';
  blIdChips.value = [{ id: r.value, name: r.name }];
  blFormOpen.value = true;
};
const submitBlForm = () => {
  const shopId = shopSettingsId.value;
  if (!shopId) return;
  const editing = blEditId.value;
  if (blDim.value === 'goods') {
    if (!blIdChips.value.length) { pushToast('请输入母链接', 'warning'); return; }
    /* 编辑态首枚覆盖原条目，其余作为新增入列；添加态逐枚入列（重复跳过） */
    blIdChips.value.forEach((c, i) => {
      const name = c.name || shopBlGoodsName(c.id);
      if (i === 0 && editing !== null) { updateShopBlacklist(shopId, editing, { dim: '商品ID', value: c.id, name, goodsId: c.id }); return; }
      if (hasShopBlacklist(shopId, '商品ID', c.id, editing ?? undefined)) return;
      addShopBlacklist(shopId, '商品ID', c.id, { name, goodsId: c.id });
    });
    pushToast(editing === null ? '已加入黑品限制' : '已保存修改');
    blFormOpen.value = false;
    return;
  }
  if (!blPick.value) { pushToast('请检索并选择系列编码或商品编码', 'warning'); return; }
  const dim: ShopBlDim = blPick.value.dim;
  const v = blPick.value.value;
  /* 系列编码＋指定编码限制：不入系列级条目，逐枚商品编码入列（已存在的跳过） */
  if (dim === '系列编码' && blAddScope.value === 'part') {
    const sel = blAddSeriesCodes.value.filter((c) => blAddCodes.value.has(c));
    if (!sel.length) { pushToast('请选择要限制的商品编码', 'warning'); return; }
    const fresh = sel.filter((c) => !hasShopBlacklist(shopId, '商品编码', c));
    if (!fresh.length) { pushToast('所选商品编码已在本店铺黑品限制中', 'warning'); return; }
    fresh.forEach((c) => addShopBlacklist(shopId, '商品编码', c, { series: v }));
    pushToast('已加入黑品限制');
    blFormOpen.value = false;
    return;
  }
  if (hasShopBlacklist(shopId, dim, v)) { pushToast(`该${dim}已在本店铺黑品限制中`, 'warning'); return; }
  const extra = dim === '商品编码' ? { series: blPick.value.series } : {};
  addShopBlacklist(shopId, dim, v, extra);
  pushToast('已加入黑品限制');
  blFormOpen.value = false;
};
const blDelRow = ref<ShopBlEntry | null>(null);
const blDelGroup = ref<string | null>(null);
const blDelConfirmText = computed(() => {
  if (blDelGroup.value) return `删除后「系列编码：${blDelGroup.value}」及其下全部受限商品编码可正常发布到本店铺，是否确认删除？`;
  return blDelRow.value ? `删除后「${BL_DIM_LABEL[blDelRow.value.dim]}：${blDelRow.value.value}」可正常发布到本店铺，是否确认删除？` : '';
});
const confirmBlDel = () => {
  const shopId = shopSettingsId.value;
  if (shopId) {
    if (blDelGroup.value) removeShopBlSeries(shopId, blDelGroup.value);
    else if (blDelRow.value) removeShopBlacklist(shopId, blDelRow.value.id);
    if (blDelGroup.value || blDelRow.value) pushToast('已取消黑品限制');
  }
  blDelRow.value = null;
  blDelGroup.value = null;
};

const shopSettingsRow = computed(() => rows.value.find((s) => s.shopId === shopSettingsId.value) ?? null);
/* 查看/编辑双态：默认只读，右上「编辑」进入编辑态后控件才可点，「保存」提交并回只读 */
const settingsEditing = ref(false);
/* 视频号店铺品牌由平台侧管控：编辑态也不提供自定义品牌的增删改 */
const canManageBrands = computed(() => settingsEditing.value && shopSettingsRow.value?.platform !== '视频号');
const loadSettingsDraft = (s: ShopRow | null) => {
  const st = s?.settings;
  draftInsurance.value = st?.shippingInsurance ?? 'no';
  draftFakeComp.value = st?.fakeComp ?? 'no';
  draftBrand.value = st?.brand || '无品牌';
  draftCustomBrands.value = [...(st?.customBrands ?? [])];
  cancelBrandAdd();
  cancelBrandEdit();
  draftBlockedBrands.value = [...(st?.blockedBrands ?? BLOCK_BRAND_OPTS)];
  draftBlockedCats.value = [...(st?.blockedCats ?? BLOCK_CAT_OPTS)];
};
const openShopSettings = (s: ShopRow) => {
  shopSettingsId.value = s.shopId;
  loadSettingsDraft(s);
  settingsEditing.value = false;
  settingsTab.value = 'basic';
  catDepMin.value = '';
  catDepMax.value = '';
  catFStatus.value = '全部';
  catFQual.value = '全部';
  catPath.value = [];
  catSelected.value = [];
  catQualFiles.value = {};
  catStep.value = 1;
  catPickerOpen.value = false;
  catStatusTab.value = 'all';
  catDetail.value = null;
  blDim.value = 'code';
  blKw.value = '';
  blSort.value = 'none';
  blFormOpen.value = false;
  blEditId.value = null;
  blDrawerSeries.value = null;
  blDrawerEdit.value = false;
  blDelRow.value = null;
  blDelGroup.value = null;
};
const closeShopSettings = () => { shopSettingsId.value = null; };
const cancelSettingsEdit = () => { loadSettingsDraft(shopSettingsRow.value); settingsEditing.value = false; };
const shopSettingsConfirm = ref(false);
const confirmSaveShopSettings = () => { shopSettingsConfirm.value = true; };
const doSaveShopSettings = () => {
  if (!shopSettingsId.value) return;
  rows.value = rows.value.map((s) => (s.shopId === shopSettingsId.value
    ? { ...s, settings: { shippingInsurance: draftInsurance.value, fakeComp: draftFakeComp.value, noReason7d: 'yes', brand: draftBrand.value, blockedBrands: [...draftBlockedBrands.value], blockedCats: [...draftBlockedCats.value], customBrands: [...draftCustomBrands.value] } }
    : s));
  pushToast('已保存店铺配置');
  shopSettingsId.value = null;
  shopSettingsConfirm.value = false;
};

/* ---------- ESC 逐层关闭（内层优先；抽屉/弹窗遮罩点击亦可关） ---------- */
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (addMemberOpen.value) addMemberOpen.value = false;
  else if (groupModalOpen.value) groupModalOpen.value = false;
  else if (acctId.value) acctId.value = null;
  else if (groupOpen.value) groupOpen.value = false;
  else if (publishOpen.value) publishOpen.value = false;
  else if (assignOpen.value) assignOpen.value = false;
  else if (shopSettingsConfirm.value) shopSettingsConfirm.value = false;
  else if (catPickerOpen.value && catStep.value === 2) catStep.value = 1;
  else if (catCancelFlow.value) catCancelFlow.value = null;
  else if (catDetail.value) catDetail.value = null;
  else if (catPickerOpen.value) catPickerOpen.value = false;
  else if (blDelRow.value || blDelGroup.value) { blDelRow.value = null; blDelGroup.value = null; }
  else if (blDrawerEdit.value) blDrawerEdit.value = false;
  else if (blDrawerSeries.value) blDrawerSeries.value = null;
  else if (blFormOpen.value) blFormOpen.value = false;
  else if (shopSettingsId.value) shopSettingsId.value = null;
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="sg-page smg-page">
    <!-- 列表态：平台 tab / 状态胶囊 / 筛选 / 店铺表；进入店铺配置二级页后整体让位 -->
    <template v-if="!shopSettingsId">
    <!-- 平台 tab（图一红框）：全部 + 各平台店铺计数，下划线式页级 tab -->
    <div class="sg-tabs">
      <button
        v-for="p in platTabs"
        :key="p.key"
        type="button"
        class="sg-tab"
        :class="platTab === p.key ? 'active' : ''"
        @click="platTab = p.key"
      >
        {{ p.key }}({{ p.count }})
      </button>
    </div>

    <!-- 状态胶囊（图一）：当前平台内 全部/在线/离线 店铺计数 -->
    <div class="smg-status-row">
      <button
        v-for="t in statusTabs"
        :key="t.key"
        type="button"
        class="smg-spill"
        :class="tab === t.key ? 'active' : ''"
        @click="tab = t.key"
      >
        {{ t.label }}({{ t.count }})
      </button>
    </div>

    <!-- 筛选卡：4 条件与操作按钮同排右对齐（平台由顶部 tab 接管；源系统无查询按钮，条件即效） -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>关键词</label>
          <input v-model="fKw" class="sg-input" placeholder="店铺名、登录账号、店铺ID、账号ID" />
        </div>
        <div class="sg-field">
          <label>账号类型</label>
          <BubbleSelect class-name="sg-select" :value="fAcctType || '账号类型'" :options="ACCT_OPTS" @change="(v: string) => (fAcctType = v)" />
        </div>
        <div class="sg-field">
          <label>店铺分组</label>
          <BubbleSelect class-name="sg-select" :value="fGroup || '店铺分组'" :options="GROUP_OPTS" @change="(v: string) => (fGroup = v)" />
        </div>
        <div class="sg-field">
          <label>可用成员</label>
          <BubbleSelect class-name="sg-select" :value="fMember || '可用成员'" :options="MEMBER_OPTS" @change="(v: string) => (fMember = v)" />
        </div>
        <div class="sg-actions">
          <button type="button" class="sg-btn primary" :disabled="checked.size === 0" @click="openAssign">分配店铺</button>
          <button type="button" class="sg-btn" @click="publishOpen = true">发布设置</button>
          <button type="button" class="sg-btn" @click="groupOpen = true">分组管理</button>
        </div>
      </div>
    </div>

    <!-- 店铺列表：第一层店铺行，展开后第二层账号子表（品控监控列表展开样式） -->
    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table smg-table">
          <thead>
            <tr>
              <th :style="{ width: '64px' }">
                <span class="ib-caret ghost"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg></span>
                <input type="checkbox" :checked="allChecked" @change="toggleAll" />
              </th>
              <!-- 勾选列固定 64px；四个数据列不写宽度，fixed 布局下等分剩余宽度（均分） -->
              <th>店铺信息</th>
              <SortTh label="账号数" :state="sortState('accts')" @sort="onSort('accts')" />
              <th>在线状态</th>
              <th>可用成员</th>
              <SortTh label="更新时间" :state="sortState('updated')" @sort="onSort('updated')" />
              <th :style="{ width: '100px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="f in filtered" :key="f.shop.shopId">
              <tr>
                <td>
                  <span class="ib-caret" :class="{ open: expanded.has(f.shop.shopId) }" @click="toggleExpand(f.shop.shopId)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg>
                  </span>
                  <input type="checkbox" :checked="checked.has(f.shop.shopId)" @change="toggleCheck(f.shop.shopId)" />
                </td>
                <td>
                  <div class="smg-shop">
                    <span class="store-logo"><img :src="PLATFORM_LOGO[f.shop.platform]" alt="" /></span>
                    <div class="smg-shop-info">
                      <span class="smg-shop-name">{{ f.shop.name }}</span>
                      <span class="smg-shop-login">店铺ID：{{ f.shop.shopId }}</span>
                    </div>
                  </div>
                </td>
                <td>{{ f.accts.length }}</td>
                <td>
                  <!-- 店铺在线状态：账号有一个在线即在线（在线绿点/离线灰点，同账号管理状态语言） -->
                  <span class="sg-status">
                    <span class="sg-dot" :style="{ background: shopOnline(f.accts) ? '#1eaf72' : '#c3cad4' }" />
                    <span>{{ shopOnline(f.accts) ? '在线' : '离线' }}</span>
                  </span>
                </td>
                <td>
                  <div v-if="shopMembers(f.accts).length" class="smg-members">
                    <!-- ≤2 人：逐人「头像+姓名」对；>2 人：叠放头像组 + 等N人文案 -->
                    <template v-if="shopMembers(f.accts).length <= 2">
                      <span v-for="nm in shopMembers(f.accts)" :key="nm" class="smg-mpair">
                        <span class="smg-ava" :style="{ background: avaColor(nm) }">{{ nm.slice(0, 1) }}</span>
                        <span class="smg-mname">{{ nm }}</span>
                      </span>
                    </template>
                    <template v-else>
                      <span class="smg-avas">
                        <span v-for="nm in shopMembers(f.accts).slice(0, 2)" :key="nm" class="smg-ava" :style="{ background: avaColor(nm) }">{{ nm.slice(0, 1) }}</span>
                      </span>
                      <span class="smg-member-text">{{ memberText(shopMembers(f.accts)) }}</span>
                    </template>
                  </div>
                  <span v-else class="smg-dash">—</span>
                </td>
                <td>{{ shopUpdated(f.accts) }}</td>
                <td>
                  <div class="sg-acts">
                    <a class="sg-link" href="javascript:void(0)" @click.prevent="openShopSettings(f.shop)">店铺设置</a>
                  </div>
                </td>
              </tr>
              <!-- 第二层：账号维度子表（灰底展开行 + 白底子表） -->
              <tr v-if="expanded.has(f.shop.shopId)" class="ib-expand-row smg-expand-row">
                <td colspan="7">
                  <table class="ib-subtable">
                    <thead>
                      <tr>
                        <!-- 固定列宽（配合 table-layout:fixed）：多个展开子表列位逐一对齐，不随内容长短漂移 -->
                        <th :style="{ width: '10%' }">账号ID</th>
                        <th :style="{ width: '18%' }">登录账号</th>
                        <th :style="{ width: '10%' }">账号类型</th>
                        <th :style="{ width: '10%' }">在线状态</th>
                        <th :style="{ width: '12%' }">账号分组</th>
                        <th :style="{ width: '18%' }">可用成员</th>
                        <th :style="{ width: '12%' }">更新时间</th>
                        <th :style="{ width: '10%' }">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="a in f.accts" :key="a.acctId">
                        <td>{{ a.acctId }}</td>
                        <td>{{ a.login }}</td>
                        <td>{{ a.acctType }}</td>
                        <td>
                          <span class="sg-status">
                            <span class="sg-dot" :style="{ background: a.status === 'online' ? '#1eaf72' : '#c3cad4' }" />
                            <span>{{ a.status === 'online' ? '在线' : '离线' }}</span>
                          </span>
                        </td>
                        <td><span v-if="a.group">{{ a.group }}</span><span v-else class="smg-dash">—</span></td>
                        <td>
                          <div v-if="a.members.length" class="smg-members">
                            <template v-if="a.members.length <= 2">
                              <span v-for="nm in a.members" :key="nm" class="smg-mpair">
                                <span class="smg-ava" :style="{ background: avaColor(nm) }">{{ nm.slice(0, 1) }}</span>
                                <span class="smg-mname">{{ nm }}</span>
                              </span>
                            </template>
                            <template v-else>
                              <span class="smg-avas">
                                <span v-for="nm in a.members.slice(0, 2)" :key="nm" class="smg-ava" :style="{ background: avaColor(nm) }">{{ nm.slice(0, 1) }}</span>
                              </span>
                              <span class="smg-member-text">{{ memberText(a.members) }}</span>
                            </template>
                          </div>
                          <span v-else class="smg-dash">—</span>
                        </td>
                        <td>{{ a.updated }}</td>
                        <td>
                          <!-- 进入店铺为账号维度操作，与管理账号平铺 -->
                          <div class="sg-acts">
                            <a class="sg-link" href="javascript:void(0)" @click.prevent="enterShop(f.shop)">进入店铺</a>
                            <a class="sg-link" href="javascript:void(0)" @click.prevent="openAccount(a)">管理账号</a>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-if="filtered.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
      <!-- 分页（静态呈现，同店铺商品列表口径；总数与当前筛选同源） -->
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ filtered.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '200条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button v-for="n in pageCount" :key="n" class="ib-pagebtn" :class="n === 1 ? 'active' : ''">{{ n }}</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <!-- 分配店铺弹窗：MemberPickPanel 选成员（仅可选人）+ 已选侧栏 -->
    <div class="pm-page pm-host">
      <Modal v-if="assignOpen" title="分配店铺" :sub="`已选 ${checked.size} 个店铺`" size="xl" @close="assignOpen = false">
        <div class="member-transfer">
          <MemberPickPanel
            :members="pool"
            :selected-ids="picked"
            no-dept-pick
            :on-toggle="togglePick"
            :on-bulk="bulkPick"
          />
          <OgPickedSide :picked="pickedMembers" :max="pool.length" :on-remove="togglePick" />
        </div>
        <template #foot>
          <button class="btn" @click="assignOpen = false">取消</button>
          <button class="btn primary" @click="confirmAssign">确认分配</button>
        </template>
      </Modal>
    </div>

    <!-- 管理账号抽屉：平台/店铺名称/登录账号只读；分组可选；可用成员增删后保存写回行 -->
    <div v-if="acctRow" class="smg-drawer-mask" @click.self="acctId = null">
      <div class="smg-drawer">
        <div class="smg-dr-head">
          <span class="smg-dr-title">管理账号</span>
          <button type="button" class="smg-dr-x" @click="acctId = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="smg-dr-body">
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>平台：</div>
            <input class="smg-dr-input" :value="acctRow.platform" disabled />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label">分组</div>
            <BubbleSelect class-name="sg-select smg-dr-select" :value="draftGroup || '请选择分组'" :options="GROUP_OPTS" @change="(v: string) => (draftGroup = v)" />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>店铺名称：</div>
            <input class="smg-dr-input" :value="acctRow.name" disabled />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>登录账号：</div>
            <input class="smg-dr-input" :value="acctRow.login" disabled />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-mhead">
              <span class="smg-dr-mtitle">账号可用成员：</span>
              <button type="button" class="smg-dr-add" @click="openAddMember">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>
                添加成员
              </button>
            </div>
            <div class="smg-dr-mbox">
              <div v-if="draftMembers.length === 0" class="smg-dr-mempty">暂无成员</div>
              <div v-for="nm in draftMembers" :key="nm" class="smg-dr-mrow">
                <span class="smg-ava" :style="{ background: avaColor(nm) }">{{ nm.slice(0, 1) }}</span>
                <span class="smg-dr-mname">{{ nm }}</span>
                <button type="button" class="smg-dr-mrm" @click="removeDraftMember(nm)">删除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="smg-dr-foot">
          <button type="button" class="sg-btn" @click="acctId = null">取消</button>
          <button type="button" class="sg-btn primary" @click="saveAccount">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加成员弹窗（叠于管理账号抽屉之上）：MemberPickPanel 选人 -->
    <div v-if="addMemberOpen" class="pm-page pm-host smg-top-host">
      <Modal title="添加成员" size="xl" @close="addMemberOpen = false">
        <div class="member-transfer">
          <MemberPickPanel
            :members="pool"
            :selected-ids="pickedAdd"
            no-dept-pick
            :on-toggle="togglePickAdd"
            :on-bulk="bulkPickAdd"
          />
          <OgPickedSide :picked="pickedAddMembers" :max="pool.length" :on-remove="togglePickAdd" />
        </div>
        <template #foot>
          <button class="btn" @click="addMemberOpen = false">取消</button>
          <button class="btn primary" @click="confirmAddMember">确认添加</button>
        </template>
      </Modal>
    </div>

    <!-- 分组管理抽屉：选分组保存后应用到勾选店铺；齿轮维护分组清单 -->
    <div v-if="groupOpen" class="smg-drawer-mask" @click.self="groupOpen = false">
      <div class="smg-drawer">
        <div class="smg-dr-head">
          <span class="smg-dr-title">分组管理</span>
          <button type="button" class="smg-dr-x" @click="groupOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="smg-dr-body">
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>选择分组</div>
            <div class="smg-dr-grow">
              <BubbleSelect class-name="sg-select smg-dr-select" :value="groupSel || '请选择分组'" :options="GROUP_OPTS" @change="(v: string) => (groupSel = v)" />
              <button type="button" class="smg-dr-gear" @click="openGroupModal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="smg-dr-foot">
          <button type="button" class="sg-btn" @click="groupOpen = false">返回</button>
          <button type="button" class="sg-btn primary" @click="saveGroupDrawer">保存</button>
        </div>
      </div>
    </div>

    <!-- 分组清单弹窗（叠于分组抽屉之上）：默认项不可删；新增行内输入 -->
    <div v-if="groupModalOpen" class="pm-page pm-host smg-top-host">
      <Modal title="分组管理" @close="groupModalOpen = false">
        <div class="smg-gp-list">
          <div v-for="(g, i) in gpDraft" :key="i" class="smg-gp-row">
            <input v-if="g.fresh" v-model="g.name" class="smg-gp-input" placeholder="请输入分组名称" />
            <template v-else>
              <span>{{ g.name }}</span>
              <span v-if="g.isDefault" class="smg-gp-def">默认</span>
              <button v-else type="button" class="smg-gp-rm" @click="gpRemove(g.name)">删除</button>
            </template>
          </div>
          <button type="button" class="smg-gp-add" @click="gpAdd">+ 添加分组</button>
        </div>
        <template #foot>
          <button class="btn" @click="groupModalOpen = false">取消</button>
          <button class="btn primary" @click="gpSave">保存</button>
        </template>
      </Modal>
    </div>

    <!-- 发布设置抽屉：商家编码只读 -->
    <div v-if="publishOpen" class="smg-drawer-mask" @click.self="publishOpen = false">
      <div class="smg-drawer">
        <div class="smg-dr-head">
          <span class="smg-dr-title">发布设置</span>
          <button type="button" class="smg-dr-x" @click="publishOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="smg-dr-body">
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>商家编码</div>
            <input class="smg-dr-input" value="杭州IT-王龙" disabled />
          </div>
        </div>
        <div class="smg-dr-foot">
          <button type="button" class="sg-btn" @click="publishOpen = false">取消</button>
          <button type="button" class="sg-btn primary" @click="savePublish">保存</button>
        </div>
      </div>
    </div>

    </template>

    <!-- 店铺配置二级页：返回+标题头行，白卡承载双页签表单（功能与原抽屉一致；后续类目申请模块挂在此页） -->
    <div v-else class="smg-set-page">
      <div class="smg-set-head">
        <button type="button" class="sgd-back" title="返回" @click="closeShopSettings">←</button>
        <span class="smg-set-title">店铺配置</span>
        <div class="smg-set-ops">
          <template v-if="settingsEditing">
            <button type="button" class="sg-btn" @click="cancelSettingsEdit">取消</button>
            <button type="button" class="sg-btn primary" @click="confirmSaveShopSettings">保存</button>
          </template>
          <button v-else type="button" class="sg-btn" @click="settingsEditing = true">编辑</button>
        </div>
      </div>
      <div class="smg-set-card">
        <div class="smg-dr-tabs">
          <button type="button" :class="{ on: settingsTab === 'basic' }" @click="settingsTab = 'basic'">基本配置</button>
          <button type="button" :class="{ on: settingsTab === 'publish' }" @click="settingsTab = 'publish'">限制编码配置</button>
          <button type="button" :class="{ on: settingsTab === 'category' }" @click="settingsTab = 'category'">类目申请</button>
          <button type="button" :class="{ on: settingsTab === 'blacklist' }" @click="settingsTab = 'blacklist'">店铺黑品限制</button>
        </div>
        <template v-if="settingsTab === 'basic'">
          <div class="smg-dr-field">
            <div class="smg-dr-label">店铺名称</div>
            <input class="smg-dr-input" :value="shopSettingsRow?.name ?? ''" disabled />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label">是否开启运费险</div>
            <div class="smg-radios">
              <label class="smg-radio"><input type="radio" name="ss-insurance" :checked="draftInsurance === 'yes'" :disabled="!settingsEditing" @change="draftInsurance = 'yes'" /><span>开启</span></label>
              <label class="smg-radio"><input type="radio" name="ss-insurance" :checked="draftInsurance === 'no'" :disabled="!settingsEditing" @change="draftInsurance = 'no'" /><span>不开启</span></label>
            </div>
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label">是否支持假一赔三</div>
            <div class="smg-radios">
              <label class="smg-radio"><input type="radio" name="ss-fake" :checked="draftFakeComp === 'yes'" :disabled="!settingsEditing" @change="draftFakeComp = 'yes'" /><span>支持</span></label>
              <label class="smg-radio"><input type="radio" name="ss-fake" :checked="draftFakeComp === 'no'" :disabled="!settingsEditing" @change="draftFakeComp = 'no'" /><span>不支持</span></label>
            </div>
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label">是否支持7天无理由</div>
            <div class="smg-radios">
              <label class="smg-radio"><input type="radio" name="ss-7d" checked disabled /><span>支持</span></label>
            </div>
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label">品牌</div>
            <!-- 品牌单选标签云：点选即替换唯一选中项，不可取消为空；编辑态可增删改自定义品牌（视频号店铺由平台管控，不提供增删改） -->
            <div class="smg-tagbox">
              <button v-for="b in BRAND_OPTS" :key="b" type="button" class="smg-tag" :class="{ on: draftBrand === b }" :disabled="!settingsEditing" @click="draftBrand = b">{{ b }}</button>
              <template v-for="b in draftCustomBrands" :key="b">
                <span v-if="brandEditing === b" class="smg-tagwrap">
                  <input v-model="brandEditName" class="smg-tag-input edit" @blur="commitBrandEdit" @keydown.enter="commitBrandEdit" @keydown.esc.stop="cancelBrandEdit" />
                </span>
                <span v-else class="smg-tagwrap">
                  <button type="button" class="smg-tag custom" :class="{ on: draftBrand === b, mg: canManageBrands }" :disabled="!settingsEditing" @click="draftBrand = b">{{ b }}</button>
                  <span v-if="canManageBrands" class="smg-tagops">
                    <button type="button" class="smg-tagop" title="修改名称" @click="startBrandEdit(b)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                    </button>
                    <button type="button" class="smg-tagop" title="删除" @click="removeCustomBrand(b)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                </span>
              </template>
              <span v-if="canManageBrands" class="smg-tagwrap">
                <input v-if="brandAdding" v-model="brandNewName" class="smg-tag-input add" placeholder="输入品牌名称" @blur="commitBrandAdd" @keydown.enter="commitBrandAdd" @keydown.esc.stop="cancelBrandAdd" />
                <button v-else type="button" class="smg-tag smg-tag-add" @click="startBrandAdd">＋ 自定义品牌</button>
              </span>
            </div>
          </div>
        </template>
        <template v-else-if="settingsTab === 'publish'">
          <!-- 警示条：说明限制语义（同 .cpd-spec-notice 语言：浅橙底＋橙字＋三角叹号），置于页签下、两组标签云之上 -->
          <div class="smg-pub-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" /></svg>
            <span>选择发布商品时需要限制的编码归属类型，命中配置的品牌、品类的商品编码发布时，任务将自动失败</span>
          </div>
          <!-- 限制项两组上下区分：品牌（图一/图二已勾选口径）＋商品品类（图三已选口径），标签点选/再点取消 -->
          <div class="smg-dr-field">
            <div class="smg-dr-label">品牌</div>
            <div class="smg-tagbox">
              <button v-if="BLOCK_BRAND_OPTS.length >= 2" type="button" class="smg-tag smg-tag-all" :class="{ on: allBlockBrandsOn }" :disabled="!settingsEditing" @click="toggleAllBlockBrands">全选</button>
              <button v-for="b in BLOCK_BRAND_OPTS" :key="b" type="button" class="smg-tag" :class="{ on: draftBlockedBrands.includes(b) }" :disabled="!settingsEditing" @click="toggleBlockBrand(b)">{{ b }}</button>
            </div>
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label">商品品类</div>
            <div class="smg-tagbox">
              <button v-if="BLOCK_CAT_OPTS.length >= 2" type="button" class="smg-tag smg-tag-all" :class="{ on: allBlockCatsOn }" :disabled="!settingsEditing" @click="toggleAllBlockCats">全选</button>
              <button v-for="c in BLOCK_CAT_OPTS" :key="c" type="button" class="smg-tag" :class="{ on: draftBlockedCats.includes(c) }" :disabled="!settingsEditing" @click="toggleBlockCat(c)">{{ c }}</button>
            </div>
          </div>
          <div class="smg-dr-tip">已配置品牌与商品品类的商品编码不可在本店铺发布</div>
        </template>
        <template v-else-if="settingsTab === 'category'">
          <!-- 类目申请：申请类目弹窗两步（选择→确认及提交）→ 我的类目审核闭环；已选清单不再单独占页面模块 -->
          <!-- 我的类目：已申请/审核中/审核失败/已撤销 四态查看＋详情/撤销审核/重新申请；申请入口与标题同行右对齐 -->
          <div class="smg-cat-sec">
            <div class="smg-cat-h">
              <span>我的类目</span>
              <button type="button" class="sg-btn primary" @click="openCatPicker">申请类目</button>
            </div>
            <div class="smg-cat-chips">
              <button v-for="s in CAT_STATUS_CHIPS" :key="s.key" type="button" class="smg-cat-chip" :class="{ on: catStatusTab === s.key }" @click="catStatusTab = s.key">{{ s.label }}({{ catFlowCounts[s.key] }})</button>
            </div>
            <table class="sg-table smg-cat-table">
              <thead>
                <tr>
                  <th>类目</th>
                  <th>保证金</th>
                  <th>提交时间</th>
                  <th>状态</th>
                  <th>说明</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in catFlowRows" :key="f.flowId">
                  <td>{{ catPathText(f.catId) }}</td>
                  <td>¥{{ f.deposit.toLocaleString() }}</td>
                  <td>{{ f.submitTime }}</td>
                  <td><span class="smg-cat-st" :class="f.status">{{ CAT_STATUS_TEXT[f.status] }}</span></td>
                  <td>{{ f.status === 'failed' ? f.failReason : f.status === 'canceled' ? '撤销于 ' + f.cancelTime : '—' }}</td>
                  <td>
                    <a class="sg-link" href="javascript:void(0)" @click.prevent="catDetail = f">详情</a>
                    <a v-if="f.status === 'auditing'" class="sg-link" href="javascript:void(0)" @click.prevent="catCancelFlow = f">撤销审核</a>
                    <a v-if="f.status === 'failed' && !catFlowStatusOf(f.catId)" class="sg-link" href="javascript:void(0)" @click.prevent="catReapply(f)">重新申请</a>
                  </td>
                </tr>
                <tr v-if="catFlowRows.length === 0"><td colspan="6" class="smg-cat-empty">暂无该状态的类目</td></tr>
              </tbody>
            </table>
          </div>
        </template>
        <template v-else-if="settingsTab === 'blacklist'">
          <!-- 店铺黑品限制：商品编码（系列编码为限制单元）/ 商品ID 两个子 tab；命中限制的商品发布到本店铺时任务失败 -->
          <div class="smg-bl-sec">
            <div class="smg-bl-bar">
              <div class="smg-bl-seg">
                <button v-for="t in BL_TABS" :key="t.key" type="button" :class="{ on: blDim === t.key }" @click="blDim = t.key">{{ t.label }}({{ blCounts[t.key] }})</button>
              </div>
              <div class="smg-bl-ops">
                <span class="sg-inputwrap smg-bl-kw">
                  <input v-model="blKw" class="sg-input" :placeholder="blDim === 'goods' ? '请输入母链接或商品名称' : '请输入系列编码 / 商品编码'" />
                  <button v-if="blKw" type="button" class="kb-clear" title="清空" @click="blKw = ''">×</button>
                </span>
                <button type="button" class="sg-btn primary" @click="openBlAdd">添加到黑品</button>
              </div>
            </div>
            <!-- 商品编码：系列编码为限制单元的单层列表（整系列限制＝其下全部商品编码受限）；受限编码明细走详情抽屉 -->
            <table v-if="blDim === 'code'" class="sg-table smg-bl-table">
              <thead>
                <tr>
                  <th>商品信息</th>
                  <SortTh label="添加人 / 添加时间" :state="blSort" @sort="onBlSort" />
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in blGroups" :key="g.series" class="smg-bl-grow">
                  <td>
                    <!-- 系列编码为纯文字标识、与商品无关：不挂商品缩略图，仅系列文字＋受限计数；受限编码明细走详情抽屉 -->
                    <div class="ib-product smg-bl-series">
                      <div class="bl-pinfo">
                        <div class="ib-pname"><Ellipsis :text="g.series" /></div>
                        <div class="ib-meta">系列编码{{ g.entry ? '（整系列限制）' : '' }}・已限制 {{ g.children.length }}/{{ g.total }} 个商品编码</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <template v-if="blWhoOf(g)">
                      <div class="bl-who">{{ blWhoOf(g)!.addBy }}</div>
                      <div class="ib-meta">{{ blWhoOf(g)!.addTime }}</div>
                    </template>
                    <span v-else class="smg-dash">—</span>
                  </td>
                  <td>
                    <a class="sg-link" href="javascript:void(0)" @click.prevent="openBlView(g.series)">详情</a>
                    <a class="sg-link danger" href="javascript:void(0)" @click.prevent="blDelGroup = g.series">删除</a>
                  </td>
                </tr>
                <tr v-if="blGroups.length === 0"><td colspan="3" class="smg-cat-empty">{{ blKw.trim() ? '无符合条件的黑品限制' : '暂无商品编码限制' }}</td></tr>
              </tbody>
            </table>
            <!-- 商品ID：单层列表 -->
            <table v-else class="sg-table smg-bl-table">
              <thead>
                <tr>
                  <th>商品信息</th>
                  <SortTh label="添加人 / 添加时间" :state="blSort" @sort="onBlSort" />
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in blGoodsRows" :key="r.id">
                  <td>
                    <div class="ib-product">
                      <img v-if="blThumbOf(r.goodsId)" class="ib-thumb" :src="blThumbOf(r.goodsId)" alt="" />
                      <div v-else class="ib-thumb bl-thumb-ph"></div>
                      <div class="bl-pinfo">
                        <div class="ib-pname"><Ellipsis :text="r.name || r.value" /></div>
                        <div class="ib-meta">母链接：{{ r.value }}</div>
                        <div v-if="shopSettingsRow" class="ib-meta">
                          店铺：
                          <span class="store-logo"><img :src="PLATFORM_LOGO[shopSettingsRow.platform]" alt="" /></span>
                          {{ shopSettingsRow.name }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="bl-who">{{ r.addBy }}</div>
                    <div class="ib-meta">{{ r.addTime }}</div>
                  </td>
                  <td>
                    <a class="sg-link" href="javascript:void(0)" @click.prevent="openBlEdit(r)">编辑</a>
                    <a class="sg-link danger" href="javascript:void(0)" @click.prevent="blDelRow = r">删除</a>
                  </td>
                </tr>
                <tr v-if="blGoodsRows.length === 0"><td colspan="3" class="smg-cat-empty">{{ blKw.trim() ? '无符合条件的黑品限制' : '暂无母链接限制' }}</td></tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>
    <!-- 保存确认弹窗：内容保存后全店生效 -->
    <Teleport to="body">
      <div v-if="shopSettingsConfirm" class="mk-create-mask mk-confirm-mask" @click.self="shopSettingsConfirm = false">
        <div class="mk-confirm-modal">
          <div class="mk-confirm-head">确认保存</div>
          <div class="mk-confirm-body">内容保存后全店生效，是否确认保存修改？</div>
          <div class="mk-confirm-foot">
            <button class="sg-btn" @click="shopSettingsConfirm = false">取消</button>
            <button class="sg-btn primary" @click="doSaveShopSettings">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 申请类目弹窗两步：第一步选择（查询条件＋级联穿梭列＋已选列），第二步确认及提交（已选清单＋材料确认） -->
    <div v-if="catPickerOpen" class="pm-page pm-host smg-top-host">
      <Modal :title="catStep === 1 ? '申请类目' : '确认提交'" size="xl" @close="catPickerOpen = false">
        <div class="smg-cat-mbody">
        <template v-if="catStep === 1">
        <div class="smg-cat-pick">
          <div class="smg-cat-pf">
            <label>保证金金额(元)</label>
            <div class="smg-cat-range">
              <span class="smg-cat-depwrap">
                <input v-model="catDepMin" class="sg-input smg-cat-depinput" placeholder="最小" />
                <button v-if="catDepMin" type="button" class="smg-cat-clear" title="清除" @click="catDepMin = ''">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </span>
              <i class="smg-cat-dash">—</i>
              <span class="smg-cat-depwrap">
                <input v-model="catDepMax" class="sg-input smg-cat-depinput" placeholder="最大" />
                <button v-if="catDepMax" type="button" class="smg-cat-clear" title="清除" @click="catDepMax = ''">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </span>
            </div>
          </div>
          <div class="smg-cat-pf">
            <label>申请状态</label>
            <BubbleSelect class-name="sg-select" :value="catFStatus" :options="CAT_F_STATUS_OPTS" @change="(v: string) => (catFStatus = v)" />
          </div>
          <div class="smg-cat-pf">
            <label>是否需要提交资质信息</label>
            <BubbleSelect class-name="sg-select" :value="catFQual" :options="CAT_F_QUAL_OPTS" @change="(v: string) => (catFQual = v)" />
          </div>
        </div>
        <div class="smg-cat-casc">
          <div v-for="(col, ci) in catCols" :key="ci" class="smg-cat-col">
            <div class="smg-cat-colh">{{ CAT_LEVEL_NAMES[ci] }}</div>
            <div class="smg-cat-colb">
              <div
                v-for="n in col"
                :key="n.catId"
                class="smg-cat-row"
                :class="{ on: catPath[ci] === n.catId, sel: catSubChecked(n), dis: !!catFlowStatusOf(n.catId) }"
                @click="catPickRow(ci, n)"
              >
                <span v-if="catFlowStatusOf(n.catId)" class="smg-cat-st" :class="catFlowStatusOf(n.catId)">{{ CAT_STATUS_TEXT[catFlowStatusOf(n.catId)!] }}</span>
                <input v-else type="checkbox" :checked="catSubChecked(n)" :disabled="!catPickableLeaves(n).length" @click.stop @change="catToggleNode(n)" />
                <span class="smg-cat-name">{{ n.name }}</span>
                <span v-if="!n.children?.length && catNeedQual(n)" class="smg-cat-q" :title="(n.quals ?? []).map((q) => `${q}：${QUAL_REQ[q]}`).join('\n')">资质</span>
                <span v-if="!n.children?.length" class="smg-cat-dep">¥{{ (n.deposit ?? 0).toLocaleString() }}</span>
                <i v-if="n.children?.length" class="smg-cat-more">▸</i>
              </div>
              <div v-if="col.length === 0" class="smg-cat-empty">无符合条件类目</div>
            </div>
          </div>
          <div class="smg-cat-col">
            <div class="smg-cat-colh">已选类目({{ catSelected.length }})</div>
            <div class="smg-cat-colb">
              <div v-for="l in catSelectedLeaves" :key="l.catId" class="smg-cat-row sel">
                <span class="smg-cat-name" :title="catPathText(l.catId)">{{ l.name }}</span>
                <span v-if="catNeedQual(l)" class="smg-cat-q" :title="(l.quals ?? []).map((q) => `${q}：${QUAL_REQ[q]}`).join('\n')">资质</span>
                <span class="smg-cat-dep">¥{{ (l.deposit ?? 0).toLocaleString() }}</span>
                <button type="button" class="smg-cat-del" title="移除" @click="catToggleLeaf(l.catId)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div v-if="catSelected.length === 0" class="smg-cat-empty">未选择类目</div>
            </div>
          </div>
        </div>
        </template>
        <!-- 第二步：确认及提交。清单即唯一依据，可逐行移除或清空；需资质时须勾选材料确认 -->
        <div v-else class="smg-cat-confirm">
          <div class="smg-cat-picked">
            <div v-for="l in catSelectedLeaves" :key="l.catId" class="smg-cat-prow" :class="{ stack: !!l.quals?.length }">
              <span class="smg-cat-name">{{ catPathText(l.catId) }}</span>
              <span class="smg-cat-dep">保证金 ¥{{ (l.deposit ?? 0).toLocaleString() }}</span>
              <button type="button" class="smg-cat-del" title="移除" @click="catToggleLeaf(l.catId)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
              <!-- 需资质类目：每份材料一个上传槽，未传=虚线槽＋上传，已传=浅蓝槽＋文件名＋移除 -->
              <div v-if="l.quals?.length" class="smg-cat-mats">
                <div v-for="q in l.quals" :key="q" class="smg-cat-mat" :class="{ on: !!catQualFile(l.catId, q) }" :title="QUAL_REQ[q]">
                  <span class="smg-cat-matname">{{ q }}</span>
                  <template v-if="catQualFile(l.catId, q)">
                    <span class="smg-cat-matfile" :title="catQualFile(l.catId, q)">{{ catQualFile(l.catId, q) }}</span>
                    <button type="button" class="smg-cat-del" title="移除" @click="removeCatQualFile(l.catId, q)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </template>
                  <label v-else class="smg-cat-matup">上传<input type="file" accept="image/*,.pdf" @change="onQualFilePick(l.catId, q, $event)" /></label>
                </div>
              </div>
            </div>
          </div>
          <div class="smg-cat-bar">
            <span class="smg-cat-sum">已选 {{ catSelected.length }} 个类目・最高保证金 ¥{{ catSelectedMaxDeposit.toLocaleString() }}</span>
            <div class="smg-cat-ops">
              <button type="button" class="sg-btn" @click="catClearAll">清空</button>
            </div>
          </div>
          <div v-if="catQualMissing.length" class="smg-cat-matmiss">还有 {{ catQualMissing.length }} 份资质材料待上传，上传后方可提交</div>
          <div v-else class="smg-dr-tip">提交后进入平台审核，进度与结果在「我的类目」查看</div>
        </div>
        </div>
        <template #foot>
          <template v-if="catStep === 1">
            <button class="btn" @click="catPickerOpen = false">取消</button>
            <button class="btn primary" :disabled="catSelected.length === 0" @click="catStep = 2">下一步</button>
          </template>
          <template v-else>
            <button class="btn" @click="catStep = 1">上一步</button>
            <button class="btn primary" :disabled="catQualMissing.length > 0" @click="catSubmitApply">确认提交</button>
          </template>
        </template>
      </Modal>
    </div>

    <!-- 类目详情：审核单/权限字段（审核单号、生效/失效时间、失败/撤销原因、资质） -->
    <div v-if="catDetail" class="pm-page pm-host smg-top-host">
      <Modal title="类目详情" @close="catDetail = null">
        <div class="smg-cat-dl">
          <div class="smg-cat-drow"><span>类目</span><b>{{ catPathText(catDetail.catId) }}</b></div>
          <div class="smg-cat-drow"><span>保证金</span><b>¥{{ catDetail.deposit.toLocaleString() }}</b></div>
          <div class="smg-cat-drow"><span>状态</span><b><span class="smg-cat-st" :class="catDetail.status">{{ CAT_STATUS_TEXT[catDetail.status] }}</span></b></div>
          <div class="smg-cat-drow"><span>审核单号</span><b>{{ catDetail.flowId }}</b></div>
          <div class="smg-cat-drow"><span>提交时间</span><b>{{ catDetail.submitTime }}</b></div>
          <div v-if="catDetail.auditTime" class="smg-cat-drow"><span>审核时间</span><b>{{ catDetail.auditTime }}</b></div>
          <div v-if="catDetail.effectiveTime" class="smg-cat-drow"><span>生效时间</span><b>{{ catDetail.effectiveTime }}</b></div>
          <div v-if="catDetail.expireTime" class="smg-cat-drow"><span>失效时间</span><b>{{ catDetail.expireTime }}</b></div>
          <div v-if="catDetail.failReason" class="smg-cat-drow"><span>失败原因</span><b>{{ catDetail.failReason }}</b></div>
          <div v-if="catDetail.cancelTime" class="smg-cat-drow"><span>撤销时间</span><b>{{ catDetail.cancelTime }}</b></div>
          <div class="smg-cat-drow"><span>资质材料</span><b>{{ catQualText(catDetail) }}</b></div>
        </div>
        <template #foot>
          <button class="btn" @click="catDetail = null">关闭</button>
        </template>
      </Modal>
    </div>

    <!-- 撤销类目审核确认 -->
    <Teleport to="body">
      <div v-if="catCancelFlow" class="mk-create-mask mk-confirm-mask" @click.self="catCancelFlow = null">
        <div class="mk-confirm-modal">
          <div class="mk-confirm-head">撤销类目审核</div>
          <div class="mk-confirm-body">撤销后本次申请终止，如需开通需重新提交，是否确认撤销？</div>
          <div class="mk-confirm-foot">
            <button class="sg-btn" @click="catCancelFlow = null">取消</button>
            <button class="sg-btn primary" @click="catDoCancel">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 添加到黑品 / 编辑黑品限制：商品编码子 tab＝系列编码下拉＋商品编码下拉（留空＝整系列限制）；商品ID 子 tab＝可搜索商品下拉 -->
    <div v-if="blFormOpen" class="pm-page pm-host smg-top-host">
      <Modal :title="blEditId === null ? '添加到黑品' : '编辑黑品限制'" sub="命中限制的商品发布到本店铺时，发布任务将自动失败" @close="blFormOpen = false">
        <div class="di-form">
          <template v-if="blDim === 'goods'">
            <!-- 商品ID：手动输入多个（回车/查询入列）、× 删除；查询按ID回查商品名称 -->
            <div class="di-field smg-bl-qfield">
              <label>母链接</label>
              <div class="smg-bl-tags">
                <span v-for="c in blIdChips" :key="c.id" class="smg-bl-tag" :title="c.name || c.id">
                  {{ c.id }}<i v-if="c.name" class="smg-bl-tagname">{{ c.name }}</i>
                  <button type="button" class="smg-bl-tagx" title="删除" @click="removeBlId(c.id)">×</button>
                </span>
                <input v-model="blIdInput" class="smg-bl-taginput" placeholder="输入母链接，回车或点查询添加，可填多个" @keydown.enter.prevent="commitBlIds" />
                <button type="button" class="sg-btn smg-bl-qbtn" @click="commitBlIds">查询</button>
              </div>
            </div>
          </template>
          <template v-else>
            <!-- 系列编码&商品编码：输入即模糊检索，点选命中项（系列＝整系列限制） -->
            <div class="di-field smg-bl-qfield">
              <label>系列编码 / 商品编码</label>
              <div class="sg-inputwrap smg-bl-qbox">
                <input v-model="blQ" class="sg-input" placeholder="输入系列编码或商品编码快捷检索" />
                <button v-if="blQ" type="button" class="kb-clear" title="清空" @click="blQ = ''">×</button>
              </div>
              <div v-if="blQ.trim() && blHits.length" class="smg-bl-qhits">
                <button v-for="h in blHits" :key="`${h.dim}-${h.value}`" type="button" class="smg-bl-qhit" :class="{ on: blPick?.dim === h.dim && blPick?.value === h.value }" @click="pickBlHit(h)">
                  <span class="smg-bl-src">{{ h.dim === '系列编码' ? '系列' : '编码' }}</span>
                  <span class="smg-bl-qv">{{ h.value }}</span>
                  <span v-if="h.series" class="smg-bl-qs">{{ h.series }}</span>
                </button>
              </div>
              <div v-else-if="blQ.trim()" class="smg-bl-qnone">无匹配的系列编码 / 商品编码</div>
              <div v-if="blPick" class="smg-bl-picked">
                已选：<span class="smg-bl-src">{{ blPick.dim === '系列编码' ? '系列' : '编码' }}</span>
                <span class="smg-bl-qv">{{ blPick.value }}</span>
                <span v-if="blPick.series" class="smg-bl-qs">{{ blPick.series }}</span>
                <button type="button" class="smg-bl-tagx" title="移除" @click="blPick = null">×</button>
              </div>
            </div>
            <!-- 选中系列编码时须再定限制范围：整系列＝新增编码自动同步；指定编码＝芯片云多选该系列下编码 -->
            <div v-if="blPick && blPick.dim === '系列编码'" class="di-field smg-bl-qfield">
              <label>限制范围</label>
              <BubbleSelect
                class-name="sg-select smg-dr-select"
                :value="blAddScope === 'all' ? '整系列限制' : '指定编码限制'"
                :options="['整系列限制', '指定编码限制']"
                @change="(v: string) => (blAddScope = v === '整系列限制' ? 'all' : 'part')"
              />
            </div>
            <div v-if="blPick && blPick.dim === '系列编码' && blAddScope === 'part'" class="di-field smg-bl-qfield">
              <label>受限商品编码</label>
              <div class="smg-bl-codes edit">
                <button v-for="c in blAddSeriesCodes" :key="c" type="button" class="kb-scene-tag" :class="{ on: blAddCodes.has(c) }" @click="toggleBlAddCode(c)">{{ c }}</button>
              </div>
            </div>
          </template>
          <div class="di-field">
            <label>添加人</label>
            <div class="di-val">七妮妮</div>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="blFormOpen = false">取消</button>
          <button class="btn primary" @click="submitBlForm">{{ blEditId === null ? '确认添加' : '保存' }}</button>
        </template>
      </Modal>
    </div>

    <!-- 黑品限制详情/编辑抽屉（系列级）：详情看该维度受限商品编码标签流；编辑按知识库打标签样式点选编码 -->
    <div v-if="blDrawerGroup" class="smg-drawer-mask" @click.self="closeBlDrawer">
      <div class="smg-drawer">
        <div class="smg-dr-head">
          <span class="smg-dr-title">{{ blDrawerEdit ? '编辑黑品限制' : '黑品限制详情' }}</span>
          <button type="button" class="smg-dr-x" @click="closeBlDrawer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="smg-dr-body">
          <div class="smg-dr-field">
            <div class="smg-dr-label">系列编码</div>
            <div class="smg-dr-static">{{ blDrawerGroup.series }}</div>
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label">限制范围</div>
            <BubbleSelect
              class-name="sg-select smg-dr-select"
              :disabled="!blDrawerEdit"
              :value="blScopeNow === 'all' ? '整系列限制' : '部分编码'"
              :options="['整系列限制', '部分编码']"
              @change="(v: string) => setBlScope(v === '整系列限制' ? 'all' : 'part')"
            />
          </div>
          <!-- 整系列限制：不逐个展示编码，改提示新增编码自动同步限制 -->
          <div v-if="blDrawerAll" class="smg-dr-field">
            <div class="smg-pub-notice">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" /></svg>
              <span>当前系列编码限制后，若商品编码有新增则自动同步限制，无需额外配置</span>
            </div>
          </div>
          <div v-else class="smg-dr-field">
            <div class="smg-dr-label">受限商品编码</div>
            <div class="smg-bl-codes" :class="{ edit: blDrawerEdit }">
              <button v-for="c in blEditAllCodes" :key="c" type="button" class="kb-scene-tag" :class="{ on: blSelNow.has(c) }" :disabled="!blDrawerEdit" @click="toggleBlCode(c)">{{ c }}</button>
            </div>
          </div>
          <div v-if="blWhoOf(blDrawerGroup)" class="smg-dr-field">
            <div class="smg-dr-label">添加人 / 添加时间</div>
            <div class="smg-dr-static">{{ blWhoOf(blDrawerGroup)!.addBy }}<span class="smg-dr-time">{{ blWhoOf(blDrawerGroup)!.addTime }}</span></div>
          </div>
        </div>
        <div class="smg-dr-foot">
          <template v-if="blDrawerEdit">
            <button type="button" class="sg-btn" @click="blDrawerEdit = false">取消</button>
            <button type="button" class="sg-btn primary" @click="submitBlEditSeries">保存</button>
          </template>
          <template v-else>
            <button type="button" class="sg-btn" @click="closeBlDrawer">关闭</button>
            <button type="button" class="sg-btn primary" @click="startBlEdit">编辑</button>
          </template>
        </div>
      </div>
    </div>

    <!-- 删除黑品限制二次确认 -->
    <Teleport to="body">
      <div v-if="blDelRow || blDelGroup" class="mk-create-mask mk-confirm-mask" @click.self="blDelRow = null; blDelGroup = null">
        <div class="mk-confirm-modal">
          <div class="mk-confirm-head">删除黑品限制</div>
          <div class="mk-confirm-body">{{ blDelConfirmText }}</div>
          <div class="mk-confirm-foot">
            <button class="sg-btn" @click="blDelRow = null; blDelGroup = null">取消</button>
            <button class="sg-btn danger" @click="confirmBlDel">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
