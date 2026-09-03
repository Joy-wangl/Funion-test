<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import BeeDetail from './BeeDetail.vue';
import { pushToast } from '../../components/toast';
import { BEE_PLATFORMS, BEE_PLATFORM_LOGO, beeProducts, beeShops, beeStrategies, createPubTasks, shipTimeLabel } from './data';
import type { BeeProduct, BeeShop, BeeStrategy } from './data';

const props = defineProps<{ userName: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const rows = ref<BeeProduct[]>([...beeProducts]);

/* 筛选：输入态 filter + 应用态 applied（点查询生效，与运营中心一致） */
const emptyFilter = { kw: '', platform: '全部平台', status: '全部' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });

const filtered = computed(() => rows.value.filter((p) => {
  if (applied.value.kw && !p.title.includes(applied.value.kw)) return false;
  if (applied.value.platform !== '全部平台' && p.platform !== applied.value.platform) return false;
  if (applied.value.status === '已完善' && !p.complete) return false;
  if (applied.value.status === '未完善' && p.complete) return false;
  return true;
}));

/* 分页 */
const page = ref(1);
const pageSize = ref(20);
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const onPageSize = (v: string) => { pageSize.value = Number(v); page.value = 1; };

/* 勾选 */
const checked = ref<Set<string>>(new Set());
const allChecked = computed(() => paged.value.length > 0 && paged.value.every((p) => checked.value.has(p.id)));
const toggleCheck = (id: string) => {
  const n = new Set(checked.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  checked.value = n;
};
const toggleAll = () => {
  const n = new Set(checked.value);
  paged.value.forEach((p) => { if (allChecked.value) n.delete(p.id); else n.add(p.id); });
  checked.value = n;
};

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
  pushToast('链接已复制');
};

/* 删除：危险操作，单条/批量统一二次确认弹窗 */
const delConfirm = ref<{ batch: boolean; target?: BeeProduct } | null>(null);
const confirmDel = () => {
  const c = delConfirm.value;
  if (!c) return;
  if (c.batch) {
    const n = checked.value.size;
    rows.value = rows.value.filter((p) => !checked.value.has(p.id));
    pushToast(`已删除 ${n} 件商品`);
    checked.value = new Set();
  } else if (c.target) {
    rows.value = rows.value.filter((x) => x.id !== c.target!.id);
    const n = new Set(checked.value);
    n.delete(c.target!.id);
    checked.value = n;
    pushToast('已删除该商品');
  }
  delConfirm.value = null;
};

