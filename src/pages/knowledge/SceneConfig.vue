<script setup lang="ts">
/* 场景配置：非商品范畴咨询的兜底/补全机制（知识库无法解答时的额外场景）
 * 二级列表：一级=场景类型（宽泛定义，字段含场景数量/创建人/创建时间），详情钻入二级=该类型下具体场景；
 *          具体场景上配置 命中条件（状态/其他因子）+ 提示语（多条）/关键词 + 命中后处置
 * 配置抽屉（SceneCfgDrawer.vue 共享组件，V1/V2 同用）：纵向配置流——归属（类型+细分名）→①触发条件
 *          （场景阶段+订单状态组勾选/叶子面板）→②客户问法（提示语多条+关键词）→③命中后处置（处置+AI 提示语）
 * 类型配置抽屉（TypeCfgDrawer.vue 共享组件）：类型名称→①条件定义→②场景定义；
 *          AI 命中链路=类型条件定义把关→场景定义语义命中→钻入类型下细分场景
 * 二级列表字段：引用次数/创建人/创建时间 + 状态列开关启停（启用/停用不再走操作列链接）
 * 兜底链路：用户咨询 → 商品知识库优先命中 → 未命中（脱离商品范畴）时按提示语匹配细分场景
 *          → 命中按处置输出 / 未匹配走系统默认兜底（转人工）
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { pushToast } from '../../components/toast';
import Ellipsis from '../../components/Ellipsis.vue';
import MoreActions from '../../components/MoreActions.vue';
import SceneCfgDrawer from './SceneCfgDrawer.vue';
import TypeCfgDrawer from './TypeCfgDrawer.vue';
import {
  SC_STAGES, SC_STAGE_STATES, typeCondText, fbScenes,
  type FbScene, type FbSub,
} from './sceneConfigData';
import './KbForm.css';
import './SceneConfig.css';

/* ---------- 二级列表：一级=场景类型（场景数量/创建人/创建时间），详情钻入二级=该类型下具体场景 ---------- */
const curType = ref<FbScene | null>(null);

/* ---------- 筛选：关键词回车生效；一级按类型名/创建人过滤，二级按场景名/提示语/关键词/回复过滤；切换层级重置 ---------- */
const fKw = ref('');
const fKwApplied = ref('');
const visibleTypes = computed(() => {
  const kw = fKwApplied.value.trim();
  return fbScenes.filter((g) => !kw || g.name.includes(kw) || g.creator.includes(kw));
});
const visibleSubs = computed(() => {
  const g = curType.value;
  if (!g) return [];
  const kw = fKwApplied.value.trim();
  return g.subs.filter((s) => !kw || `${s.name} ${s.questions.join(' ')} ${s.kws.join(' ')}`.includes(kw));
});
const onResetFilter = () => { fKw.value = ''; fKwApplied.value = ''; };
const enterType = (g: FbScene) => { curType.value = g; onResetFilter(); };
const backToTypes = () => { curType.value = null; onResetFilter(); };

/* ---------- 命中条件摘要（列表列）：场景阶段 + 订单状态因子，空=不限 ---------- */
/* 订单状态回显折叠：整组全选折叠为大类名，其余叶子逐个列出 */
const sumOrder = (vals: string[]) => {
  const covered = new Set<string>();
  const out: string[] = [];
  for (const st of SC_STAGES) {
    const lv = SC_STAGE_STATES[st] ?? [];
    if (lv.length && lv.every((x) => vals.includes(x))) { out.push(st); lv.forEach((x) => covered.add(x)); }
  }
  vals.forEach((v) => { if (!covered.has(v)) out.push(v); });
  return out.join('/');
};
const condSummary = (s: FbSub) => {
  const parts: string[] = [];
  if (s.conds.sceneStages.length) parts.push(`场景 ${s.conds.sceneStages.join('/')}`);
  if (s.conds.orderStates.length) parts.push(`订单状态 ${sumOrder(s.conds.orderStates)}`);
  return parts.length ? parts.join(' · ') : '不限';
};

/* ---------- 配置抽屉（共享组件 SceneCfgDrawer）：cfgScene=null 新建态（归属预填当前类型），非空=编辑态 ---------- */
const cfgOpen = ref(false);
const cfgScene = ref<FbSub | null>(null);
const openCreate = () => { cfgScene.value = null; cfgOpen.value = true; };
const openEdit = (s: FbSub) => { cfgScene.value = s; cfgOpen.value = true; };

