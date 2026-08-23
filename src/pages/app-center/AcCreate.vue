<script setup lang="ts">
/* 上传新创作 / 编辑应用（两步表单，1:1 移植自 AppCenter.tsx 的 renderCreate）
   表单状态本地持有（进入时组件挂载即初始化，等价 React openCreate）；
   提交校验与应用在 AppCenter.vue（等价 React submitCreate） */
import { computed, ref, watch } from 'vue';
import {
  APP_TYPES, ICON_PRESETS, INITIAL_TAG_DEFS, PERM_SCOPES, PREVIEW_PRESETS, TAG_COLOR_PRESETS, demoFileName,
  type AppItem, type IconSpec, type Preview, type TagDef,
} from './data';
import { IC, type AcForm } from './acHelpers';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import AcSvg from './AcSvg.vue';
import AcLogo from './AcLogo.vue';
import AcPreviewCard from './AcPreviewCard.vue';

const props = defineProps<{
  editApp: AppItem | null;
  /** 全量应用（标签候选按当前分类内使用次数排序） */
  apps: AppItem[];
  cats: string[];
  onBack: () => void;
  onSubmit: (form: AcForm) => void;
  onOpenCatDrawer: () => void;
}>();

const src = props.editApp;
const editing = !!src;

/* 新建第二步：类型/部署/文件/版本/发布方式/权限 */
const step = ref<1 | 2>(1);
const fType = ref(src?.appType ?? '');
const fDeploy = ref<'link' | 'file'>(src?.deployMode ?? 'file');
const fLink = ref(src?.linkUrl ?? '');
const fFile = ref(src?.appFile ?? '');
const fRun = ref(src?.runFile ?? '');
const fVersion = ref(src?.version ?? '');
const fPublish = ref<'online' | 'test'>(src?.publishMode ?? 'test');
const fPerm = ref(src?.permScope ?? '所有人');
const permPop = ref(false);

/* 上传新创作表单 */
const fName = ref(src?.name ?? '');
const fDesc = ref(src?.desc ?? '');
const fIcon = ref<IconSpec | null>(src?.icon ?? null);
const fPreviews = ref<Preview[]>(src?.previews ?? []);
const fCat = ref(src?.category ?? 'Agent');
const fNote = ref(src?.releaseNote ?? '');
const fTags = ref<string[]>(src?.tags ?? []);

/* 标签：按类目内使用次数（关联应用数）降序，支持选择/新建 */
const tagDefs = ref<TagDef[]>(INITIAL_TAG_DEFS);
const tagPop = ref(false);
const tagModal = ref(false);
const tmName = ref('');
const tmColor = ref(TAG_COLOR_PRESETS[0]);

/* 类目管理保存后（cats 变化）：当前分类不在列表内则回落首项，等价 React saveCats 内逻辑 */
watch(() => props.cats, (names) => {
  if (!names.includes(fCat.value)) fCat.value = names[0] ?? fCat.value;
});