/* 铺货任务：仅已完善商品可发起；两步流——先选策略，再按策略平台勾选已登录店铺 */
const pubOpen = ref(false);
const pubItems = ref<BeeProduct[]>([]);
const pubStep = ref<1 | 2>(1);
const pubStrategyId = ref('');
const pubStrategy = computed(() => beeStrategies.find((s) => s.id === pubStrategyId.value));
/* 策略卡摘要：定价方式 / 发货时效，辅助字号展示 */
const stratMeta = (st: BeeStrategy) => [
  st.priceMode === 'rate' ? `控利润率 ${st.rate}%` : `控利润 ${st.profit} 元`,
  shipTimeLabel(st.shipTime),
].join(' · ');
const pubShopIds = ref<Set<string>>(new Set());
const okShops = computed(() => beeShops.filter((s) => s.login === 'ok'));
const openPub = (items: BeeProduct[]) => {
  const bad = items.filter((x) => !x.complete).length;
  if (bad > 0) { pushToast(`所选商品还有 ${bad} 件未完善，请先完善再发起铺货`, 'error'); return; }
  pubItems.value = items;
  pubStep.value = 1;
  pubStrategyId.value = '';
  pubShopIds.value = new Set();
  pubKw.value = '';
  pubPlat.value = '全部平台';
  pubCollapsed.value = new Set();
  pubOpen.value = true;
};
const batchPub = () => openPub(rows.value.filter((p) => checked.value.has(p.id)));
const togglePubShop = (id: string) => {
  const n = new Set(pubShopIds.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  pubShopIds.value = n;
};
/* 店铺量大：名称搜索 + 平台筛选（限策略平台），按平台分组且可折叠，组头复选框整组勾选 */
const pubKw = ref('');
const pubPlat = ref('全部平台');
const pubCollapsed = ref<Set<string>>(new Set());
const pubPlatOpts = computed(() => ['全部平台', ...(pubStrategy.value?.platforms ?? [])]);
/* 进入第二步：店铺范围限定为策略平台，默认勾选首个已登录店铺 */
const goPubStep2 = () => {
  const st = pubStrategy.value;
  if (!st) return;
  pubStep.value = 2;
  pubKw.value = '';
  pubPlat.value = '全部平台';
  pubCollapsed.value = new Set();
  const eligible = okShops.value.filter((s) => st.platforms.includes(s.platform));
  pubShopIds.value = new Set(eligible.slice(0, 1).map((s) => s.id));
};
const pubGroups = computed(() => {
  const plats = pubStrategy.value?.platforms ?? [];
  const kw = pubKw.value.trim();
  const list = okShops.value.filter((s) => plats.includes(s.platform) && (pubPlat.value === '全部平台' || s.platform === pubPlat.value) && (!kw || s.name.includes(kw)));
  const groups: { platform: string; shops: BeeShop[] }[] = [];
  for (const s of list) {
    const g = groups.find((x) => x.platform === s.platform);
    if (g) g.shops.push(s); else groups.push({ platform: s.platform, shops: [s] });
  }
  return groups;
});
const groupAllOn = (shops: BeeShop[]) => shops.length > 0 && shops.every((s) => pubShopIds.value.has(s.id));
const togglePubGroup = (platform: string) => {
  const n = new Set(pubCollapsed.value);
  if (n.has(platform)) n.delete(platform); else n.add(platform);
  pubCollapsed.value = n;
};
const togglePubGroupShops = (shops: BeeShop[], on: boolean) => {
  const n = new Set(pubShopIds.value);
  shops.forEach((s) => { if (on) n.add(s.id); else n.delete(s.id); });
  pubShopIds.value = n;
};
const submitPub = () => {
  if (pubShopIds.value.size === 0) { pushToast('请至少选择一个铺货店铺', 'error'); return; }
  createPubTasks(pubItems.value, okShops.value.filter((s) => pubShopIds.value.has(s.id)));
  pubOpen.value = false;
  pushToast(`铺货任务已发起：${pubItems.value.length} 件商品 → ${pubShopIds.value.size} 个店铺，可在任务管理查看`);
  checked.value = new Set();
};

/* 商品详情：铺货前的查看入口，宽弹窗千牛发布式布局 */
const detailTarget = ref<BeeProduct | null>(null);

/* ESC 优先关闭内层弹窗 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (pubOpen.value) pubOpen.value = false;
  else if (detailTarget.value) detailTarget.value = null;
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="bp-page">
    <!-- 顶栏 -->
    <div class="bp-head">
      <span class="bee-logo">🐝</span>
      <span class="bp-title">蜜蜂搬家 · 选品库</span>
      <div class="bp-head-r">
        <span class="bp-user">{{ userName }}</span>
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="bp-body">
      <!-- 筛选栏 -->
      <div class="bp-filter">
        <div class="bp-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input v-model="filter.kw" placeholder="搜索商品标题..." @keyup.enter="applied = { ...filter }; page = 1" />
        </div>
        <BubbleSelect
          class-name="bp-select"
          :value="filter.platform"
          :options="['全部平台', ...BEE_PLATFORMS]"
          @change="(v: string) => { filter.platform = v; }"
        />
        <div class="bp-seg">
          <button v-for="s in ['全部', '未完善', '已完善']" :key="s" :class="filter.status === s ? 'active' : ''" @click="filter.status = s">
            {{ s }}
          </button>
        </div>
        <button class="bp-btn primary" @click="applied = { ...filter }; page = 1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          查询
        </button>
        <button class="bp-btn" @click="filter = { ...emptyFilter }; applied = { ...emptyFilter }; page = 1">
          重置
        </button>
      </div>

      <!-- 工具栏：铺货为出口，导出殿后；选品动作在列表外完成 -->
      <div class="bp-toolbar">
        <button class="bp-btn primary" :disabled="checked.size === 0" @click="batchPub">批量铺货</button>
        <button class="bp-btn danger" :disabled="checked.size === 0" @click="delConfirm = { batch: true }">批量删除</button>
        <button class="bp-btn" @click="pushToast('导出任务已创建（演示）')">导出</button>
      </div>

      <!-- 列表 -->
      <div class="bp-card">
        <table class="bp-table">
          <thead>
            <tr>
              <th style="width: 40px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
              <th style="width: 76px">商品主图</th>
              <th>商品名称</th>
              <th style="width: 240px">商品链接</th>
              <th style="width: 100px">平台</th>
              <th style="width: 140px">导入时间</th>
              <th style="width: 90px">完善状态</th>
              <th style="width: 110px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in paged" :key="p.id">
              <td><input type="checkbox" :checked="checked.has(p.id)" @change="toggleCheck(p.id)" /></td>
              <td><img class="bp-thumb" :src="p.img" alt="" /></td>
              <td><div class="bp-name"><Ellipsis :text="p.title" /></div></td>
              <td>
                <span class="bp-linkwrap">
                  <a class="bp-link" :title="p.link" :href="p.link" target="_blank" rel="noreferrer">{{ p.link }}</a>
                  <button class="bp-copytip" title="复制链接" @click="copy(p.link)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                  </button>
                </span>
              </td>
              <td>
                <span class="bp-plat">
                  <img :src="BEE_PLATFORM_LOGO[p.platform]" alt="" />
                  {{ p.platform }}
                </span>
              </td>
              <td class="bp-time">{{ p.importTime }}</td>
              <td>
                <span class="bp-tag" :class="p.complete ? 'ok' : 'no'">{{ p.complete ? '已完善' : '未完善' }}</span>
              </td>
              <td>
                <div class="bp-acts">
                  <a href="javascript:void(0)" @click.prevent="detailTarget = p">详情</a>
                  <!-- 待完善＝资料未维护，不展示发布；资料维护入口在商品名称点击 -->
                  <a v-if="p.complete" href="javascript:void(0)" @click.prevent="openPub([p])">发布</a>
                  <a class="del" href="javascript:void(0)" @click.prevent="delConfirm = { batch: false, target: p }">删除</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 空态 -->
        <div v-if="filtered.length === 0" class="bp-empty">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8L12 3z" /></svg>
          <div class="bp-empty-t">暂无商品数据</div>
          <div class="bp-empty-s">选品库为空时，可先通过悬浮气泡采集商品；也可以调整筛选条件</div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="bp-pager">
        <span>共 {{ filtered.length }} 条</span>
        <select class="bp-ps" :value="pageSize" @change="onPageSize(($event.target as HTMLSelectElement).value)">
          <option :value="10">10条/页</option>
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
        </select>
        <button class="bp-pg" :disabled="page <= 1" @click="page--">‹</button>
        <span class="bp-pn">{{ page }}</span>
        <button class="bp-pg" :disabled="page >= pages" @click="page++">›</button>
        <span class="bp-goto">前往</span>
        <input class="bp-gi" :value="page" @change="page = Math.min(pages, Math.max(1, Number(($event.target as HTMLInputElement).value) || 1))" />
        <span>页</span>
      </div>
    </div>

    <!-- 商品详情弹窗（宽版） -->
    <div v-if="detailTarget" class="bee-mask" @click.self="detailTarget = null">
      <BeeDetail
        :product="detailTarget"
        @close="detailTarget = null"
        @pub="(p) => { detailTarget = null; openPub([p]); }"
      />
    </div>

    <!-- 删除二次确认（单条/批量共用） -->
    <div v-if="delConfirm" class="bee-mask" @click.self="delConfirm = null">
      <div class="bee-modal small">
        <div class="bm-head"><b>删除商品</b></div>
        <p class="st-del-t">{{ delConfirm.batch ? `确认删除所选 ${checked.size} 件商品？删除后不可恢复` : `确认删除「${delConfirm.target?.title}」？删除后不可恢复` }}</p>
        <div class="bm-foot">
          <button class="bp-btn" @click="delConfirm = null">取消</button>
          <button class="bp-btn danger" @click="confirmDel">删除</button>
        </div>
      </div>
    </div>

    <!-- 发起铺货任务弹窗：两步（先选策略 → 按策略平台选店铺），两步共用固定高度不改变弹窗尺寸 -->
    <div v-if="pubOpen" class="bee-mask" @click.self="pubOpen = false">
      <div class="bee-modal pub">
        <div class="bm-head">
          <b>批量铺货 · {{ pubItems.length }} 件商品</b>
          <button class="bp-close" @click="pubOpen = false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="bm-body">
          <!-- 第一步：选择铺货策略 -->
          <div v-if="pubStep === 1" class="bm-pubstep">
            <div class="bm-pubtip">第 1/2 步 · 选择铺货策略（下一步按策略平台筛选店铺）</div>
            <div class="bm-strats">
              <label v-for="st in beeStrategies" :key="st.id" class="bm-strat" :class="{ on: pubStrategyId === st.id }">
                <input type="radio" :checked="pubStrategyId === st.id" @change="pubStrategyId = st.id" />
                <span class="bm-strat-main">
                  <span class="nm">{{ st.name }}</span>
                  <span class="meta">{{ stratMeta(st) }}</span>
                </span>
                <span class="st-plats">
                  <span v-for="pl in st.platforms" :key="pl" class="bp-plat"><img :src="BEE_PLATFORM_LOGO[pl]" alt="" />{{ pl }}</span>
                </span>
              </label>
              <div v-if="beeStrategies.length === 0" class="bm-pubempty">暂无可用策略，请先在策略管理创建</div>
            </div>
          </div>
          <!-- 第二步：按策略平台选择店铺 -->
          <div v-else class="bm-pubstep">
            <div class="bm-pubtip">第 2/2 步 · 选择铺货店铺（仅显示策略「{{ pubStrategy?.name }}」平台的已登录店铺）</div>
            <div class="bm-pubfilter">
              <div class="bp-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input v-model="pubKw" placeholder="店铺名称" />
              </div>
              <BubbleSelect
                class-name="bm-select"
                :value="pubPlat"
                :options="pubPlatOpts"
                @change="(v: string) => { pubPlat = v; }"
              />
            </div>
            <div class="bm-shops2">
              <div v-for="g in pubGroups" :key="g.platform" class="bm-pgroup">
                <div class="bm-pg-head">
                  <input type="checkbox" :checked="groupAllOn(g.shops)" @change="togglePubGroupShops(g.shops, !groupAllOn(g.shops))" />
                  <img :src="BEE_PLATFORM_LOGO[g.platform]" alt="" />
                  <b>{{ g.platform }}</b>
                  <span class="cnt">{{ g.shops.length }}</span>
                  <button class="caret" :class="{ closed: pubCollapsed.has(g.platform) }" title="折叠/展开" @click="togglePubGroup(g.platform)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
                <template v-if="!pubCollapsed.has(g.platform)">
                  <label v-for="s in g.shops" :key="s.id" class="bm-shop" :class="{ on: pubShopIds.has(s.id) }">
                    <input type="checkbox" :checked="pubShopIds.has(s.id)" @change="togglePubShop(s.id)" />
                    <img :src="BEE_PLATFORM_LOGO[s.platform]" alt="" />
                    <span class="st2">{{ s.platform }}</span>
                    <span>{{ s.name }}</span>
                  </label>
                </template>
              </div>
              <div v-if="pubGroups.length === 0" class="bm-pubempty">该策略平台下暂无已登录店铺</div>
            </div>
          </div>
        </div>
        <div class="bm-foot">
          <button class="bp-btn" @click="pubOpen = false">取消</button>
          <button v-if="pubStep === 2" class="bp-btn" @click="pubStep = 1">上一步</button>
          <button v-if="pubStep === 1" class="bp-btn primary" :disabled="!pubStrategyId" @click="goPubStep2">下一步</button>
          <button v-else class="bp-btn primary" @click="submitPub">发起铺货</button>
        </div>
      </div>
    </div>
  </div>
</template>
