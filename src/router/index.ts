import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页 - 连接者论坛' }
  },
  {
    path: '/connection-test',
    name: 'ConnectionTest',
    component: () => import('@/views/ConnectionTestView.vue'),
    meta: { title: '连接测试' }
  },
  {
    path: '/supabase-manager',
    name: 'SupabaseManager',
    component: () => import('@/views/SupabaseManagerView.vue'),
    meta: { title: 'Supabase管理器' }
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('@/views/PostDetailView.vue'),
    meta: { title: '帖子详情' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { title: '注册', requiresGuest: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/profile/:id',
    name: 'UserProfile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '用户资料' }
  },
  {
    path: '/messages',
    name: 'MessageCenter',
    component: () => import('@/views/MessageCenterView.vue'),
    meta: { title: '消息中心', requiresAuth: true }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/SearchView.vue'),
    meta: { title: '搜索' }
  },
  {
    path: '/bookmarks',
    name: 'Bookmarks',
    component: () => import('@/views/BookmarksView.vue'),
    meta: { title: '我的收藏', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 认证检查
router.beforeEach(async (to, from, next) => {
  try {
    console.log('路由守卫：从', from.path, '到', to.path)
    
    // 检查是否访问需要认证的页面
    if (to.meta.requiresAuth) {
      console.log('需要认证的页面:', to.path)
      
      // 检查是否为开发模式
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      console.log('Supabase URL:', supabaseUrl)
      
      if (!supabaseUrl || supabaseUrl.includes('default.supabase.co')) {
        console.log('开发模式：允许访问需要认证的页面')
        next()
        return
      }
      
      // 生产模式下的认证检查
      try {
        const { useAuthStore } = await import('@/stores/auth')
        const authStore = useAuthStore()
        
        console.log('Auth store状态:', {
          user: !!authStore.user,
          profile: !!authStore.profile,
          isAuthenticated: authStore.isAuthenticated
        })
        
        // 如果store中还没有用户信息，尝试初始化
        if (!authStore.user) {
          console.log('Auth store中没有用户信息，尝试初始化...')
          await authStore.initializeAuth()
          console.log('初始化后的状态:', {
            user: !!authStore.user,
            profile: !!authStore.profile,
            isAuthenticated: authStore.isAuthenticated
          })
        }
        
        // 检查认证状态
        if (authStore.isAuthenticated) {
          console.log('用户已认证，允许访问')
          next()
          return
        } else {
          console.log('用户未认证，重定向到登录页面')
          next('/login')
          return
        }
      } catch (storeError) {
        console.error('Auth store操作失败:', storeError)
        console.log('认证检查失败，重定向到登录页面')
        next('/login')
        return
      }
    }
    
    // 检查访客页面
    if (to.meta.requiresGuest) {
      try {
        const { useAuthStore } = await import('@/stores/auth')
        const authStore = useAuthStore()
        
        if (authStore.isAuthenticated) {
          next('/')
          return
        }
      } catch (storeError) {
        // 如果store加载失败，允许继续
      }
    }
    
    console.log('允许访问:', to.path)
    next()
  } catch (error) {
    console.error('路由守卫错误:', error)
    // 如果认证检查失败，允许继续导航以避免阻塞
    next()
  }
})

// 处理路由加载错误
router.onError((error) => {
  console.error('路由加载错误:', error)
  
  // 如果是动态导入错误
  if (error.message.includes('Failed to fetch dynamically imported module')) {
    console.warn('检测到动态导入错误，尝试重新加载页面')
    
    // 延迟一下再刷新，避免循环刷新
    setTimeout(() => {
      // 检查是否已经刷新过
      const lastReload = sessionStorage.getItem('lastRouteErrorReload')
      const now = Date.now()
      
      if (!lastReload || now - parseInt(lastReload) > 10000) { // 10秒内只刷新一次
        sessionStorage.setItem('lastRouteErrorReload', now.toString())
        console.log('重新加载页面以解决动态导入错误')
        window.location.reload()
      } else {
        console.warn('最近已经刷新过页面，避免循环刷新')
      }
    }, 1000)
  }
})

export default router