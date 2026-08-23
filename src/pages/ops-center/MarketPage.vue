<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import { PLATFORM_LOGO } from './data';

interface MkRow {
  id: string;
  name: string;
  img: string;
  platform: string;
  realtime: number;
  week7: number;
  status: '待取样' | '已取样';
  category: string;
}

const rows: MkRow[] = [
  { id: '1', name: '水果刀削皮刀便携倒钩苹果去皮神器家用拼接款', img: '/products/main.png', platform: '快手', realtime: 0, week7: 12087, status: '待取样', category: '厨房/烹饪用具/刀具' },
  { id: '2', name: '益智魔块3d立体拼图3到6岁动物趣味恐龙拼装', img: '/products/serum.png', platform: '抖音', realtime: 12, week7: 11875, status: '已取样', category: '拼玩用品/礼品/创意' },
  { id: '3', name: 'PERDORA 玻尿酸修护精华液 补水保湿舒缓敏感肌 30ml 装', img: '/products/serum.png', platform: '淘宝', realtime: 86, week7: 9642, status: '待取样', category: '美妆个护/面部护理/精华液' },
  { id: '4', name: '德国指甲剪刀套装全套耳勺指甲刀指甲钳修剪专用斜口', img: '/products/main.png', platform: '天猫', realtime: 45, week7: 8210, status: '已取样', category: '家庭/个人清洁工具/美甲用品' },
  { id: '5', name: '多功能料理机家用小型榨汁机便携果汁杯', img: '/products/main.png', platform: '拼多多', realtime: 8, week7: 7455, status: '待取样', category: '厨房电器/料理机' },
  { id: '6', name: '厨房置物架台面调料收纳架免打孔', img: '/products/main.png', platform: '淘宝', realtime: 3, week7: 6120, status: '已取样', category: '厨房/烹饪用具/厨用收纳' },
  { id: '7', name: '保湿面霜补水滋润秋冬护肤乳液', img: '/products/serum.png', platform: '抖音', realtime: 21, week7: 5308, status: '待取样', category: '美妆个护/面部护理/乳液面霜' },
  { id: '8', name: '儿童积木大颗粒拼装男孩女孩益智玩具', img: '/products/serum.png', platform: '拼多多', realtime: 0, week7: 4217, status: '已取样', category: '拼玩用品/积木/拼装' },
];

/** 平台商机（外部商机-市场商机）：列表 + 查询条件 */
const empty = { name: '', platform: '全部平台', status: '全部', category: '' };
const filter = ref({ ...empty });
const applied = ref({ ...empty });

/* 立即抓取抽屉 */
type Pick = { on: boolean; qty: string };
const initPicks = (): Record<string, Pick> => ({ 淘宝: { on: false, qty: '' }, 拼多多: { on: false, qty: '' }, 天猫: { on: false, qty: '' } });
const drawer = ref<MkRow | null>(null);
const picks = ref<Record<string, Pick>>(initPicks());

const list = computed(() =>
  rows.filter((r) => {
    if (applied.value.name && !r.name.includes(applied.value.name)) return false;
    if (applied.value.platform !== '全部平台' && r.platform !== applied.value.platform) return false;
    if (applied.value.status !== '全部' && r.status !== applied.value.status) return false;
    if (applied.value.category && !r.category.includes(applied.value.category)) return false;
    return true;
  }),
);
</script>

<template>
  <div class="sg-page mk-page">
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>商品名称</label>
          <input class="sg-input" placeholder="请输入商品名称" :value="filter.name" @input="filter = { ...filter, name: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="sg-field">
          <label>平台</label>
          <BubbleSelect class-name="sg-select" :value="filter.platform" :options="['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手']" @change="(v: string) => filter = { ...filter, platform: v }" />
        </div>
        <div class="sg-field">
          <label>状态</label>
          <BubbleSelect class-name="sg-select" :value="filter.status" :options="['全部', '待取样', '已取样']" @change="(v: string) => filter = { ...filter, status: v }" />
        </div>
        <div class="sg-field">
          <label>类目</label>
          <input class="sg-input" placeholder="请输入类目" :value="filter.category" @input="filter = { ...filter, category: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="sg-actions">
          <button class="sg-btn" @click="filter = { ...empty }; applied = { ...empty }">
            重置
          </button>
          <button class="sg-btn primary" @click="applied = { ...filter }">
            查询
          </button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table mk-table">
          <thead>
            <tr>
              <th :style="{ width: '44px' }"><input type="checkbox" /></th>
              <th :style="{ width: '60px' }">序号</th>
              <th>商品信息</th>
              <th :style="{ width: '100px' }">实时销量</th>
              <th :style="{ width: '110px' }">近7日销量</th>
              <th :style="{ width: '100px' }">状态</th>
              <th :style="{ width: '220px' }">类目</th>
              <th :style="{ width: '100px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in list" :key="r.id">
              <td><input type="checkbox" /></td>
              <td>{{ i + 1 }}</td>
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="r.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle mk-gtitle"><Ellipsis :text="r.name" /></div>
                    <div class="sg-gid mk-platform">
                      <span class="store-logo"><img :src="PLATFORM_LOGO[r.platform]" alt="" /></span>
                      {{ r.platform }}
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ r.realtime }}</td>
              <td>{{ r.week7.toLocaleString() }}</td>
              <td>
                <span class="sgd-tag" :class="r.status === '已取样' ? 'green' : 'orange'">{{ r.status }}</span>
              </td>
              <td><Ellipsis :text="r.category" /></td>
              <td>
                <a
                  v-if="r.status === '待取样'"
                  class="sg-link"
                  href="javascript:void(0)"
                  @click.prevent="picks = initPicks(); drawer = r"
                >
                  立即抓取
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="list.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="drawer" class="mk-mask" @click="drawer = null">
      <div class="mk-drawer" @click.stop>
        <div class="mk-drawer-head">
          <span>立即抓取</span>
          <button class="mk-close" @click="drawer = null">×</button>
        </div>
        <div class="mk-drawer-body">
          <div class="sg-goods">
            <img class="sg-thumb" :src="drawer.img" alt="" />
            <div class="sg-ginfo">
              <div class="sg-gtitle mk-gtitle"><Ellipsis :text="drawer.name" /></div>
            </div>
          </div>
          <div class="mk-drawer-sec">请选择平台</div>
          <div v-for="pl in (['淘宝', '拼多多', '天猫'] as const)" :key="pl" class="mk-plat-row">
            <label class="mk-plat-check">
              <input
                type="checkbox"
                :checked="picks[pl].on"
                @change="picks = { ...picks, [pl]: { ...picks[pl], on: ($event.target as HTMLInputElement).checked } }"
              />
              <span class="store-logo"><img :src="PLATFORM_LOGO[pl]" alt="" /></span>
              {{ pl }}
            </label>
            <input
              class="sg-input mk-qty"
              type="number"
              min="1"
              placeholder="请输入链接数量"
              :value="picks[pl].qty"
              :disabled="!picks[pl].on"
              @input="picks = { ...picks, [pl]: { ...picks[pl], qty: ($event.target as HTMLInputElement).value } }"
            />
          </div>
        </div>
        <div class="mk-drawer-foot">
          <button class="sg-btn" @click="drawer = null">取消</button>
          <button class="sg-btn primary" @click="drawer = null">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>