/* ---------- 启停 / 删除：细分场景级；系统默认兜底不可停用/删除 ---------- */
const toggleScene = (s: FbSub) => {
  if (s.system) { pushToast('系统默认兜底场景不可停用', 'warning'); return; }
  s.enabled = !s.enabled;
  pushToast(`场景「${s.name}」已${s.enabled ? '启用' : '停用'}${s.enabled ? '' : '，不再参与兜底匹配'}`);
};
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => { confirmBox.value = { title, message, onOk }; };
const removeScene = (s: FbSub) => {
  if (s.system) { pushToast('系统默认兜底场景不可删除', 'warning'); return; }
  askConfirm('删除细分场景', `删除场景「${s.name}」？删除后该场景不再参与兜底匹配，命中提示语将落入默认兜底`, () => {
    const g = fbScenes.find((x) => x.subs.some((y) => y.id === s.id));
    if (!g) return;
    const i = g.subs.findIndex((x) => x.id === s.id);
    if (i > -1) g.subs.splice(i, 1);
    pushToast('场景已删除');
  });
};

/* ---------- 场景类型管理（一级列表）：新建/编辑走共享 TypeCfgDrawer（条件定义→场景定义）；删除守卫=类型下无场景 ---------- */
const typeCfgOpen = ref(false);
const typeCfgTarget = ref<FbScene | null>(null);
const openTypeCreate = () => { typeCfgTarget.value = null; typeCfgOpen.value = true; };
const openTypeEdit = (g: FbScene) => { typeCfgTarget.value = g; typeCfgOpen.value = true; };
const removeType = (g: FbScene) => {
  if (g.subs.length) { pushToast(`类型「${g.name}」下还有 ${g.subs.length} 个场景，请先删除或迁移`, 'warning'); return; }
  askConfirm('删除场景类型', `删除场景类型「${g.name}」？删除后不可恢复`, () => {
    const i = fbScenes.indexOf(g);
    if (i > -1) fbScenes.splice(i, 1);
    pushToast('场景类型已删除');
  });
};

/* ---------- Esc：确认弹窗（配置抽屉 Esc 由共享组件自管） ---------- */
const onEsc = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (confirmBox.value) confirmBox.value = null;
};
onMounted(() => window.addEventListener('keydown', onEsc));
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc));
</script>

