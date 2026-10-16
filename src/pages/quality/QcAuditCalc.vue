<script setup lang="ts">
/* ---------- 稽查模型配置 · 计算说明：雷达图 + 示例商品逐指标计算过程 + 分数表现 + 平台数据依据 ---------- */
import { computed, ref } from 'vue';
import {
  AUDIT_SAMPLE,
  DEFAULT_WEIGHTS,
  PLATFORM_RULES,
  dimScoreOf,
  gradeOf,
  scoreOf,
  totalScoreOf,
  type AuditDim,
  type AuditWeights,
} from './qcAuditData';

const KEY = 'funion:auditWeights';
const loadWeights = (): AuditWeights => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AuditWeights;
  } catch { /* 回退默认 */ }
  return structuredClone(DEFAULT_WEIGHTS);
};
const weights = ref<AuditWeights>(loadWeights());

/* 实际值可手动输入：得分/维度分/总分/雷达即时重算（初值取示例商品） */
const metrics = ref<Record<string, number>>({ ...AUDIT_SAMPLE.metrics });
const setMetric = (key: string, raw: number) => {
  const n = Number(raw);
  metrics.value[key] = Number.isFinite(n) ? Math.max(0, Math.round(n * 10) / 10) : 0;
};

const DIMS: AuditDim[] = ['商品', '物流', '服务'];
const dimCn: Record<AuditDim, string> = { 商品: '商品分', 物流: '物流分', 服务: '服务分' };

const dimCalc = computed(() => DIMS.map((d) => {
  const score = dimScoreOf(weights.value, d, metrics.value) ?? 0;
  const w = weights.value.dims[d];
  return { d, score, w, weighted: Math.round(score * w) / 10 };
}));
const total = computed(() => totalScoreOf(weights.value, metrics.value) ?? 0);
const totalRounded = computed(() => Math.round(total.value));
const grade = computed(() => gradeOf(totalRounded.value));

interface IndRow { key: string; name: string; src: string; v: number; full: number; zero: number; s: number; w: number; weighted: number }
const rowsByDim = computed(() => {
  const m: Record<string, IndRow[]> = {};
  for (const ind of weights.value.indicators) {
    const v = metrics.value[ind.key];
    if (v == null) continue;
    const s = scoreOf(v, ind.fullLine, ind.zeroLine);
    (m[ind.dim] ??= []).push({ key: ind.key, name: ind.name, src: ind.src, v, full: ind.fullLine, zero: ind.zeroLine, s, w: ind.weight, weighted: Math.round(s * ind.weight) / 10 });
  }
  return m;
});

/* 雷达图：六轴 = 三维各取两个代表指标；本商品 vs 行业基准（KD 式对比） */
const RADAR_AXES = [
  { key: 'prod-badrate', label: '商品差评' },
  { key: 'prod-prerefund', label: '发货后退款' },
  { key: 'logi-badrate', label: '物流差评' },
  { key: 'logi-chat', label: '会话物流' },
  { key: 'serv-after', label: '售后单率' },
  { key: 'serv-badrate', label: '服务差评' },
];
const CX = 150;
const CY = 132;
const R = 92;
const ang = (i: number) => ((-90 + i * 60) * Math.PI) / 180;
const pt = (i: number, v: number) => {
  const rr = (R * v) / 100;
  return `${(CX + rr * Math.cos(ang(i))).toFixed(1)},${(CY + rr * Math.sin(ang(i))).toFixed(1)}`;
};
const axisEnd = (i: number) => pt(i, 100).split(',').map(Number);
const gridPts = (lvl: number) => RADAR_AXES.map((_, i) => pt(i, lvl)).join(' ');
const labelPos = (i: number) => {
  const lr = R + 24;
  return { x: (CX + lr * Math.cos(ang(i))).toFixed(1), y: (CY + lr * Math.sin(ang(i))).toFixed(1) };
};
const sampleVals = computed(() => RADAR_AXES.map((a) => {
  const ind = weights.value.indicators.find((x) => x.key === a.key);
  return ind ? scoreOf(metrics.value[a.key], ind.fullLine, ind.zeroLine) : 0;
}));
const samplePts = computed(() => sampleVals.value.map((v, i) => pt(i, v)).join(' '));
const basePts = computed(() => AUDIT_SAMPLE.baseline.map((v, i) => pt(i, v)).join(' '));

const GRADES = [
  { name: '优秀', range: '≥ 85', color: '#1f9d55', inner: '正常放量、优先排产与发布', platform: '平台搜索排序加权、营销活动可提报、广告投放正常' },
  { name: '良好', range: '70 ~ 85', color: '#4f7cff', inner: '常规考核、按运营节奏发布', platform: '流量正常，保持体验分竞争力' },
  { name: '预警', range: '60 ~ 70', color: '#d46b08', inner: '列入品控重点稽查、限制营销资源倾斜', platform: '存在搜索降权风险，重点活动提报受限' },
  { name: '风险', range: '< 60', color: '#e5484d', inner: '暂停发布 / 下架整改、进入稽查清单', platform: '活动与广告投放受限，长期低分面临流量断崖' },
];
</script>

