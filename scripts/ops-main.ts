/* 独立展示页入口：仅渲染智能运营中心完整功能
   （运营驾驶舱 / 运营管理 / 商机中心 / 店铺商品 / 商品创建 / 任务中心 / AI助手 / 权限设置），
   不含同级顶部 tab。CSS 引入顺序与 src/main.ts 保持一致：token → 基础组件层 → 布局层 */
import { createApp } from 'vue';
import '../src/index.css';
import '../src/pages/permission/style.css';
import '../src/App.css';
import OpsApp from './OpsApp.vue';

createApp(OpsApp).mount('#root');