<template>
  <div class="sc-wrap">
    <header class="kb-main-head sc-head">
      <div>
        <h2>
          <button v-if="curType" class="kb-back" title="返回场景类型列表" @click="backToTypes">←</button>{{ curType ? curType.name : '场景配置' }}
        </h2>
        <p class="kb-breadcrumb">知识库<span> / 场景配置</span><span v-if="curType"> / {{ curType.name }}</span></p>
      </div>
      <div class="sc-head-btns">
        <button v-if="!curType" class="kb-btn" @click="openTypeCreate">新建场景类型</button>
        <button v-if="curType" class="kb-btn primary" @click="openCreate">新建场景</button>
      </div>
    </header>

    <div class="sc-main">
      <!-- ============ 场景配置：二级列表（一级=场景类型表，详情钻入二级=具体场景表） ============ -->
      <div class="sc-panel">
        <!-- 一级：场景类型列表（场景数量/创建人/创建时间，详情钻入二级） -->
        <template v-if="!curType">
          <div class="kb-query">
            <div class="kb-field">
              <label>类型关键词</label>
              <span class="kb-kwwrap">
                <input v-model="fKw" class="kb-input" placeholder="请输入场景类型 / 创建人关键词" @keyup.enter="fKwApplied = fKw">
                <button v-if="fKw" type="button" class="kb-clear" title="清除" @click="onResetFilter">
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
                </button>
              </span>
            </div>
            <div class="kb-query-actions">
              <button class="kb-btn" @click="onResetFilter">重置</button>
              <button class="kb-btn primary" @click="fKwApplied = fKw">查询</button>
            </div>
          </div>

          <div class="kb-table-wrap">
            <table class="kb-table sc-type-table">
              <thead>
                <tr>
                  <th>场景类型</th>
                  <th>条件定义</th>
                  <th>场景定义</th>
                  <th>场景数量</th>
                  <th>创建人</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="g in visibleTypes" :key="g.id">
                  <td><b class="sc-name">{{ g.name }}</b></td>
                  <td><Ellipsis class-name="sc-cond" :text="typeCondText(g)" /></td>
                  <td><Ellipsis class-name="sc-def-cell" :text="g.semDef || '-'" /></td>
                  <td><span class="sc-hits">{{ g.subs.length }}</span></td>
                  <td>{{ g.creator }}</td>
                  <td>{{ g.createdAt }}</td>
                  <td>
                    <span class="sc-ops">
                      <a class="kb-link" href="#" @click.prevent="enterType(g)">详情</a>
                      <MoreActions
                        dot
                        :items="[
                          { label: '编辑', onClick: () => openTypeEdit(g) },
                          { label: '删除', danger: true, onClick: () => removeType(g) },
                        ]"
                      />
                    </span>
                  </td>
                </tr>
                <tr v-if="!visibleTypes.length">
                  <td colspan="7" class="kb-empty">无匹配场景类型</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- 二级：当前场景类型下的具体场景 -->
        <template v-else>
          <!-- 类型定义带：命中链路回显（条件定义把关 → 场景定义语义命中 → 下挂细分场景） -->
          <div class="sc-def-band">
            <span class="sc-def-item"><b>条件定义</b><em>{{ typeCondText(curType) }}</em></span>
            <span class="sc-def-item"><b>场景定义</b><em>{{ curType.semDef || '未设置' }}</em></span>
          </div>
          <div class="kb-query">
            <div class="kb-field">
              <label>场景关键词</label>
              <span class="kb-kwwrap">
                <input v-model="fKw" class="kb-input" placeholder="请输入场景 / 提示语关键词" @keyup.enter="fKwApplied = fKw">
                <button v-if="fKw" type="button" class="kb-clear" title="清除" @click="onResetFilter">
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
                </button>
              </span>
            </div>
            <div class="kb-query-actions">
              <button class="kb-btn" @click="onResetFilter">重置</button>
              <button class="kb-btn primary" @click="fKwApplied = fKw">查询</button>
            </div>
          </div>

          <div class="kb-table-wrap">
            <table class="kb-table sc-scene-table">
              <thead>
                <tr>
                  <th>细分场景</th>
                  <th>提示语</th>
                  <th>命中条件</th>
                  <th>引用次数</th>
                  <th>创建人</th>
                  <th>创建时间</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in visibleSubs" :key="row.id" :class="{ off: !row.enabled }">
                  <td>
                    <div class="sc-name-cell">
                      <b class="sc-name">{{ row.name }}</b>
                      <i v-if="row.system" class="sc-sys">系统默认</i>
                    </div>
                  </td>
                  <td>
                    <div class="sc-ask-chips">
                      <template v-if="row.questions.length">
                        <em class="exact"><Ellipsis :text="row.questions[0]" /></em>
                        <em v-if="row.questions.length > 1" class="more">提示语 {{ row.questions.length }}</em>
                        <em v-if="row.kws.length" class="more">关键词 {{ row.kws.length }}</em>
                      </template>
                      <span v-else class="sc-dim">-</span>
                    </div>
                  </td>
                  <td><Ellipsis class-name="sc-cond" :text="condSummary(row)" /></td>
                  <td><span class="sc-hits">{{ row.refs }}</span></td>
                  <td>{{ row.creator }}</td>
                  <td>{{ row.createdAt }}</td>
                  <td>
                    <span
                      class="sc-switch" :class="{ on: row.enabled }" role="switch" :aria-checked="row.enabled" tabindex="0"
                      :title="row.enabled ? '停用' : '启用'" @click="toggleScene(row)" @keydown.enter.prevent="toggleScene(row)"
                    ><i /></span>
                  </td>
                  <td>
                    <span class="sc-ops">
                      <MoreActions
                        dot
                        :items="row.system
                          ? [{ label: '编辑', onClick: () => openEdit(row) }]
                          : [
                              { label: '编辑', onClick: () => openEdit(row) },
                              { label: '删除', danger: true, onClick: () => removeScene(row) },
                            ]"
                      />
                    </span>
                  </td>
                </tr>
                <tr v-if="!visibleSubs.length">
                  <td colspan="9" class="kb-empty">无匹配场景</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- ============ 场景类型新建/编辑抽屉（一级列表入口，条件定义→场景定义） ============ -->
    <TypeCfgDrawer :open="typeCfgOpen" :target="typeCfgTarget" @close="typeCfgOpen = false" />

    <!-- 配置抽屉：共享组件（纵向配置流，新建/编辑同构） -->
    <SceneCfgDrawer :open="cfgOpen" :scene="cfgScene" :default-type="curType?.name ?? ''" @close="cfgOpen = false" />

    <!-- 二次确认弹窗（删除等不可逆操作） -->
    <template v-if="confirmBox">
      <div class="kb-modal-mask" @click="confirmBox = null">
        <div class="kb-modal sc-confirm" @click.stop>
          <div class="kb-modal-head">
            <b>{{ confirmBox.title }}</b>
            <button class="kb-x" title="关闭" @click="confirmBox = null">✕</button>
          </div>
          <div class="sc-confirm-body">{{ confirmBox.message }}</div>
          <div class="kb-modal-foot">
            <button class="kb-btn" @click="confirmBox = null">取消</button>
            <button class="kb-btn primary" @click="confirmBox.onOk(); confirmBox = null">确认</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