const catTagUsage = computed(() => {
  const m = new Map<string, number>();
  props.apps.filter((a) => a.category === fCat.value).forEach((a) => a.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
  return m;
});

const formTagOptions = computed(() => {
  const set = new Map<string, number>(catTagUsage.value);
  tagDefs.value.forEach((d) => { if (!set.has(d.name)) set.set(d.name, 0); });
  return [...set.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
});

const tagColor = (name: string) => tagDefs.value.find((d) => d.name === name)?.color ?? '#8a91a0';

/* 新建标签弹窗：名称 + 拾色器，确认后入库并选中 */
const confirmNewTag = () => {
  const name = tmName.value.trim();
  if (!name) { pushToast('请输入标签名称'); return; }
  if (tagDefs.value.some((d) => d.name === name)) { pushToast('标签已存在'); return; }
  tagDefs.value = [...tagDefs.value, { name, color: tmColor.value }];
  fTags.value = fTags.value.includes(name) ? fTags.value : [...fTags.value, name];
  tagModal.value = false;
  tmName.value = '';
  tmColor.value = TAG_COLOR_PRESETS[0];
};

const cycleIcon = () => {
  const cur = fIcon.value;
  fIcon.value = ICON_PRESETS[((cur ? ICON_PRESETS.indexOf(cur) : -1) + 1) % ICON_PRESETS.length] ?? ICON_PRESETS[0];
};

const nextStep = () => {
  if (!fName.value.trim()) { pushToast('请输入应用名称'); return; }
  if (!fIcon.value) { pushToast('请上传应用图标'); return; }
  if (fPreviews.value.length === 0) { pushToast('请至少上传一张应用主图'); return; }
  step.value = 2;
};

const submit = () => {
  props.onSubmit({
    name: fName.value, desc: fDesc.value, icon: fIcon.value, previews: fPreviews.value,
    cat: fCat.value, note: fNote.value, tags: fTags.value,
    type: fType.value, deploy: fDeploy.value, link: fLink.value, file: fFile.value,
    run: fRun.value, version: fVersion.value, publish: fPublish.value, perm: fPerm.value,
  });
};
</script>

<template>
  <div class="ap-create">
    <div class="ap-create-head">
      <button type="button" class="ap-back" @click="onBack()">
        <AcSvg :d="IC.back" :size="18" />
      </button>
      <h2>{{ editing ? '编辑应用' : '上传新的创作' }}</h2>
    </div>

    <div v-if="step === 1" class="ap-form">
      <label class="ap-label">应用名称<i>*</i></label>
      <div class="ap-field">
        <input v-model="fName" :maxlength="10" placeholder="请输入">
        <span class="ap-count">{{ fName.length }}/10</span>
      </div>

      <label class="ap-label">应用简述</label>
      <div class="ap-field area">
        <textarea v-model="fDesc" :maxlength="80" placeholder="请输入" />
        <span class="ap-count">{{ fDesc.length }}/80</span>
      </div>

      <label class="ap-label">应用图标<i>*</i></label>
      <button type="button" class="ap-upload icon" @click="cycleIcon()">
        <AcLogo v-if="fIcon" :icon="fIcon" :size="96" />
        <template v-else><AcSvg :d="IC.plus" :size="20" /><span>上传图片</span></template>
      </button>
      <div class="ap-hint-line">
        <span class="ap-hint">支持.jpg .png .webp格式</span>
        <button
          type="button"
          class="ap-link"
          @click="fIcon = ICON_PRESETS[Math.floor(Math.random() * ICON_PRESETS.length)]; pushToast('已为你一键生成图标')"
        >
          没有灵感？点击一键生成
        </button>
      </div>

      <label class="ap-label">应用主图<i>*</i></label>
      <div class="ap-main-grid">
        <AcPreviewCard v-for="(p, i) in fPreviews" :key="i" :p="p" />
        <button
          v-if="fPreviews.length < 9"
          type="button"
          class="ap-upload main"
          @click="fPreviews = [...fPreviews, PREVIEW_PRESETS[fPreviews.length % PREVIEW_PRESETS.length]]"
        >
          <AcSvg :d="IC.plus" :size="20" />
          <span>上传图片</span>
        </button>
      </div>
      <span class="ap-hint">至少上传一张图片，最多可上传9张，建议图片比例 16:9</span>

      <label class="ap-label">应用分类<i>*</i></label>
      <div class="ap-cat-line">
        <BubbleSelect class-name="ap-cat-select" :options="cats" :value="fCat" @change="(v) => (fCat = v)" />
        <button type="button" class="ap-cat-manage" @click="onOpenCatDrawer()">类目管理</button>
      </div>

      <label class="ap-label">应用标签</label>
      <div class="ap-tag-line">
        <button type="button" class="ap-tag-add" @click="tagPop = !tagPop">
          <AcSvg :d="IC.plus" :size="12" />
          标签
        </button>
        <span
          v-for="t in fTags"
          :key="t"
          class="ap-tag"
          :style="{ borderColor: tagColor(t), color: tagColor(t), background: `${tagColor(t)}14` }"
        >
          {{ t }}
          <button type="button" @click="fTags = fTags.filter((x) => x !== t)">×</button>
        </span>
      </div>
      <div v-if="tagPop" class="ap-tag-pop">
        <div class="ap-tag-pop-list">
          <button
            v-for="t in formTagOptions.filter((x) => !fTags.includes(x))"
            :key="t"
            type="button"
            class="ap-tag-opt"
            :style="{ borderColor: tagColor(t), color: tagColor(t) }"
            @click="fTags = [...fTags, t]"
          >
            {{ t }}
            <i v-if="(catTagUsage.get(t) ?? 0) > 0">×{{ catTagUsage.get(t) }}</i>
          </button>
          <button type="button" class="ap-tag-opt new" @click="tmName = ''; tmColor = TAG_COLOR_PRESETS[0]; tagModal = true">
            <AcSvg :d="IC.plus" :size="12" />
            新建标签
          </button>
        </div>
      </div>

      <div class="ap-form-foot">
        <button type="button" class="ap-btn-plain" @click="onBack()">返 回</button>
        <button type="button" class="ap-btn-blue" @click="nextStep()">下一步</button>
      </div>
    </div>

    <div v-else class="ap-form">
      <label class="ap-label">应用类型<i>*</i></label>
      <BubbleSelect
        class-name="ap-cat-select"
        :options="APP_TYPES"
        :value="fType || '请选择'"
        @change="(v) => { fType = v; fFile = ''; }"
      />

      <template v-if="fType === 'Web应用'">
        <label class="ap-label">部署模式<i>*</i></label>
        <div class="ap-radio-line">
          <label class="ap-radio"><input type="radio" name="fdeploy" :checked="fDeploy === 'link'" @change="fDeploy = 'link'">外部链接</label>
          <label class="ap-radio"><input type="radio" name="fdeploy" :checked="fDeploy === 'file'" @change="fDeploy = 'file'">文件托管</label>
        </div>
        <template v-if="fDeploy === 'link'">
          <label class="ap-label">链接地址<i>*</i></label>
          <div class="ap-field">
            <input v-model="fLink" :maxlength="100" placeholder="https://">
          </div>
        </template>
        <template v-else>
          <label class="ap-label">上传应用文件<i>*</i></label>
          <button type="button" class="ap-upload-file" @click="fFile = demoFileName(fType)">
            <AcSvg :d="IC.folder" :size="30" filled class-name="ap-uf-ic" />
            <template v-if="fFile">
              <span class="ap-uf-name">已上传{{ fFile }}</span>
              <span class="ap-link" @click.stop="fFile = demoFileName(fType); pushToast('已重新上传')">重新上传</span>
            </template>
            <span v-else class="ap-uf-empty">点击上传应用文件</span>
          </button>
        </template>
        <template v-if="editing">
          <label class="ap-label">版本号<i>*</i></label>
          <div class="ap-field">
            <input v-model="fVersion" :maxlength="20" placeholder="遵循语义化版本规范(主版本.次版本.修订号)">
            <span class="ap-count">{{ fVersion.length }}/20</span>
          </div>
        </template>
        <label class="ap-label">{{ editing ? '更新描述' : '上新描述' }}</label>
        <div class="ap-field area">
          <textarea v-model="fNote" :maxlength="80" placeholder="如：新增批量导出；修复偶发卡顿" />
          <span class="ap-count">{{ fNote.length }}/80</span>
        </div>
        <span class="ap-hint">将展示在首页「应用上新（升级公告）」</span>
        <label class="ap-label">发布方式<i>*</i></label>
        <div class="ap-radio-line">
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'online'" @change="fPublish = 'online'">发布线上</label>
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'test'" @change="fPublish = 'test'">发布测试</label>
        </div>
        <template v-if="fPublish === 'online'">
          <label class="ap-label">权限管理<i>*</i></label>
          <div class="ap-perm-line">
            <span>{{ fPerm }}</span>
            <button type="button" class="ap-link" @click="permPop = !permPop">修改</button>
            <div v-if="permPop" class="ap-perm-pop">
              <button
                v-for="s in PERM_SCOPES"
                :key="s"
                type="button"
                :class="s === fPerm ? 'on' : ''"
                @click="fPerm = s; permPop = false"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </template>
      </template>

      <template v-if="fType === 'EXE程序'">
        <template v-if="editing">
          <label class="ap-label">版本号<i>*</i></label>
          <div class="ap-field">
            <input v-model="fVersion" :maxlength="20" placeholder="遵循语义化版本规范(主版本.次版本.修订号)">
            <span class="ap-count">{{ fVersion.length }}/20</span>
          </div>
        </template>
        <label class="ap-label">上传应用文件<i>*</i></label>
        <button type="button" class="ap-upload-file" @click="fFile = demoFileName(fType)">
          <AcSvg :d="IC.folder" :size="30" filled class-name="ap-uf-ic" />
          <template v-if="fFile">
            <span class="ap-uf-name">已上传{{ fFile }}</span>
            <span class="ap-link" @click.stop="fFile = demoFileName(fType); pushToast('已重新上传')">重新上传</span>
          </template>
          <span v-else class="ap-uf-empty">点击上传应用文件</span>
        </button>
        <label class="ap-label">运行文件<i>*</i></label>
        <div class="ap-run-line">
          <span :class="fRun ? '' : 'ph'">{{ fRun || '选择运行文件路径' }}</span>
          <button type="button" class="ap-link" @click="fRun = 'C:/User/admin'">{{ fRun ? '重新选择' : '选择' }}</button>
        </div>
        <label class="ap-label">{{ editing ? '更新描述' : '上新描述' }}</label>
        <div class="ap-field area">
          <textarea v-model="fNote" :maxlength="80" placeholder="如：新增批量导出；修复偶发卡顿" />
          <span class="ap-count">{{ fNote.length }}/80</span>
        </div>
        <span class="ap-hint">将展示在首页「应用上新（升级公告）」</span>
        <label class="ap-label">发布方式<i>*</i></label>
        <div class="ap-radio-line">
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'online'" @change="fPublish = 'online'">发布线上</label>
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'test'" @change="fPublish = 'test'">发布测试</label>
        </div>
        <template v-if="fPublish === 'online'">
          <label class="ap-label">权限管理<i>*</i></label>
          <div class="ap-perm-line">
            <span>{{ fPerm }}</span>
            <button type="button" class="ap-link" @click="permPop = !permPop">修改</button>
            <div v-if="permPop" class="ap-perm-pop">
              <button
                v-for="s in PERM_SCOPES"
                :key="s"
                type="button"
                :class="s === fPerm ? 'on' : ''"
                @click="fPerm = s; permPop = false"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </template>
      </template>

      <template v-if="fType === '浏览器插件'">
        <template v-if="editing">
          <label class="ap-label">版本号<i>*</i></label>
          <div class="ap-field">
            <input v-model="fVersion" :maxlength="20" placeholder="遵循语义化版本规范(主版本.次版本.修订号)">
            <span class="ap-count">{{ fVersion.length }}/20</span>
          </div>
        </template>
        <label class="ap-label">上传应用文件<i>*</i></label>
        <button type="button" class="ap-upload-file" @click="fFile = demoFileName(fType)">
          <AcSvg :d="IC.folder" :size="30" filled class-name="ap-uf-ic" />
          <template v-if="fFile">
            <span class="ap-uf-name">已上传{{ fFile }}</span>
            <span class="ap-link" @click.stop="fFile = demoFileName(fType); pushToast('已重新上传')">重新上传</span>
          </template>
          <span v-else class="ap-uf-empty">点击上传应用文件</span>
        </button>
        <label class="ap-label">{{ editing ? '更新描述' : '上新描述' }}</label>
        <div class="ap-field area">
          <textarea v-model="fNote" :maxlength="80" placeholder="如：新增批量导出；修复偶发卡顿" />
          <span class="ap-count">{{ fNote.length }}/80</span>
        </div>
        <span class="ap-hint">将展示在首页「应用上新（升级公告）」</span>
        <label class="ap-label">发布方式<i>*</i></label>
        <div class="ap-radio-line">
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'online'" @change="fPublish = 'online'">发布线上</label>
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'test'" @change="fPublish = 'test'">发布测试</label>
        </div>
        <template v-if="fPublish === 'online'">
          <label class="ap-label">权限管理<i>*</i></label>
          <div class="ap-perm-line">
            <span>{{ fPerm }}</span>
            <button type="button" class="ap-link" @click="permPop = !permPop">修改</button>
            <div v-if="permPop" class="ap-perm-pop">
              <button
                v-for="s in PERM_SCOPES"
                :key="s"
                type="button"
                :class="s === fPerm ? 'on' : ''"
                @click="fPerm = s; permPop = false"
              >
                {{ s }}
              </button>
            </div>
          </div>
        </template>
      </template>

      <template v-if="!fType">
        <template v-if="editing">
          <label class="ap-label">版本号<i>*</i></label>
          <div class="ap-field">
            <input v-model="fVersion" :maxlength="20" placeholder="遵循语义化版本规范(主版本.次版本.修订号)">
            <span class="ap-count">{{ fVersion.length }}/20</span>
          </div>
        </template>
        <label class="ap-label">{{ editing ? '更新描述' : '上新描述' }}</label>
        <div class="ap-field area">
          <textarea v-model="fNote" :maxlength="80" placeholder="如：新增批量导出；修复偶发卡顿" />
          <span class="ap-count">{{ fNote.length }}/80</span>
        </div>
        <span class="ap-hint">将展示在首页「应用上新（升级公告）」</span>
        <label class="ap-label">发布方式<i>*</i></label>
        <div class="ap-radio-line">
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'online'" @change="fPublish = 'online'">发布线上</label>
          <label class="ap-radio"><input type="radio" name="fpublish" :checked="fPublish === 'test'" @change="fPublish = 'test'">发布测试</label>
        </div>
      </template>

      <div class="ap-form-foot">
        <button type="button" class="ap-btn-plain" @click="step = 1">上一步</button>
        <button type="button" class="ap-btn-blue" @click="submit()">{{ editing ? '提交更新' : '提交创作' }}</button>
      </div>
    </div>

    <!-- 新建标签弹窗（等价 React 顶层渲染的 ap-mask 弹窗） -->
    <Teleport to="body">
      <div v-if="tagModal" class="ap-mask">
        <div class="ap-modal">
          <div class="ap-modal-head">
            <span>新建标签</span>
            <button type="button" @click="tagModal = false"><AcSvg :d="IC.clear" :size="14" /></button>
          </div>
          <div class="ap-modal-body">
            <div class="ap-tm-field">
              <label>标签名称</label>
              <input v-model="tmName" :maxlength="8" placeholder="请输入标签名称">
            </div>
            <div class="ap-tm-field">
              <label>标签颜色</label>
              <div class="ap-tm-colors">
                <button
                  v-for="c in TAG_COLOR_PRESETS"
                  :key="c"
                  type="button"
                  class="ap-tm-swatch"
                  :class="tmColor === c ? 'on' : ''"
                  :style="{ background: c }"
                  :title="c"
                  @click="tmColor = c"
                />
                <label class="ap-tm-custom" title="自定义颜色">
                  <input type="color" :value="tmColor" @input="tmColor = ($event.target as HTMLInputElement).value">
                  <span :style="{ background: tmColor }" />
                  <em>{{ tmColor }}</em>
                </label>
              </div>
            </div>
            <div class="ap-tm-preview">
              <span>预览</span>
              <span class="ap-tag" :style="{ borderColor: tmColor, color: tmColor, background: `${tmColor}14` }">{{ tmName.trim() || '标签' }}</span>
            </div>
          </div>
          <div class="ap-modal-foot">
            <button type="button" class="ap-btn-plain" @click="tagModal = false">取 消</button>
            <button type="button" class="ap-btn-blue" @click="confirmNewTag()">确 定</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
