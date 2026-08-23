# Funion 项目 UI & 风格设计规范

> 适用范围内全部前端页面（智能运营中心 / 品控中心 / 聚合接待 / 权限设置 / 应用中心）。
> 本规范是**收敛现有视觉**的产物，不是新设计：所有数值、组件、类名均已在代码中落地，新增页面照抄即可。
> 唯一 token 来源：`src/index.css`；全局基础组件层：`src/pages/permission/style.css`（由 `src/main.ts` 全局引入）；共享组件目录：`src/components/`。

---

## 0. 总则与红线

### 0.1 组件策略
- 优先复用 `src/components/` 现有 UI 插件组件（BubbleSelect / Modal / MoreActions / Ellipsis / ToastWrap）与基础层共享类（`.btn` / `.input` / `.select` / `.tag` / `.modal` / `.table` / `.pagination` / `.empty` / `.toast` 等）。
- 能力缺失时，对标 Ant Design / Arco / Element Plus 等主流 B 端设计系统的交互与样式实现，补充进**共享层**，不自创视觉语言，不做花哨装饰。

### 0.2 红线（违反即返工）
1. 不省略组件的 加载 / 空 / 错误 态；
2. 同一区域不允许多个主按钮并存；
3. 不改变现有页面交互流程、弹窗触发逻辑、按钮点击行为；
4. 不加无关装饰；
5. 禁止行内样式（仅允许数据驱动的动态值，见 §4.1）；
6. 禁止硬编码颜色 / 圆角 / 阴影 / 字号，一律引用 token（§1）。

---

## 1. 基础规范（Design Token）

全部定义于 `src/index.css :root`，**改 token 即改全局**，禁止在模块 css 里另起炉灶。

### 1.1 颜色

| Token | 值 | 用途 |
|---|---|---|
| `--color-primary` | `#4f7cff` | 主色：主按钮、链接、选中态、激活态 |
| `--color-primary-hover` | `#6b90ff` | 主色 hover |
| `--color-primary-light` | `#eef3ff` | 主色浅底（选中行 / 激活菜单底） |
| `--color-primary-light-2` | `#f5f8ff` | 更浅主色底（hover 底） |
| `--color-primary-10` | `rgba(79,124,255,.1)` | 主色 10% 透明底 |
| `--color-success` / `-light` | `#00b42a` / `#e8ffea` | 成功 / 正常 / 在线 |
| `--color-warning` / `-light` | `#ff7d00` / `#fff7e8` | 警告 / 休息中 / 待处理 |
| `--color-danger` / `-light` | `#f53f3f` / `#ffece8` | 危险 / 错误 / 删除 / 离线告警 |
| `--color-text` … `--color-text-4` | `#202532 / #445066 / #8b92a1 / #c9cdd4` | 正文 → 次级 → 辅助 → 占位，四级文字 |
| `--color-border` / `-2` | `#e8ebf1` / `#f0f3f7` | 边框 / 浅分割线 |
| `--color-fill` / `-2` | `#fbfcfe` / `#f2f3f7` | 输入件底 / 灰底 |
| `--color-bg` | `#f5f7fb` | 页面底色 |

规则：
- 状态语义只允许 success / warning / danger 三族（含 `-light` 底），禁止再引入其它红绿橙 hex；
- 辅助文字用 `--color-text-3`，占位 / 禁用用 `--color-text-4`（降层级而非降透明度自造灰）；
- 例外白名单：图表系列色板、平台品牌色（淘宝橙等）、头像哈希色。

### 1.2 字号层级

| Token | 值 | 场景 |
|---|---|---|
| `--fs-title` | 16px | 页面标题 / 抽屉标题 / 侧栏品牌 |
| `--fs-lg` | 15px | 弹窗标题、模块强调标题 |
| `--fs-md` | 14px | 卡片标题、表格强调、次级标题 |
| `--fs-base` | 13px | **正文默认**：表格单元格、菜单、表单 |
| `--fs-aux` | 12px | 辅助：提示、标签、时间、图例 |

### 1.3 间距（8px 网格）

常用档位：4 / 8 / 10 / 12 / 16 / 20 / 24。
- 卡片内边距 14–16px；模块（卡片）之间间距 12px；
- 筛选行 `gap: 10px`；表单行 `margin-bottom: 14–18px`；标签之间 6–8px；
- 页面内容区左右 padding 由模块变量控制（如 ops `--ops-content-pad: 26px`）。

### 1.4 圆角

