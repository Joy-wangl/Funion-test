<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { IconCheck, IconSearch } from './permIcons';
import { PERM_PLAT_SHOPS } from './permScope';

/* ---------- 可见/可管理平台、店铺配置弹窗：左栏平台层级（下级钻入店铺页），右栏已选店铺清单 ---------- */
const props = defineProps<{ title: string; sub: string; sel: string[]; allPlats: string[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', shops: string[], allPlats: string[]): void }>();

/* 平台官方图标：复用官方 logo 资源；阿里巴巴/微信视频号小店无资源，同运营中心 wxLogo 口径用圆角矩形字标 */
const aliLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#ff6a00"/><text x="16" y="22" font-size="15" fill="#fff" text-anchor="middle" font-family="sans-serif">阿</text></svg>');
const wxLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#fa9a3e"/><text x="16" y="22" font-size="15" fill="#fff" text-anchor="middle" font-family="sans-serif">视</text></svg>');
const PLAT_LOGO: Record<string, string> = {
  阿里巴巴: aliLogo,
  抖音: '/logos/douyin.png',
  京东: '/logos/jd.png',
  快手: '/logos/kuaishou.png',
  拼多多: '/logos/pinduoduo.png',
  淘宝: '/logos/taobao.png',
  天猫: '/logos/tmall.png',
  微信视频号小店: wxLogo,
};

const picked = ref<Set<string>>(new Set(props.sel));
/* 「全部店铺」标记平台：其下新增店铺自动纳入；与单店勾选冲突（取消任一店铺即清除标记） */
const allSet = ref<Set<string>>(new Set(props.allPlats));
const allShops = PERM_PLAT_SHOPS.flatMap((p) => p.shops);
const platOfShop = (s: string) => PERM_PLAT_SHOPS.find((p) => p.shops.includes(s))?.platform;

const toggleShops = (shops: string[], checked: boolean) => {
  const next = new Set(picked.value);
  shops.forEach((s) => {
    if (checked) next.add(s);
    else next.delete(s);
  });
  picked.value = next;
  /* 冲突规则：取消勾选任一店铺，即清除其所属平台的「全部店铺」标记 */
  if (!checked) {
    const flags = new Set(allSet.value);
    let hit = false;
    shops.forEach((s) => {
      const pl = platOfShop(s);
      if (pl && flags.delete(pl)) hit = true;
    });
    if (hit) allSet.value = flags;
  }
};
const toggleShop = (shop: string, checked: boolean) => toggleShops([shop], checked);
/* 全部店铺：勾选＝全选平台旗下店铺并置标记；取消＝清除标记并全不选 */
const toggleAllShops = (plat: string, checked: boolean) => {
  const shops = PERM_PLAT_SHOPS.find((p) => p.platform === plat)?.shops ?? [];
  toggleShops(shops, checked);
  if (checked) {
    const flags = new Set(allSet.value);
    flags.add(plat);
    allSet.value = flags;
  }
};
/* 一键清除已选 */
const clearPicked = () => {
  picked.value = new Set();
  allSet.value = new Set();
};

/* 下级钻入：左栏切换为该平台店铺页，面包屑回平台层；搜索仅作用于当前层 */
const drillPlat = ref<string | null>(null);
const kw = ref('');
const kwTrim = computed(() => kw.value.trim());
const enterPlat = (p: string) => {
  drillPlat.value = p;
  kw.value = '';
};
const backRoot = () => {
  drillPlat.value = null;
  kw.value = '';
};

const visiblePlats = computed(() =>
  PERM_PLAT_SHOPS.filter((p) => !kwTrim.value || p.platform.includes(kwTrim.value)),
);
const drillShops = computed(() => {
  const p = PERM_PLAT_SHOPS.find((x) => x.platform === drillPlat.value);
  if (!p) return [];
  return kwTrim.value ? p.shops.filter((s) => s.includes(kwTrim.value)) : p.shops;
});

/* 全选：作用于当前可见行（平台层=可见平台全部店铺，店铺层=可见店铺） */
const viewShops = computed(() => (drillPlat.value ? drillShops.value : visiblePlats.value.flatMap((p) => p.shops)));
const allChecked = computed(() => viewShops.value.length > 0 && viewShops.value.every((s) => picked.value.has(s)));
const allIndet = computed(() => !allChecked.value && viewShops.value.some((s) => picked.value.has(s)));

/* 右栏：已选店铺按平台池顺序平铺，取消勾选即移除 */
const selShops = computed(() => allShops.filter((s) => picked.value.has(s)));
</script>

<template>
  <Modal :title="title" :sub="sub" size="lg" @close="emit('close')">
    <div class="picker">
      <div class="picker-left">
        <div class="input-icon">
          <span class="ic"><IconSearch /></span>
          <input v-model="kw" class="input" :placeholder="drillPlat ? '搜索店铺名称' : '搜索'" />
          <!-- 清除钮：框内右侧实心灰圆× 有值才显（全局查询清除规范） -->
          <button v-if="kw" type="button" class="pk-kwclear" title="清除" @click="kw = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </div>
        <div v-if="drillPlat" class="pk-crumb">
          <span class="root" @click="backRoot">平台</span>
          <span class="sep">&gt;</span>
          <span class="cur">{{ drillPlat }}</span>
        </div>
        <div v-else class="pk-seclabel">平台</div>
        <label class="checkbox pk-all">
          <input type="checkbox" :checked="allChecked" :indeterminate="allIndet" @change="toggleShops(viewShops, ($event.target as HTMLInputElement).checked)" />
          <span class="box"><IconCheck /></span>全选
        </label>
        <!-- 店铺层专属：全部店铺（增量店铺自动纳入） -->
        <label v-if="drillPlat" class="checkbox pk-all">
          <input type="checkbox" :checked="allSet.has(drillPlat)" @change="toggleAllShops(drillPlat, ($event.target as HTMLInputElement).checked)" />
          <span class="box"><IconCheck /></span>全部店铺
          <span class="pk-allshop-note">新增店铺时自动选中</span>
        </label>
        <div class="pk-list">
          <template v-if="drillPlat">
            <template v-if="drillShops.length">
              <label v-for="s in drillShops" :key="s" class="checkbox pk-row pk-shop-row">
                <input type="checkbox" :checked="picked.has(s)" @change="toggleShop(s, ($event.target as HTMLInputElement).checked)" />
                <span class="box"><IconCheck /></span>
                <span class="nm">{{ s }}</span>
              </label>
            </template>
            <div v-else class="empty md">无匹配店铺</div>
          </template>
          <template v-else-if="visiblePlats.length">
            <label v-for="p in visiblePlats" :key="p.platform" class="checkbox pk-row pk-plat-row">
              <input
                type="checkbox"
                :checked="p.shops.every((s) => picked.has(s))"
                :indeterminate="p.shops.some((s) => picked.has(s)) && !p.shops.every((s) => picked.has(s))"
                @change="toggleShops(p.shops, ($event.target as HTMLInputElement).checked)"
              />
              <span class="box"><IconCheck /></span>
              <span class="p-ic"><img :src="PLAT_LOGO[p.platform]" :alt="p.platform" /></span>
              <span class="nm">{{ p.platform }}</span>
              <span class="pk-sublink" title="进入下级" @click.prevent.stop="enterPlat(p.platform)">下级</span>
            </label>
          </template>
          <div v-else class="empty md">无匹配平台</div>
        </div>
      </div>
      <div class="picker-right">
        <div class="pk-selhead">
          已选择店铺：
          <span v-if="picked.size" class="pk-clearlink" @click="clearPicked">清除</span>
        </div>
        <div class="pk-list">
          <span v-if="selShops.length === 0" class="dash">暂未选择</span>
          <label v-for="s in selShops" :key="s" class="checkbox pk-row pk-selrow">
            <input type="checkbox" :checked="true" @change="toggleShop(s, false)" />
            <span class="box"><IconCheck /></span>
            <span class="nm">{{ s }}</span>
          </label>
        </div>
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="emit('confirm', [...picked], [...allSet])">确定</button>
    </template>
  </Modal>
</template>
