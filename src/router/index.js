import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'LINE CRM 系統'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由導航守衛 - 設定頁面標題
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'LINE CRM 系統'
  next()
})

export default router
