import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'
import { startup } from '@/utils/startup'

// 创建Vue应用
const app = createApp(App)

// 全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue全局错误:', err)
  console.error('组件实例:', instance)
  console.error('错误信息:', info)
}

// 处理未捕获的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason)
  // 防止默认的控制台错误输出
  event.preventDefault()
})

// 使用插件
app.use(createPinia())
app.use(router)

// 挂载应用
app.mount('#app')

// 启动应用初始化
startup().catch(console.error)