| Token | 值 | 场景 |
|---|---|---|
| `--radius-xs` 4px | 小标签、复选框、代码块 |
| `--radius-sm` 6px | 基础层按钮 / 输入件 / 分页块 |
| `--radius-md` 8px | 菜单项、下拉菜单、小卡片 |
| `--radius-lg` 10px | 业务模块输入件 / 弹窗 |
| `--radius-xl` 12px | 策略卡 / 子卡片 |
| `--radius-2xl` 16px | 大白卡（`.qc-body` 等页面级卡片） |

### 1.5 阴影

| Token | 值 | 场景 |
|---|---|---|
| `--shadow-sm` | `0 1px 4px rgba(26,34,56,.08)` | 激活 tab、轻浮起 |
| `--shadow-md` | `0 8px 28px rgba(26,34,56,.05)` | 白卡静态阴影 |
| `--shadow-lg` | `0 10px 30px rgba(26,34,56,.12)` | 弹窗 / 气泡菜单 |

### 1.6 控件尺寸（两档）

| 档位 | 输入件高 / 圆角 | 按钮高 | 适用范围 |
|---|---|---|---|
| 紧凑档 | 32px / 6px | 32px（sm 28px） | 权限模块（`.pm-page` 基础层默认） |
| 业务档 | 40px / 10px | 38–40px | 运营 / 品控 / 接待（模块根类覆盖，见 `.qc-page .input`） |

新业务页面默认走**业务档**：挂模块根类并像 `quality/style.css` 一样覆盖 `.input/.select` 尺寸。

---

## 2. 组件使用规范

### 2.1 按钮 `.btn`

```html
<button class="btn primary">查询</button>   <!-- 主按钮：同区域仅一个 -->
<button class="btn">重置</button>           <!-- 次要 -->
<button class="btn danger">删除</button>    <!-- 危险：红字，hover 红底 -->
<button class="btn sm">小按钮</button>
<button class="btn" disabled>禁用</button>
```
- 同区域仅一个 `primary`，其余次要 / 文本按钮；
- 表格行内操作用文字链接 `<a>`（`.op a`，危险加 `.danger`），不用按钮；
- 提交类按钮点击后立即 loading / 防重。

### 2.2 输入框 `.input`

```html
<input class="input" placeholder="请输入" />
<div class="input-icon">            <!-- 带图标 -->
  <span class="ic"><IconSearch /></span>
  <input class="input" placeholder="搜索" />
</div>
<input class="input grow input-ro" readonly />  <!-- 只读展示：灰底 -->
```
错误提示放输入框下方（`.bp-err` 模式：`color: var(--color-danger); font-size: 12px`），实时校验。

### 2.3 下拉选择：必须用 `BubbleSelect`，**禁止原生 `<select>`**

Props：`options: (string | { value; label; disabled? })[]`、`value`（受控）、`defaultValue`（非受控）、`disabled`、`class-name`、`style`；事件 `@change(value)`。

```html
<!-- 受控：筛选条件 -->
<BubbleSelect class-name="select rc-bs" :value="draft.company || '公司'"
  :options="[company]" @change="(v: string) => (draft.company = v)" />

<!-- 非受控：装饰型切换（等价原生 select 选中即显示） -->
<BubbleSelect class-name="select rc-bs" default-value="公司" :options="[company]" />

<!-- 禁用展示型 -->
<BubbleSelect class-name="select" disabled :value="label" :options="[label]" />
```
注意：BubbleSelect 根节点是块级 div，横向排布必须放在 flex 容器里（参考 `.rc-filter-row`）。

### 2.4 弹窗 `Modal.vue`

Props：`title`、`sub?`、`size?: 'md' | 'lg' | 'xl'`；插槽：默认 = body，`#foot` = 底部按钮区；遮罩点击与右上 × 触发 `@close`。

```html
<Modal title="转移会话" sub="当前：xx" size="lg" @close="close">
  …表单…
  <template #foot>
    <button class="btn" @click="close">取消</button>
    <button class="btn primary" :disabled="saving" @click="save">确认</button>
  </template>
</Modal>
```
- 危险操作二次确认弹窗，body 用共享警示结构：

```html
<div class="modal-warn">
  <span class="modal-warn-ic" :class="{ danger: modal.danger }"><IconWarn /></span>
  <div class="modal-warn-txt">{{ msg }}</div>
</div>
```
- 弹窗关闭即重置表单；ESC / 遮罩可关。

### 2.5 抽屉

