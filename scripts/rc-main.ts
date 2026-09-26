/* 独立展示页入口：仅渲染聚合接待完整功能（左侧菜单 + 客服管理/智能分流/实时会话等全部视图），
   不含同级顶部 tab。CSS 引入顺序与 src/main.ts 保持一致：token → 基础组件层 → 布局层 */
import { createApp } from 'vue';
import '../src/index.css';
import '../src/pages/permission/style.css';
import '../src/App.css';
import RcApp from './RcApp.vue';

createApp(RcApp).mount('#root');
