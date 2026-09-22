<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from '../ops-center/data';
import MemberPickPanel from './MemberPickPanel.vue';
import OgPickedSide from './OgPickedSide.vue';
import { INITIAL_MEMBERS, avaColor } from './data';
import './style.css';

/* =========================================================
   权限设置 › 店铺管理（店铺→账号两层可展开列表，展开样式同品控监控列表）
   状态 tab（全部/在线/离线）+ 筛选（平台/关键词/账号类型/店铺分组/可用成员）
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
]);

/** 可用成员单元格文案（>2 人）：首名、次名等N人；≤2 人逐人「头像+姓名」对展示 */
const memberText = (ms: string[]) => `${ms[0]}、${ms[1]}等${ms.length}人`;

/* ---------- 状态 tab（计数为后端聚合口径，静态展示） ---------- */
const TABS = [
  { key: 'all', label: '全部', count: 226 },
  { key: 'online', label: '在线', count: 122 },
  { key: 'offline', label: '离线', count: 104 },
] as const;
type TabKey = (typeof TABS)[number]['key'];
const tab = ref<TabKey>('all');

/* ---------- 筛选（即效，无查询按钮） ---------- */
const fPlatform = ref('');
const fKw = ref('');
const fAcctType = ref('');
const fGroup = ref('');
const fMember = ref('');
const PLATFORM_OPTS = ['淘宝', '天猫', '拼多多', '抖音', '快手'];
const ACCT_OPTS = ['主账号', '子账号'];
/* ---------- 店铺分组（分组管理维护；未分组店铺为默认项，不写入行） ---------- */
interface ShopGroup { name: string; isDefault?: boolean; fresh?: boolean }
const groups = ref<ShopGroup[]>([{ name: '未分组店铺', isDefault: true }]);
const GROUP_OPTS = computed(() => groups.value.map((g) => g.name));
const pool = INITIAL_MEMBERS.filter((m) => m.status !== 'pending');
const MEMBER_OPTS = [...new Set(pool.map((m) => m.name))];

/* 两层筛选：账号类型/可用成员/状态 tab 过滤账号子行，平台/店铺分组过滤店铺行；
   关键词命中店铺则展示其全部账号，仅命中账号则只展示该账号；无匹配账号的店铺不展示 */
const filtered = computed(() => {
  const kw = fKw.value.trim().toLowerCase();
  return rows.value.map((s) => {
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
    if (fPlatform.value && shop.platform !== fPlatform.value) return false;
    if (fGroup.value && shop.group !== fGroup.value) return false;
    return true;
  });
});
/** 店铺行可用成员：子行账号成员并集（去重保序） */
const shopMembers = (accts: AcctRow[]) => [...new Set(accts.flatMap((a) => a.members))];
/** 店铺行更新时间：子行账号更新时间的最新值（格式定长，字符串序即时间序） */
const shopUpdated = (accts: AcctRow[]) => accts.reduce((m, a) => (a.updated > m ? a.updated : m), '');

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

/* ---------- ESC 逐层关闭（内层优先；抽屉/弹窗遮罩点击亦可关） ---------- */
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (addMemberOpen.value) addMemberOpen.value = false;
  else if (groupModalOpen.value) groupModalOpen.value = false;
  else if (acctId.value) acctId.value = null;
  else if (groupOpen.value) groupOpen.value = false;
  else if (publishOpen.value) publishOpen.value = false;
  else if (assignOpen.value) assignOpen.value = false;
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="sg-page smg-page">
    <!-- 状态 tab：全部/在线/离线（下划线式页级 tab） -->
    <div class="sg-tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="sg-tab"
        :class="tab === t.key ? 'active' : ''"
        @click="tab = t.key"
      >
        {{ t.label }}({{ t.count }})
      </button>
    </div>

    <!-- 筛选卡：5 条件与操作按钮同排右对齐（源系统无查询按钮，条件即效） -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>平台</label>
          <BubbleSelect class-name="sg-select" :value="fPlatform || '平台'" :options="PLATFORM_OPTS" @change="(v: string) => (fPlatform = v)" />
        </div>
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
              <th>账号数</th>
              <th>可用成员</th>
              <th>更新时间</th>
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
              </tr>
              <!-- 第二层：账号维度子表（灰底展开行 + 白底子表） -->
              <tr v-if="expanded.has(f.shop.shopId)" class="ib-expand-row smg-expand-row">
                <td colspan="5">
                  <table class="ib-subtable">
                    <thead>
                      <tr>
                        <!-- 固定列宽（配合 table-layout:fixed）：多个展开子表列位逐一对齐，不随内容长短漂移 -->
                        <th :style="{ width: '10%' }">账号ID</th>
                        <th :style="{ width: '20%' }">登录账号</th>
                        <th :style="{ width: '10%' }">账号类型</th>
                        <th :style="{ width: '12%' }">账号分组</th>
                        <th :style="{ width: '20%' }">可用成员</th>
                        <th :style="{ width: '16%' }">更新时间</th>
                        <th :style="{ width: '12%' }">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="a in f.accts" :key="a.acctId">
                        <td>{{ a.acctId }}</td>
                        <td>{{ a.login }}</td>
                        <td>{{ a.acctType }}</td>
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
      <!-- 分页（静态呈现，同店铺商品列表口径） -->
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 226 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '200条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn">2</button>
          <button class="ib-pagebtn">3</button>
          <button class="ib-pagebtn">4</button>
          <button class="ib-pagebtn">5</button>
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
  </div>
</template>