右侧大抽屉复用 `.rc-drawer-mask > .rc-drawer` 模式（920px 宽、左入动画、遮罩可关）；轻量子级弹层 z-index 需高于抽屉（`.pm-page.rc-page .mask { z-index: 1300 }`）。

### 2.6 标签 `.tag`

```html
<span class="tag blue">品质</span><span class="tag green">正常</span>
<span class="tag orange">休息</span><span class="tag red">冻结</span>
```
语义色 = token：blue→primary、green→success、orange→warning、red→danger（浅底 + 深色字）。

### 2.7 表格 `.table` / `.matrix`

- 表头：`--fs-aux`～13px、`--color-text-3`；单元格 13px `--color-text-2`；
- 时间 / 次级列加 `.td-time`，空值占位 `-` 加 `.td-dim`；
- 操作列：最多直出 2 个文字链接，超出收进 `MoreActions`「更多」；
- 列宽用类（`.th-op` 80px / `.th-150` / `.th-14` / `.th-24`），不写行内 width；
- 空态用 `.empty`（嵌入面板用 `.empty.tight` / `.empty.md`），加载态不可省。

### 2.8 更多操作 `MoreActions.vue`

```html
<MoreActions :items="[
  { label: '转交专员', onClick: () => openTransfer(row) },
  { label: '删除', danger: true, onClick: () => confirmDel(row) },
]" />
```
`danger: true` 渲染红色项；可用 `#trigger` 插槽自定义触发器（如「⋯」）。

### 2.9 文本截断 `Ellipsis.vue`

`<Ellipsis class-name="xx" :text="row.title" />`：单行截断，hover 气泡显示全文。**禁止手写 text-overflow 三件套**。

### 2.10 全局提示 `pushToast`

```ts
import { pushToast } from '@/components/toast';
pushToast('已添加');            // 成功
pushToast('请选择目标部门', 'error');
```
增删改完成必须给 toast。

### 2.11 分页 `.pagination`

`共 N 条` + `.pg` 页码块（`.active` 主色底）；尺寸选择用 BubbleSelect（参考 `.rc-pg-size` 98px 宽）。

---

## 3. 模块化布局规范

### 3.1 样式分层（唯一方向，禁止反向）

```
src/index.css            → token 层（唯一来源）
src/pages/permission/style.css → 全局基础组件层（.btn/.input/.modal/.tag/.toast/共享收敛类）
src/pages/<module>/*.css → 模块层：只写本模块布局与覆盖，颜色一律 var(--*)
```
模块页面根节点必须挂根类组合：`pm-page` + 模块类（`qc-page` / `rc-page` / …），基础层类才有作用域。

### 3.2 页面骨架

顶栏 `TopTabs` + 侧栏 `Sidebar`/模块侧栏 + 内容区；内容区 = 若干**白卡模块**纵向排列：

```html
<div class="pm-page qc-page xx-page">
  <div class="qc-body">筛选区</div>
  <div class="qc-body">表格 + 表尾分页</div>
</div>
```
白卡标准：`background:#fff; border:1px solid var(--color-border); border-radius:var(--radius-2xl); padding:14-16px; box-shadow:var(--shadow-md)`。

### 3.3 筛选行

```css
.xx-filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.xx-filter-row .xx-bs { width: 148px; flex: none; }
```
查询 / 重置按钮组 `margin-left: auto`（`.ml-auto`）。

### 3.4 表单布局（基础层共享类）

`.form-item`（label 上、控件下、`margin-bottom:18px`）；双列 `.form-row`（gap 16）；输入+按钮 `.form-row-sm`（gap 8）；等分加 `.grow`；提示 `.form-tip`（变体 `.mt` / `.mb`）；左右式表单参考 `.rc-form .f-row`（label 84px 定宽 + 40px 行高）。

### 3.5 共享收敛类清单（原行内样式收敛，直接复用）

`.grow` `.ml-auto` `.mt0` `.td-time` `.td-dim` `.th-op` `.th-150` `.th-14` `.th-24` `.empty.tight` `.empty.md` `.form-tip.mt` `.form-tip.mb` `.modal-warn(-ic/-txt)` `.form-row(-sm)` `.input-ro`（均定义于 permission/style.css，`.pm-page` 作用域）。

### 3.6 侧栏菜单

- 品控 / 接待侧栏：激活项 `--color-primary-light` 底 + `--color-primary` 字 + 右侧 3px 主色条；
- 运营中心侧栏红色 accent（`#fff0f0/#ff5f62`）为**既有产品设计**，保留不动，新模块不得仿写。

