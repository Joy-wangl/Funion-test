import { createApp } from 'vue'
import './index.css'
/* 全局基础组件层（.btn/.input/.modal/.tag/.toast 等共享定义，全项目唯一来源） */
import './pages/permission/style.css'
import App from './App.vue'

createApp(App).mount('#root')
