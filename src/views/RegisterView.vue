<template>
  <div class="register-container">
    <div class="register-form">
      <h2>注册连接者论坛</h2>
      
      <form @submit.prevent="handleRegister" class="form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="请输入用户名"
            required
            minlength="3"
            maxlength="20"
          />
        </div>
        
        <div class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="请输入邮箱"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            required
            minlength="6"
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            required
          />
        </div>
        
        <button type="submit" :disabled="loading" class="register-btn">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>
      
      <!-- 错误消息显示 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      
      <div class="form-footer">
        <p>已有账号？ <RouterLink to="/login" class="link">立即登录</RouterLink></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loading = ref(false)
const errorMessage = ref('')

const validateForm = () => {
  if (form.value.username.length < 3) {
    errorMessage.value = '用户名至少需要3个字符'
    return false
  }
  
  if (form.value.password.length < 6) {
    errorMessage.value = '密码至少需要6个字符'
    return false
  }
  
  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return false
  }
  
  errorMessage.value = ''
  return true
}

const handleRegister = async () => {
  console.log('🔄 注册按钮被点击')
  
  if (!validateForm()) {
    console.log('❌ 表单验证失败')
    return
  }
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    console.log('📧 注册信息:', {
      username: form.value.username,
      email: form.value.email
    })
    
    // 检查是否使用默认配置
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes('default.supabase.co')) {
      // 开发模式：模拟注册成功
      console.log('🔧 开发模式：模拟注册流程')
      
      // 模拟注册成功后的跳转
      setTimeout(() => {
        console.log('✅ 开发模式注册成功')
        loading.value = false
        alert('注册成功！请配置真实的Supabase环境变量以使用完整功能。')
        router.push('/login')
      }, 1000)
      return
    }
    
    // 真实环境：调用Supabase注册
    console.log('🔐 尝试真实Supabase注册...')
    const result = await authStore.signUp(
      form.value.email,
      form.value.password,
      form.value.username
    )
    
    if (!result.success) {
      console.error('❌ 注册失败:', result.error)
      
      // 提供更友好的错误提示
      if (result.error.includes('Email not confirmed')) {
        errorMessage.value = '✅ 注册成功！请检查您的邮箱并点击确认链接完成注册。'
      } else if (result.error.includes('row-level security')) {
        errorMessage.value = '✅ 注册成功！但用户资料创建受限。请联系管理员修复数据库权限。'
      } else if (result.error.includes('User already registered')) {
        errorMessage.value = '❌ 该邮箱已被注册，请使用其他邮箱或尝试登录。'
      } else {
        errorMessage.value = result.error || '注册失败，请稍后重试'
      }
      return
    }
    
    // 注册成功，显示详细成功消息
    console.log('✅ 注册成功:', result.message)
    
    // 显示成功消息，指导用户下一步操作
    if (result.message && result.message.includes('邮箱验证')) {
      errorMessage.value = '✅ 注册成功！请检查您的邮箱并点击确认链接完成注册。'
    } else {
      errorMessage.value = '✅ 注册成功！正在跳转到登录页面...'
    }
    
    // 延迟跳转，让用户看到成功消息
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } catch (error) {
    console.error('❌ 注册异常:', error)
    errorMessage.value = '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-form {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.register-form h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.register-btn {
  width: 100%;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.register-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.register-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  background: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 12px;
  border-radius: 6px;
  margin: 15px 0;
  text-align: center;
  font-size: 14px;
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}
</style>