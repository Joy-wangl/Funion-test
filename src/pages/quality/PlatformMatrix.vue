<script setup lang="ts">
/* ---------- 平台数据矩阵 ---------- */
import { computed } from 'vue';
import { PLATFORMS, pct, rateCls, type Platform, type PlatformStat } from './data';
import { CAT_COLOR, HEALTH_META, type TagBrief } from '../quality2/qc2Data';
import { deptsOfTypes } from './qcCenterData';
import PlatLogo from './PlatLogo.vue';
import ProbTags from './ProbTags.vue';

const props = withDefaults(defineProps<{
  stats: PlatformStat[];
  threshold: number;
  /** 各平台命中问题类型（类型 + 次数，降序） */
  problemHits?: Partial<Record<Platform, [string, number][]>>;
  /** 问题处理人工标记生效平台（'all'=全平台；数组=仅这些平台；null/缺省=未标记）：命中的平台行加「问题编码」标识 */
  markScopes?: Platform[] | 'all' | null;
  /** 各平台会话总数：提供时聊天风险率=聊天风险/会话总数（与列表行口径一致），缺省按订单量计 */
  chatTotals?: Partial<Record<Platform, number>>;
  /** 各平台评价数/差评数：提供时追加「评价数据」列（差评占比=差评数/评价数），合计恒等于行级 */
  reviews?: Partial<Record<Platform, { total: number; bad: number }>>;
  /** 是否展示最近订单列 */
  showLastOrder?: boolean;
  /** 比率列口径：退款率（默认）/ 售后率（售后率＝售后单÷订单量，列序改为 订单量｜售后单｜售后占比） */
  rateCol?: 'refund' | 'after';
  /** 线上壳：订单/聊天/评价以三复合列呈现（订单数据｜聊天数据｜评价数据），与监控列表行级复合列同口径同样式，替代平铺指标列 */
  grouped?: boolean;
  /** 系列级生效责任部门（线上壳）：各平台涉及部门标签命中该部门时加星标记（同行级「问题涉及部门」语言） */
  dutyDept?: string;
  /** 点击涉及部门标签：打开详情抽屉并选中该部门关联的全部问题类型（同行级交互） */
  onPickDept?: (dept: string) => void;
  /** 提供时追加健康等级 / 命中标签两列（按平台在售编码聚合） */
  tagBrief?: (pl: Platform) => TagBrief | null;
  /** 提供时展示操作列：聊天记录 */
  onChat?: (platform: Platform) => void;
  /** 提供时展示操作列：趋势图（平台维度） */
  onTrend?: (stat: PlatformStat) => void;
  /** 提供时展示操作列：关联ID（跳店铺商品并按当前商品编码口径查询） */
  onCodes?: () => void;
}>(), { showLastOrder: true, rateCol: 'refund', grouped: false });

const map = computed(() => new Map(props.stats.map((s) => [s.platform, s])));
/* 平台行按订单总数降序排列；无数据平台沉底（稳定排序保持其余相对序） */
const orderedPlats = computed(() =>
  [...PLATFORMS].sort((a, b) => (map.value.get(b)?.orders ?? -1) - (map.value.get(a)?.orders ?? -1)),
);
const tb = (pl: Platform) => props.tagBrief?.(pl) ?? null;
/* 差评占比着色与行级「评价数据」同阈值：低=ok、中=warn、高=bad */
const reviewRateCls = (v: number) => (v < 0.03 ? 'ok' : v < 0.05 ? 'warn' : 'bad');
/* 售后占比着色与行级「订单数据」售后率同阈值 */
const afterRateCls = (v: number) => (v < 0.03 ? 'ok' : v < 0.05 ? 'warn' : 'bad');
const afterRateOf = (s: PlatformStat) => (s.orders ? s.afterSales / s.orders : 0);
/* 复合列聊天风险率：该平台风险会话÷会话总数（与行级风险率同口径）；无会话总数记 0 */
const chatRateOf = (pl: Platform) => {
  const t = props.chatTotals?.[pl];
  const s = map.value.get(pl);
  return s && t ? s.chatRisks / t : 0;
};
/* 各平台涉及部门：由该平台命中问题类型反查部门集合（外部已按生效部门收敛，口径同行级标签聚合） */
const deptsOf = (pl: Platform) => deptsOfTypes((props.problemHits?.[pl] ?? []).map(([t]) => t));
const revRate = (pl: Platform) => {
  const r = props.reviews?.[pl];
  return r && r.total ? r.bad / r.total : 0;
};
/* 该平台是否在问题处理标记生效范围内（全平台标记或限定平台含该平台） */
const isMarked = (pl: Platform) => {
  const m = props.markScopes;
  if (!m) return false;
  return m === 'all' || m.includes(pl);
};
</script>