<template>
  <div class="qc-head qc-head-col">
    <div class="qc-title">计算说明</div>
    <div class="qc-pm-sub">总分 = Σ(维度分 × 维度权重%) · 维度分 = Σ(指标得分 × 指标权重%) · 指标得分 = 实际值按满分线/零分线线性折算</div>
  </div>
  <div class="qc-au-wrap">
    <div class="qc-au-grid">
      <!-- 雷达图 -->
      <div class="qc-au-card qc-au-radar-card">
        <div class="qc-au-card-hd">
          <span class="qc-au-card-t">评分雷达</span>
          <span class="qc-au-tip">六轴取三维代表指标（0-100 得分）</span>
        </div>
        <svg viewBox="0 0 300 284" class="qc-au-radar">
          <polygon v-for="lvl in [25, 50, 75, 100]" :key="lvl" :points="gridPts(lvl)" class="ring" />
          <line v-for="(a, i) in RADAR_AXES" :key="a.key" :x1="CX" :y1="CY" :x2="axisEnd(i)[0]" :y2="axisEnd(i)[1]" class="axis" />
          <text v-for="(a, i) in RADAR_AXES" :key="`t${a.key}`" :x="labelPos(i).x" :y="labelPos(i).y" class="lbl" text-anchor="middle">{{ a.label }}</text>
          <polygon :points="basePts" class="base" />
          <polygon :points="samplePts" class="sample" />
          <circle v-for="(v, i) in sampleVals" :key="`c${i}`" :cx="pt(i, v).split(',')[0]" :cy="pt(i, v).split(',')[1]" r="3.2" class="dot" />
        </svg>
        <div class="qc-au-legend">
          <span class="qc-au-legend-i"><i class="me" />本商品</span>
          <span class="qc-au-legend-i"><i class="base" />行业基准</span>
        </div>
      </div>

      <!-- 计算过程 -->
      <div class="qc-au-card">
        <div class="qc-au-card-hd">
          <span class="qc-au-card-t">示例计算过程 · {{ AUDIT_SAMPLE.name }}</span>
          <span class="qc-au-tip">{{ AUDIT_SAMPLE.meta }} · 权重取当前权重配置</span>
        </div>
        <table class="qc-au-tbl">
          <thead>
            <tr>
              <th>指标</th>
              <th style="width: 84px">来源</th>
              <th style="width: 100px">实际值</th>
              <th style="width: 70px">满分线</th>
              <th style="width: 70px">零分线</th>
              <th style="width: 64px">得分</th>
              <th style="width: 64px">权重</th>
              <th style="width: 72px">加权分</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="dc in dimCalc" :key="dc.d">
              <tr class="qc-au-dimrow">
                <td colspan="8">
                  <b>{{ dimCn[dc.d] }}</b>
                  <span class="qc-au-dimrow-sub">维度分 <b>{{ dc.score }}</b> · 总分权重 {{ dc.w }}% · 加权 {{ dc.weighted }}</span>
                </td>
              </tr>
              <tr v-for="r in rowsByDim[dc.d]" :key="r.name">
                <td>{{ r.name }}</td>
                <td><span class="qc-au-src">{{ r.src }}</span></td>
                <td class="qc-au-mono">
                  <div class="qc-au-vcell">
                    <input class="qc-au-num sm" type="number" min="0" step="0.1" :value="r.v" @input="setMetric(r.key, Number(($event.target as HTMLInputElement).value))">
                    <span class="qc-au-unit">%</span>
                  </div>
                </td>
                <td class="qc-au-mono">≤{{ r.full }}%</td>
                <td class="qc-au-mono">≥{{ r.zero }}%</td>
                <td class="qc-au-mono"><b :style="{ color: r.s >= 85 ? '#1f9d55' : r.s >= 60 ? '#202532' : '#e5484d' }">{{ r.s }}</b></td>
                <td class="qc-au-mono">{{ r.w }}%</td>
                <td class="qc-au-mono">{{ r.weighted }}</td>
              </tr>
            </template>
            <tr class="qc-au-totalrow">
              <td colspan="6">稽查总分 = {{ dimCalc.map((d) => `${d.score}×${d.w}%`).join(' + ') }}</td>
              <td colspan="2" class="qc-au-mono">
                <b :style="{ color: grade.color }">{{ total }} ≈ {{ totalRounded }}</b>
                <span class="qc-au-tag" :style="{ background: `${grade.color}1a`, color: grade.color }">{{ grade.name }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分数表现 -->
    <div class="qc-au-card">
      <div class="qc-au-card-hd">
        <span class="qc-au-card-t">分数表现</span>
        <span class="qc-au-tip">分数落档决定内部处置动作与对标平台影响</span>
      </div>
      <table class="qc-au-tbl">
        <thead>
          <tr>
            <th style="width: 90px">档位</th>
            <th style="width: 90px">分值区间</th>
            <th>内部动作</th>
            <th>平台影响（对标体验分）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in GRADES" :key="g.name">
            <td><span class="qc-au-dot" :style="{ color: g.color }"><i :style="{ background: g.color }" /><b>{{ g.name }}</b></span></td>
            <td class="qc-au-mono">{{ g.range }}</td>
            <td>{{ g.inner }}</td>
            <td class="qc-au-plat">{{ g.platform }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 数据依据 -->
    <div class="qc-au-card">
      <div class="qc-au-card-hd">
        <span class="qc-au-card-t">数据依据 · 平台评分规则</span>
        <span class="qc-au-tip">调研结论：三大平台均为「维度加权＋行业/档位线」制，权重按行业动态调整、官方不公开固定值</span>
      </div>
      <table class="qc-au-tbl">
        <thead>
          <tr>
            <th style="width: 90px">平台</th>
            <th style="width: 170px">评分体系</th>
            <th>维度与核心指标</th>
            <th style="width: 220px">周期与出分门槛</th>
            <th style="width: 220px">稽查 / 判责方式</th>
            <th style="width: 190px">规则出处</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in PLATFORM_RULES" :key="r.platform">
            <td>{{ r.platform }}</td>
            <td>{{ r.system }}</td>
            <td class="qc-au-plat">{{ r.dims }}</td>
            <td class="qc-au-plat">{{ r.cycle }}</td>
            <td class="qc-au-plat">{{ r.audit }}</td>
            <td class="qc-au-plat">{{ r.source }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
