<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';

type CrawlStatus = '待完善' | '已完善' | '已导入';
interface MkRow {
  id: string;
  name: string;
  img: string;
  link?: string;
  shop: string;
  crawler: string;
  time: string;
  status: CrawlStatus;
}

/* 市场商机：淘宝顺买 / 小店商机 两个列表页（还原原型） */
const TABS = [
  { key: 'taobao', label: '淘宝顺买' },
  { key: 'xiaodian', label: '小店商机' },
] as const;
type TabKey = (typeof TABS)[number]['key'];
const tab = ref<TabKey>('taobao');

const taobaoRows: MkRow[] = [
  { id: 't1', name: '【10A抗菌】桂枫3.0Pro玻尿酸凉感深睡重力被 夏凉被', img: '/products/main.png', link: 'https://detail.tmall.com/item.htm?id=806256225501', shop: '白屿家居小铺', crawler: '李昀川', time: '2026-08-23 18:42:10', status: '待完善' },
  { id: 't2', name: '免打孔置物架卫生间浴室壁挂收纳架厨房杂物架', img: '/products/serum.png', link: 'https://detail.tmall.com/item.htm?id=806256225502', shop: '乐居家品旗舰店', crawler: '王思远', time: '2026-08-23 16:21:33', status: '已完善' },
  { id: 't3', name: '316不锈钢保温杯大容量车载水杯男女便携直饮', img: '/products/main.png', link: 'https://detail.tmall.com/item.htm?id=806256225503', shop: '臻品厨具专营店', crawler: '王思远', time: '2026-08-23 11:35:20', status: '已导入' },
];
const xiaodianRows: MkRow[] = [
  { id: 'x1', name: '致奇（送辅助液）明星同款叶黄素艾草蒸汽眼罩20贴', img: '/products/serum.png', shop: '朵拉优选日用', crawler: '李昀川', time: '2026-08-23 18:40:55', status: '待完善' },
  { id: 'x2', name: '智能感应夜灯人体感应小夜灯卧室床头起夜灯', img: '/products/main.png', shop: '暖光照明工厂店', crawler: '陈晓', time: '2026-08-23 15:07:48', status: '待完善' },
];

/* 筛选：商品信息 / 店铺名称 / 抓取人 / 抓取状态 / 抓取时间 */
const empty = { info: '', shop: '', crawler: '', status: '全部', from: '2026-08-23', to: '2026-08-29' };
const filter = ref({ ...empty });
const applied = ref({ ...empty });
const timeSort = ref<'none' | 'asc' | 'desc'>('none');

const switchTab = (k: TabKey) => {
  tab.value = k;
  filter.value = { ...empty };
  applied.value = { ...empty };
  timeSort.value = 'none';
};

const list = computed(() => {
  const rows = tab.value === 'taobao' ? taobaoRows : xiaodianRows;
  const arr = rows.filter((r) => {
    if (applied.value.info && !r.name.includes(applied.value.info) && !(r.link || '').includes(applied.value.info)) return false;
    if (applied.value.shop && !r.shop.includes(applied.value.shop)) return false;
    if (applied.value.crawler && !r.crawler.includes(applied.value.crawler)) return false;
    if (applied.value.status !== '全部' && r.status !== applied.value.status) return false;
    if (applied.value.from && r.time.slice(0, 10) < applied.value.from) return false;
    if (applied.value.to && r.time.slice(0, 10) > applied.value.to) return false;
    return true;
  });
  if (timeSort.value !== 'none') arr.sort((a, b) => (a.time < b.time ? -1 : 1) * (timeSort.value === 'asc' ? 1 : -1));
  return arr;
});

const statusCls = (s: CrawlStatus) => (s === '已完善' ? 'green' : s === '已导入' ? 'blue' : 'orange');

/* 导入到：与竞价商品同款 add-pop 气泡（淘宝 / 视频号） */
const addTip = ref<{ x: number; y: number } | null>(null);
const openAddTip = (e: MouseEvent) => {
  addTip.value = { x: e.clientX + 4, y: e.clientY + 4 };
};

/* 全网搜索：跳转商机中心-全网搜索页 */
const opsGo = inject<(target: 'search') => void>('opsGo');
/* 前往顺买商机应用：跨应用切换顶层 tab（App 层 provide） */
const goApp = inject<(key: string) => void>('goApp');
</script>