<template>
  <table class="matrix">
    <thead>
      <tr>
        <th>平台</th>
        <template v-if="grouped">
          <th>订单数据</th>
          <th>聊天数据</th>
        </template>
        <template v-else>
          <th>订单量</th>
          <th v-if="rateCol !== 'after'">退款率</th>
          <th>售后单</th>
          <th v-if="rateCol === 'after'">售后占比</th>
          <th>聊天风险</th>
          <th>聊天风险率</th>
        </template>
        <th v-if="reviews">评价数据</th>
        <th>命中问题类型</th>
        <th v-if="grouped">问题涉及部门</th>
        <th v-if="tagBrief">健康等级</th>
        <th v-if="tagBrief">命中标签</th>
        <th v-if="showLastOrder">最近订单</th>
        <th v-if="onChat || onTrend || onCodes">操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="pl in orderedPlats" :key="pl" :class="map.get(pl) ? '' : 'off'">
        <td>
          <div class="qc-mx-plat">
            <span class="plat-chip">
              <PlatLogo :platform="pl" :off="!map.get(pl)" />
              {{ pl }}
            </span>
            <span v-if="isMarked(pl)" class="tag rv red qc-mx-code-tag" title="问题处理已标记：该平台内计入问题编码">问题编码</span>
          </div>
        </td>
        <template v-if="grouped">
          <td class="qc-order-data">
            <template v-if="map.get(pl)">
              <div><span class="qc-cd-lb">订单总数：</span><span class="qc-cd-v">{{ map.get(pl)!.orders.toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">售后订单：</span><span class="qc-cd-v">{{ map.get(pl)!.afterSales.toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">售后率：</span><span class="qc-cd-v"><span class="rate" :class="afterRateCls(afterRateOf(map.get(pl)!))">{{ pct(afterRateOf(map.get(pl)!)) }}</span></span></div>
            </template>
            <template v-else>—</template>
          </td>
          <td class="qc-chat-data">
            <template v-if="map.get(pl)">
              <div><span class="qc-cd-lb">会话总数：</span><span class="qc-cd-v">{{ (props.chatTotals?.[pl] ?? 0).toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">风险会话：</span><span class="qc-cd-v"><span :class="map.get(pl)!.chatRisks ? 'rate bad' : ''">{{ map.get(pl)!.chatRisks }}</span></span></div>
              <div><span class="qc-cd-lb">风险率：</span><span class="qc-cd-v"><span class="rate" :class="afterRateCls(chatRateOf(pl))">{{ pct(chatRateOf(pl)) }}</span></span></div>
            </template>
            <template v-else>—</template>
          </td>
        </template>
        <template v-else>
          <td>{{ map.get(pl) ? map.get(pl)!.orders.toLocaleString() : '—' }}</td>
          <td v-if="rateCol !== 'after'">
            <span v-if="map.get(pl)" class="rate" :class="rateCls(map.get(pl)!.refundRate, threshold)">{{ pct(map.get(pl)!.refundRate) }}</span>
            <template v-else>—</template>
          </td>
          <td>{{ map.get(pl) ? map.get(pl)!.afterSales : '—' }}</td>
          <td v-if="rateCol === 'after'">
            <span v-if="map.get(pl)" class="rate" :class="afterRateCls(afterRateOf(map.get(pl)!))">{{ pct(afterRateOf(map.get(pl)!)) }}</span>
            <template v-else>—</template>
          </td>
          <td>
            <template v-if="map.get(pl)">
              <span v-if="map.get(pl)!.chatRisks" class="rate bad">{{ map.get(pl)!.chatRisks }}</span>
              <template v-else>0</template>
            </template>
            <template v-else>—</template>
          </td>
          <td>{{ map.get(pl) ? (props.chatTotals?.[pl] ? pct(map.get(pl)!.chatRisks / props.chatTotals[pl]!) : (map.get(pl)!.orders ? pct(map.get(pl)!.chatRisks / map.get(pl)!.orders) : '0.0%')) : '—' }}</td>
        </template>
        <td v-if="reviews" class="qc-review-data">
          <template v-if="map.get(pl) && reviews[pl]">
            <div><span class="qc-cd-lb">评价数：</span><span class="qc-cd-v">{{ reviews[pl]!.total.toLocaleString() }}</span></div>
            <div><span class="qc-cd-lb">差评数：</span><span class="qc-cd-v"><span :class="reviews[pl]!.bad ? 'rate bad' : ''">{{ reviews[pl]!.bad }}</span></span></div>
            <div><span class="qc-cd-lb">差评占比：</span><span class="qc-cd-v"><span class="rate" :class="reviewRateCls(revRate(pl))">{{ pct(revRate(pl)) }}</span></span></div>
          </template>
          <template v-else>—</template>
        </td>
        <td>
          <ProbTags v-if="map.get(pl) && problemHits?.[pl]?.length" :hits="problemHits![pl]!" />
          <template v-else>—</template>
        </td>
        <td v-if="grouped">
          <div v-if="deptsOf(pl).length" class="prob-tags">
            <span
              v-for="d in deptsOf(pl)"
              :key="d"
              class="tag"
              :class="{ pick: !!onPickDept, 'duty-tag': d === dutyDept }"
              :title="d === dutyDept ? '责任部门' : (onPickDept ? `查看「${d}」关联问题命中详情` : undefined)"
              @click="onPickDept?.(d)"
            >
              <svg v-if="d === dutyDept" class="duty-star" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-label="责任部门"><path d="M12 2.6l2.8 6 6.6.7-4.9 4.4 1.4 6.5-5.9-3.4-5.9 3.4 1.4-6.5L2.6 9.3l6.6-.7z" /></svg>{{ d }}
            </span>
          </div>
          <template v-else>—</template>
        </td>
        <td v-if="tagBrief">
          <span
            v-if="tb(pl)?.health"
            class="qc-health-tag"
            :title="HEALTH_META[tb(pl)!.health!].label"
            :style="{ color: HEALTH_META[tb(pl)!.health!].color, borderColor: HEALTH_META[tb(pl)!.health!].color }"
          >{{ tb(pl)!.health }}</span>
          <span v-else style="color: var(--text-4)">-</span>
        </td>
        <td v-if="tagBrief">
          <div v-if="tb(pl)?.chips.length" class="prob-tags">
            <span
              v-for="l in tb(pl)!.chips"
              :key="l.id"
              class="tag"
              :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
            >{{ l.name }}</span>
            <span v-if="tb(pl)!.extra" class="tag prob-more">
              +{{ tb(pl)!.extra }}
              <span class="prob-bubble">
                <span
                  v-for="l in tb(pl)!.labels"
                  :key="l.id"
                  class="tag"
                  :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
                >{{ l.name }}</span>
              </span>
            </span>
          </div>
          <span v-else style="color: var(--text-4)">-</span>
        </td>
        <td v-if="showLastOrder" style="color: var(--text-3)">{{ map.get(pl) ? map.get(pl)!.lastOrderAt : '—' }}</td>
        <td v-if="onChat || onTrend || onCodes">
          <div v-if="map.get(pl)" class="qc-op-col">
            <a v-if="onChat" class="op-a" @click="onChat(pl)">聊天记录</a>
            <a v-if="onTrend" class="op-a" @click="onTrend(map.get(pl)!)">趋势图</a>
            <a v-if="onCodes" class="op-a" @click="onCodes">关联ID</a>
          </div>
          <template v-else>—</template>
        </td>
      </tr>
    </tbody>
  </table>
</template>
