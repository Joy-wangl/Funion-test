<script setup lang="ts">
/** 评价申诉列表：默认展示「不够好」评价，订单信息置首，申诉内容通过操作弹层查看。 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { raReviews, type RaReview, type RaVisibility, type RaAppealStatus, type RaAuditStatus } from './reviewAppealData';
import './ReviewAppealPage.css';

/* ---------- 筛选态 ---------- */
const fProductId = ref('');
const fShopName = ref('');
const fDateFrom = ref('');
const fDateTo = ref('');
const fVisibility = ref<RaVisibility | '全部'>('全部');
const fAppealStatus = ref<RaAppealStatus | '全部'>('全部');
const fAuditStatus = ref<RaAuditStatus | '全部'>('全部');

interface RaFilters {
  productId: string;
  shopName: string;
  dateFrom: string;
  dateTo: string;
  visibility: RaVisibility | '全部';
  appealStatus: RaAppealStatus | '全部';
  auditStatus: RaAuditStatus | '全部';
}

const appliedFilters = ref<RaFilters>({
  productId: '', shopName: '', dateFrom: '', dateTo: '',
  visibility: '全部', appealStatus: '全部', auditStatus: '全部',
});
const appealDetail = ref<RaReview | null>(null);
const appealTarget = ref<RaReview | null>(null);
const appealOpen = ref(false);
const appealSubmitting = ref(false);
const appealError = ref('');
const appealEvidenceInput = ref<HTMLInputElement | null>(null);
const appealReasonOptions = [
  { title: '评价内容与商品无关', description: '评价内容与商品订单的体验感受完全无关' },
  { title: '未收到货的虚假评价', description: '消费者未收到货，却对订单给出了使用体验评价' },
  { title: '平台活动导致差评', description: '消费者因误解平台活动给了商品订单差评' },
  { title: '评价内容包含广告', description: '评价内容包含与商品无关的广告引流信息' },
  { title: '消费者买错导致差评', description: '消费者因自身原因买错型号/规格等给了差评' },
  { title: '利用差评获取利益', description: '商品或订单服务无问题，用户仅为索取利益利用差评威胁商家' },
  { title: '同行恶意差评', description: '同行恶意竞争，伪装成消费者，给予差评，诋毁商家' },
];
const appealDraft = ref({ reason: '', explanation: '', evidenceName: '' });
const reasonDescription = (title?: string) => appealReasonOptions.find((reason) => reason.title === title)?.description || '暂无原因说明';

const filtered = computed(() => {
  const f = appliedFilters.value;
  return raReviews.filter((r) => {
    /* 仅抓取差评，固定只展示「不够好」 */
    if (r.rating !== '不够好') return false;
    if (f.visibility !== '全部' && r.visibility !== f.visibility) return false;
    if (f.appealStatus !== '全部' && r.appealStatus !== f.appealStatus) return false;
    if (f.auditStatus !== '全部' && r.auditStatus !== f.auditStatus) return false;
    if (f.productId && !r.productId.includes(f.productId)) return false;
    if (f.shopName && !r.shopName.includes(f.shopName)) return false;
    if (f.dateFrom || f.dateTo) {
      const reviewDate = `2026-${r.ratedAt.slice(0, 5).replace('/', '-')}`;
      if (f.dateFrom && reviewDate < f.dateFrom) return false;
      if (f.dateTo && reviewDate > f.dateTo) return false;
    }
    return true;
  });
});

const doFilter = () => {
  appliedFilters.value = {
    productId: fProductId.value.trim(),
    shopName: fShopName.value.trim(),
    dateFrom: fDateFrom.value,
    dateTo: fDateTo.value,
    visibility: fVisibility.value,
    appealStatus: fAppealStatus.value,
    auditStatus: fAuditStatus.value,
  };
};
const doReset = () => {
  fProductId.value = '';
  fShopName.value = '';
  fDateFrom.value = '';
  fDateTo.value = '';
  fVisibility.value = '全部';
  fAppealStatus.value = '全部';
  fAuditStatus.value = '全部';
  doFilter();
};
const clearTextFilter = (field: 'productId' | 'shopName') => {
  if (field === 'productId') fProductId.value = '';
  if (field === 'shopName') fShopName.value = '';
  doFilter();
};
/* 导出：原型阶段给可操作反馈，空结果拦截 */
const doExport = () => {
  if (!filtered.value.length) {
    pushToast('暂无可导出的数据', 'error');
    return;
  }
  pushToast(`已导出 ${filtered.value.length} 条评价`, 'success');
};

