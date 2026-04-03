import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/workspace'
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('../pages/PatientList.vue'),
    meta: {
      title: '患者列表',
      requiresAuth: false
    }
  },
  {
    path: '/patient/:id/emr',
    name: 'PatientEmrDetail',
    component: () => import('../pages/PatientEmrDetail.vue'),
    meta: {
      title: '病历详情',
      requiresAuth: false
    }
  },
  {
    path: '/patient/:id',
    name: 'PatientDetail',
    component: () => import('../pages/PatientEmrDetail.vue'),
    meta: {
      title: '患者详情',
      requiresAuth: false
    }
  },
  {
    path: '/editor',
    name: 'EditorDemo',
    component: () => import('../examples/ClinicalEditorExample.vue'),
    meta: {
      title: '编辑器演示',
      requiresAuth: false
    }
  },
  {
    path: '/medical-workspace',
    name: 'MedicalWorkspace',
    component: () => import('../pages/MedicalWorkspace.vue'),
    meta: {
      title: '病历工作站',
      requiresAuth: false
    }
  },
  {
    path: '/template-manager',
    name: 'TemplateManager',
    component: () => import('../pages/TemplateManager.vue'),
    meta: {
      title: '模板管理',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFound.vue'),
    meta: {
      title: '页面未找到'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - 病历工作站`
  }
  console.log('[Router] 导航到:', to.path, to.params)
  next()
})

router.afterEach((to) => {
  console.log('[Router] 导航完成:', to.path)
})

export default router