---

## 4. 开发约束（强制）

### 4.1 行内样式白名单
仅以下动态值允许 `:style`：头像哈希色、树形缩进（depth 计算）、图表系列色 / 图例联动、浮层坐标（ctx-menu / Teleport 定位）。其余一律类名 + css。

### 4.2 禁止事项
1. 禁止硬编码 hex（白名单见 §1.1）；需要新色 → 先加 token；
2. 禁止原生 `<select>` / `<option>`；
3. 禁止在模块 css 重复定义基础层已有类（`.btn`/`.input`/`.modal`…），只允许**尺寸档覆盖**；
4. 禁止新建与 `src/components/` 同能的局部组件；
5. 禁止 `!important`（既有遗留除外，新代码零容忍）。

### 4.3 交互默认约定（无需逐条确认）
- 组件覆盖 正常 / 加载 / 空 / 错误 四态；
- 表单实时校验、错误在框下、提交防重并 loading、弹窗关闭即重置；
- 弹窗 / 抽屉遮罩与 ESC 可关，危险操作二次确认；
- 表格空态与加载态齐全，操作过多收敛「更多」；
- hover / active / disabled 状态完整，过渡 150–200ms。

---

## 5. 标准页面示例（照写）

```vue
<script setup lang="ts">
import { ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import MoreActions from '../../components/MoreActions.vue';
import { pushToast } from '../../components/toast';

const kw = ref('');
const platform = ref('');
const loading = ref(false);
const rows = ref<{ id: string; name: string; at: string }[]>([]);
const modal = ref(false);
const saving = ref(false);

const save = () => {
  if (saving.value) return;              // 提交防重
  saving.value = true;
  setTimeout(() => { saving.value = false; modal.value = false; pushToast('已保存'); }, 300);
};
</script>

<template>
  <div class="pm-page qc-page demo-page">
    <!-- 筛选卡 -->
    <div class="qc-body">
      <div class="rc-filter-row">
        <input v-model="kw" class="input" placeholder="搜索名称 / 编码" />
        <BubbleSelect class-name="select rc-bs" :value="platform || '全部平台'"
          :options="['全部平台', '淘宝', '京东']" @change="(v: string) => (platform = v)" />
        <div class="ml-auto">
          <button class="btn">重置</button>
          <button class="btn primary">查询</button>
        </div>
      </div>
    </div>

    <!-- 表格卡 -->
    <div class="qc-body">
      <table v-if="!loading" class="table">
        <thead><tr><th>名称</th><th>创建时间</th><th class="th-op">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td><Ellipsis :text="r.name" /></td>
            <td class="td-time">{{ r.at }}</td>
            <td>
              <div class="op">
                <a @click="modal = true">编辑</a>
                <MoreActions :items="[{ label: '删除', danger: true, onClick: () => pushToast('已删除') }]" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty tight">加载中…</div>
      <div v-if="!loading && rows.length === 0" class="empty">暂无数据</div>
    </div>

    <!-- 弹窗 -->
    <Modal v-if="modal" title="编辑" @close="modal = false">
      <div class="form-item"><label>名称</label><input class="input" placeholder="请输入" /></div>
      <template #foot>
        <button class="btn" @click="modal = false">取消</button>
        <button class="btn primary" :disabled="saving" @click="save">保存</button>
      </template>
    </Modal>
  </div>
</template>

<style>
/* 模块层只写布局，颜色 / 圆角 / 阴影一律 token */
.demo-page .qc-body { margin-bottom: 12px; }
</style>
```

> 示例中「重置」为次要按钮、「查询」为唯一主按钮，体现「同区域仅一个主按钮」。

---

## 附：本次规整落地点（便于追溯）

- token 层重写：`src/index.css`；
- 基础层变量别名化、删除 `.ops-center .pm-page` 主色覆盖：`src/pages/permission/style.css`；
- 主色收敛 `#2e7cf6 / #3d7eff / #1677ff → var(--color-primary)`：AppCenter / OpsCenter / rc / quality / AppTrendModal / data.ts；
- 状态色收敛至 `--color-success|warning|danger`：rc.css / AppCenter.css / OpsCenter.css；
- 13 处原生 select → BubbleSelect：AgentTable / LiveReception / StrategyBoard；
- 行内样式收敛为共享类：permission 模块 16 个文件 + ShopGoodsPage / CreateProductPage / AppCenter。