/* 申诉状态：标签色档（待申诉=橙、已申诉=蓝、不予申诉=灰） */
const statusCls = (s: RaAppealStatus) => ({ pend: s === '待申诉', done: s === '已申诉', deny: s === '不予申诉' });
/* 审核状态：标签色档（审核中=橙、已通过=绿、未通过=红、已撤回=灰） */
const auditCls = (s?: RaAuditStatus) => ({ auditing: s === '审核中', pass: s === '已通过', reject: s === '未通过', withdraw: s === '已撤回' });
const resetAppealDraft = () => {
  appealDraft.value = {
    reason: appealTarget.value?.appealCause || appealReasonOptions[0].title,
    explanation: '',
    evidenceName: '',
  };
  appealError.value = '';
  appealSubmitting.value = false;
};
const closeAppeal = () => {
  appealOpen.value = false;
  appealTarget.value = null;
  resetAppealDraft();
};
const doAppeal = (r: RaReview) => {
  appealTarget.value = r;
  resetAppealDraft();
  appealOpen.value = true;
};
const showAppealDetail = (r: RaReview) => { appealDetail.value = r; };
const chooseEvidence = (event: Event) => {
  const input = event.target as HTMLInputElement;
  appealDraft.value.evidenceName = input.files?.[0]?.name || '';
};
const submitAppeal = () => {
  if (!appealTarget.value || appealSubmitting.value) return;
  if (!appealDraft.value.reason) {
    appealError.value = '请选择申诉原因';
    return;
  }
  if (!appealDraft.value.explanation.trim()) {
    appealError.value = '请填写申诉说明';
    return;
  }
  appealSubmitting.value = true;
  window.setTimeout(() => {
    const target = appealTarget.value;
    if (!target) return;
    target.appealStatus = '已申诉';
    target.appealCause = appealDraft.value.reason;
    target.appealReason = appealDraft.value.explanation.trim();
    target.appealEvidenceName = appealDraft.value.evidenceName || undefined;
    if (appealDraft.value.evidenceName) {
      target.appealEvidenceImages = ['/products/main.png'];
    }
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    target.appealTime = `${mm}/${dd} ${hh}:${mi}`;
    target.auditStatus = '审核中';
    closeAppeal();
    pushToast('评价申诉已发起', 'success');
  }, 280);
};
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  if (appealOpen.value) closeAppeal();
  else if (appealDetail.value) appealDetail.value = null;
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="ra-page">
    <!-- 页面标题：沿用运营中心列表页的面包屑层级，不把筛选项直接铺在背景上 -->
    <div class="ra-head">
      <div class="ra-breadcrumb">智能运营中心 <span>/ 申诉中心 / 评价申诉</span></div>
    </div>
  
    <!-- 标准列表筛选卡：所有条件统一为字段控件，查询与重置固定右对齐 -->
    <div class="ra-filter">
      <div class="ra-filter-grid">
        <div class="ra-filter-field">
          <label for="ra-product-id">商品编号</label>
          <div class="ra-input-wrap">
            <input id="ra-product-id" class="ra-input" v-model="fProductId" placeholder="请输入商品编号">
            <button v-if="fProductId" type="button" class="ra-clear" aria-label="清除商品编号" @click="clearTextFilter('productId')"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg></button>
          </div>
        </div>
        <div class="ra-filter-field">
          <label for="ra-shop-name">店铺信息</label>
          <div class="ra-input-wrap">
            <input id="ra-shop-name" class="ra-input" v-model="fShopName" placeholder="请输入店铺名称">
            <button v-if="fShopName" type="button" class="ra-clear" aria-label="清除店铺信息" @click="clearTextFilter('shopName')"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg></button>
          </div>
        </div>
        <div class="ra-filter-field ra-filter-date">
          <label>评价时间</label>
          <DateRangePicker
            :from="fDateFrom" :to="fDateTo"
            @update:from="(v) => (fDateFrom = v)"
            @update:to="(v) => (fDateTo = v)"
          />
        </div>
        <div class="ra-filter-field">
          <label>可见范围</label>
          <BubbleSelect class-name="ra-select" :value="fVisibility" :options="['全部', '展示中', '已折叠', '未展示']" @change="(v) => (fVisibility = v as RaVisibility | '全部')" />
        </div>
        <div class="ra-filter-field">
          <label>申诉状态</label>
          <BubbleSelect class-name="ra-select" :value="fAppealStatus" :options="['全部', '待申诉', '已申诉', '不予申诉']" @change="(v) => (fAppealStatus = v as RaAppealStatus | '全部')" />
        </div>
        <div class="ra-filter-field">
          <label>审核状态</label>
          <BubbleSelect class-name="ra-select" :value="fAuditStatus" :options="['全部', '审核中', '已通过', '未通过', '已撤回']" @change="(v) => (fAuditStatus = v as RaAuditStatus | '全部')" />
        </div>
        <div class="ra-filter-actions">
          <button class="ra-filter-btn ghost" type="button" @click="doExport">全部导出</button>
          <button class="ra-filter-btn ghost" type="button" @click="doReset">重置</button>
          <button class="ra-filter-btn primary" type="button" @click="doFilter">查询</button>
        </div>
      </div>
    </div>
  
    <!-- 列表卡：规范骨架为白卡直接包表格，列头即卡片首行，不设标题条 -->
    <div class="ra-table-card">
      <div class="ra-table-wrap">
        <table class="ra-table">
          <thead>
          <tr>
            <th class="ra-th-order">订单详情</th>
            <th class="ra-th-shop">店铺信息</th>
            <th class="ra-th-user">评价人</th>
            <th class="ra-th-content">评价内容</th>
            <th class="ra-th-time">评价时间</th>
            <th class="ra-th-appeal-time">申诉时间</th>
            <th class="ra-th-status">申诉状态</th>
            <th class="ra-th-audit">审核状态</th>
            <th class="ra-th-ops">操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="r in filtered" :key="r.id">
            <!-- 订单详情：置于首列，优先展示用户需要核对的订单信息 -->
            <td>
              <div class="ra-order">
                <img class="ra-order-thumb" :src="r.productThumb || '/products/main.png'" alt="商品缩略图" />
                <div class="ra-order-info">
                  <Ellipsis class="ra-order-title ra-order-title-ell" :text="r.productTitle" />
                  <span v-if="r.productSku" class="ra-order-sku">{{ r.productSku }}</span>
                  <span class="ra-order-id">ID：63528697121</span>
                </div>
              </div>
            </td>
            <!-- 店铺信息：仅保留店铺名称 -->
            <td class="ra-shop">{{ r.shopName }}</td>
            <!-- 评价人：保留昵称，不展示头像首字占位 -->
            <td>
              <div class="ra-user">
                <span class="ra-user-name" :title="r.userName">{{ r.userName }}</span>
              </div>
            </td>
            <!-- 评价内容：评分标签 + 正文 + 附图 -->
            <td>
              <div class="ra-rating" :class="r.rating === '不够好' ? 'bad' : 'good'">
                <span>{{ r.rating === '不够好' ? '😞' : '😊' }} {{ r.rating }}</span>
              </div>
              <div class="ra-content">
                <Ellipsis class="ra-content-ell" :text="r.content" />
              </div>
              <div v-if="r.images.length" class="ra-images">
                <img v-for="img in r.images" :key="img" class="ra-img-thumb" :src="img" alt="评价附图" />
              </div>
            </td>
            <!-- 评价时间 -->
            <td class="ra-time">{{ r.ratedAt }}</td>
            <!-- 申诉时间 -->
            <td class="ra-time">{{ r.appealTime || '—' }}</td>
            <!-- 申诉状态：状态独立展示，申诉内容通过操作弹层查看 -->
            <td>
              <span class="ra-status" :class="statusCls(r.appealStatus)">{{ r.appealStatus }}</span>
            </td>
            <!-- 审核状态：提交申诉后的平台审核结果 -->
            <td>
              <span v-if="r.auditStatus" class="ra-status" :class="auditCls(r.auditStatus)">{{ r.auditStatus }}</span>
              <span v-else class="ra-ops-none">—</span>
            </td>
            <!-- 操作：待申诉发起申诉，已申诉查看实际发起内容 -->
            <td>
              <button v-if="r.appealStatus === '待申诉'" type="button" class="ra-ops-link" @click="doAppeal(r)">申诉</button>
              <button v-else-if="r.appealStatus === '已申诉'" type="button" class="ra-ops-link" @click="showAppealDetail(r)">申诉详情</button>
              <span v-else class="ra-ops-none">—</span>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="9" class="ra-empty">暂无数据</td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="pm-page pm-host">
    <Modal
      v-if="appealOpen && appealTarget"
      title="发起评价申诉"
      :sub="`${appealTarget.userName} · ${appealTarget.ratedAt}`"
      size="xl"
      @close="closeAppeal"
    >
      <div class="ra-appeal-form">
        <section class="ra-appeal-section">
          <div class="ra-appeal-section-title">申诉信息</div>
          <div class="ra-appeal-meta">
            <div><span class="ra-appeal-label">评价类型：</span><span>异常评价</span></div>
            <div><span class="ra-appeal-label">投诉对象：</span><span>消费者</span></div>
          </div>
        </section>

        <section class="ra-appeal-section">
          <div class="ra-appeal-section-title">申诉原因</div>
          <div class="ra-appeal-reasons">
            <button
              v-for="reason in appealReasonOptions"
              :key="reason.title"
              type="button"
              class="ra-appeal-reason-card"
              :class="{ selected: appealDraft.reason === reason.title }"
              @click="appealDraft.reason = reason.title; appealError = ''"
            >
              <span class="ra-appeal-reason-title">{{ reason.title }}</span>
              <span class="ra-appeal-reason-desc">{{ reason.description }}</span>
            </button>
          </div>
          <p v-if="appealError === '请选择申诉原因'" class="ra-appeal-error">{{ appealError }}</p>
        </section>

        <section class="ra-appeal-section">
          <label class="ra-appeal-section-title" for="ra-appeal-explanation">投诉说明</label>
          <textarea
            id="ra-appeal-explanation"
            v-model="appealDraft.explanation"
            class="ra-appeal-textarea"
            maxlength="200"
            placeholder="请输入详细的投诉原因说明"
            @input="appealError = ''"
          />
          <div class="ra-appeal-count">{{ appealDraft.explanation.length }}/200</div>
          <p v-if="appealError === '请填写申诉说明'" class="ra-appeal-error">{{ appealError }}</p>
        </section>

        <section class="ra-appeal-section">
          <div class="ra-appeal-section-title">上传凭证</div>
          <div class="ra-appeal-evidence-row">
            <input
              ref="appealEvidenceInput"
              class="ra-appeal-file-input"
              type="file"
              accept="image/*"
              @change="chooseEvidence"
            />
            <button type="button" class="ra-appeal-upload" @click="appealEvidenceInput?.click()">
              <span class="ra-appeal-upload-plus">＋</span>
              <span>上传图片</span>
            </button>
            <span v-if="appealDraft.evidenceName" class="ra-appeal-file-name">{{ appealDraft.evidenceName }}</span>
          </div>
        </section>
      </div>
      <template #foot>
        <button type="button" class="ra-detail-close" @click="closeAppeal">返回</button>
        <button type="button" class="ra-appeal-submit" :disabled="appealSubmitting" @click="submitAppeal">
          {{ appealSubmitting ? '提交中…' : '提交' }}
        </button>
      </template>
    </Modal>

    <Modal
      v-if="appealDetail"
      title="申诉详情"
      sub="实际发起申诉的内容"
      size="xl"
      @close="appealDetail = null"
    >
      <div class="ra-appeal-form ra-appeal-form-detail">
        <section class="ra-appeal-section">
          <div class="ra-appeal-section-title">申诉信息</div>
          <div class="ra-appeal-meta">
            <div><span class="ra-appeal-label">评价类型：</span><span>异常评价</span></div>
            <div><span class="ra-appeal-label">投诉对象：</span><span>消费者</span></div>
            <div><span class="ra-appeal-label">申诉时间：</span><span>{{ appealDetail.appealTime || '—' }}</span></div>
            <div><span class="ra-appeal-label">审核状态：</span><span v-if="appealDetail.auditStatus" class="ra-status" :class="auditCls(appealDetail.auditStatus)">{{ appealDetail.auditStatus }}</span><span v-else>—</span></div>
          </div>
        </section>

        <section class="ra-appeal-section">
          <div class="ra-appeal-section-title">申诉原因</div>
          <div class="ra-appeal-detail-reason-card">
            <span class="ra-appeal-detail-reason-title">{{ appealDetail.appealCause || '暂无申诉原因' }}</span>
            <span class="ra-appeal-detail-reason-desc">{{ reasonDescription(appealDetail.appealCause) }}</span>
          </div>
        </section>

        <section class="ra-appeal-section">
          <div class="ra-appeal-section-title">投诉说明</div>
          <div class="ra-appeal-textarea ra-appeal-readonly-text">{{ appealDetail.appealReason || '暂无投诉说明' }}</div>
        </section>

        <section v-if="appealDetail.appealEvidenceImages?.length" class="ra-appeal-section">
          <div class="ra-appeal-section-title">上传凭证</div>
          <div class="ra-appeal-detail-evidence-tray">
            <span v-for="(img, i) in appealDetail.appealEvidenceImages" :key="i" class="ra-appeal-evidence-thumb" :style="{ backgroundImage: `url(${img})` }" />
          </div>
        </section>
      </div>
      <template #foot>
        <button type="button" class="ra-detail-close" @click="appealDetail = null">关闭</button>
      </template>
    </Modal>
  </div>
</template>