<template>
  <div class="sg-page mk-page">
    <div class="mk2-top">
      <div class="mk2-seg">
        <div v-for="t in TABS" :key="t.key" class="mk2-tab" :class="{ active: tab === t.key }" @click="switchTab(t.key)">{{ t.label }}</div>
      </div>
      <div class="mk2-top-acts">
        <button class="sg-btn" @click="goApp?.('shunmai')">前往顺买商机应用</button>
        <button class="sg-btn primary" @click="pushToast('列表已刷新')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
          刷新
        </button>
      </div>
    </div>

    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>商品信息</label>
          <input class="sg-input" placeholder="请输入商品信息" :value="filter.info" @input="filter = { ...filter, info: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="sg-field">
          <label>店铺名称</label>
          <input class="sg-input" placeholder="请输入店铺名称" :value="filter.shop" @input="filter = { ...filter, shop: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="sg-field">
          <label>{{ tab === 'xiaodian' ? '创建人' : '抓取人' }}</label>
          <input class="sg-input" :placeholder="tab === 'xiaodian' ? '请输入创建人' : '请输入抓取人'" :value="filter.crawler" @input="filter = { ...filter, crawler: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="sg-field">
          <label>抓取状态</label>
          <BubbleSelect class-name="sg-select" :value="filter.status" :options="['全部', '待完善', '已完善', '已导入']" @change="(v: string) => filter = { ...filter, status: v }" />
        </div>
        <div class="sg-field">
          <label>{{ tab === 'xiaodian' ? '创建时间' : '抓取时间' }}</label>
          <div class="mk2-range">
            <input class="sg-input" type="date" :value="filter.from" @input="filter = { ...filter, from: ($event.target as HTMLInputElement).value }" />
            <span>→</span>
            <input class="sg-input" type="date" :value="filter.to" @input="filter = { ...filter, to: ($event.target as HTMLInputElement).value }" />
          </div>
        </div>
        <div class="sg-actions">
          <button class="sg-btn" @click="pushToast('批量导入：演示环境暂不可用')">
            批量导入
          </button>
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
              <th>商品信息</th>
              <th :style="{ width: '14%' }">店铺</th>
              <th :style="{ width: '10%' }">{{ tab === 'xiaodian' ? '创建人' : '抓取人' }}</th>
              <SortTh :label="tab === 'xiaodian' ? '创建时间' : '抓取时间'" width="16%" :state="timeSort" @sort="timeSort = timeSort === 'asc' ? 'desc' : 'asc'" />
              <th v-if="tab === 'xiaodian'" :style="{ width: '10%' }">抓取状态</th>
              <th :style="{ width: '10%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list" :key="r.id">
              <td><input type="checkbox" /></td>
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="r.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle mk-gtitle"><Ellipsis :text="r.name" /></div>
                    <div v-if="r.link" class="mk2-clink">
                      <span>竞品链接:</span>
                      <a class="sg-link" :href="r.link" target="_blank" rel="noreferrer">{{ r.link }}</a>
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ r.shop }}</td>
              <td>{{ r.crawler }}</td>
              <td>{{ r.time }}</td>
              <td v-if="tab === 'xiaodian'"><span class="sgd-tag" :class="statusCls(r.status)">{{ r.status }}</span></td>
              <td class="actions-col">
                <a v-if="tab === 'xiaodian'" href="#" @click.prevent="pushToast('详情：演示环境暂不可用')">详情</a>
                <a href="#" @click.prevent="opsGo?.('search')">全网搜索</a>
                <a href="#" @click.prevent.stop="openAddTip">导入到</a>
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
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ list.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="10条/页" :options="['10条/页', '20条/页', '50条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="addTip"
        class="add-pop"
        :style="{ left: `${addTip.x}px`, top: `${addTip.y}px` }"
        @mousedown.stop
      >
        <div v-for="t in ['淘宝', '视频号']" :key="t" class="add-pop-item" @click="addTip = null; pushToast(`已导入到${t}`)">
          {{ t }}
        </div>
      </div>
    </Teleport>
  </div>
</template>
