<template>
  <div class="account-settings">
    <div class="settings-section">
      <h3>修改密码</h3>
      <form @submit.prevent="handleChangePassword" class="form">
        <div class="form-group">
          <label for="currentPassword">当前密码</label>
          <input
            id="currentPassword"
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="newPassword">新密码</label>
          <input
            id="newPassword"
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            required
            minlength="6"
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">确认新密码</label>
          <input
            id="confirmPassword"
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            required
          />
        </div>
        
        <div v-if="passwordError" class="error-message">
          {{ passwordError }}
        </div>
        
        <div v-if="passwordSuccess" class="success-message">
          {{ passwordSuccess }}
        </div>
        
        <button type="submit" :disabled="passwordLoading" class="btn-primary">
          {{ passwordLoading ? '修改中...' : '修改密码' }}
        </button>
      </form>
    </div>

    <div class="settings-section danger-section">
      <h3>账号注销</h3>
      <div class="warning-box">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <h4>警告：此操作不可逆</h4>
          <p>删除账号后，您的所有数据将被永久删除，包括：</p>
          <ul>
            <li>个人资料信息</li>
            <li>发布的帖子和评论</li>
            <li>收藏的内容</li>
            <li>消息记录</li>
          </ul>
          <p>请谨慎操作！</p>
        </div>
      </div>
      
      <form @submit.prevent="handleDeleteAccount" class="form">
        <div class="form-group">
          <label for="deletePassword">请输入密码确认删除</label>
          <input
            id="deletePassword"
            v-model="deleteForm.password"
            type="password"
            placeholder="请输入密码确认删除"
            required
          />
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input
              v-model="deleteForm.confirm"
              type="checkbox"
              required
            />
            <span>我确认了解删除账号的后果，并自愿删除账号</span>
          </label>
        </div>
        
        <div v-if="deleteError" class="error-message">
          {{ deleteError }}
        </div>
        
        <button 
          type="submit" 
          :disabled="deleteLoading || !deleteForm.confirm" 
          class="btn-danger"
        >
          {{ deleteLoading ? '删除中...' : '永久删除账号' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const deleteForm = ref({
  password: '',
  confirm: false
})

const passwordLoading = ref(false)
const deleteLoading = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')
const deleteError = ref('')

const validatePassword = () => {
  if (passwordForm.value.newPassword.length < 6) {
    return '新密码长度至少6位'
  }
  
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    return '两次输入的密码不一致'
  }
  
  return null
}

const handleChangePassword = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''
  
  const validationError = validatePassword()
  if (validationError) {
    passwordError.value = validationError
    return
  }
  
  passwordLoading.value = true
  
  try {
    const result = await authStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    )
    
    if (result.success) {
      passwordSuccess.value = result.message || '密码修改成功'
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    } else {
      passwordError.value = result.error || '密码修改失败'
    }
  } catch (error: any) {
    passwordError.value = error.message || '密码修改失败'
  } finally {
    passwordLoading.value = false
  }
}

const handleDeleteAccount = async () => {
  deleteError.value = ''
  
  if (!deleteForm.value.confirm) {
    deleteError.value = '请确认删除操作'
    return
  }
  
  deleteLoading.value = true
  
  try {
    const result = await authStore.deleteAccount(deleteForm.value.password)
    
    if (result.success) {
      // 账号删除成功，跳转到首页
      router.push('/')
    } else {
      deleteError.value = result.error || '账号删除失败'
    }
  } catch (error: any) {
    deleteError.value = error.message || '账号删除失败'
  } finally {
    deleteLoading.value = false
  }
}
</script>

<style scoped>
.account-settings {
  max-width: 500px;
  margin: 0 auto;
}

.settings-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.settings-section h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input {
  width: auto;
  margin-top: 0.25rem;
}

.btn-primary {
  background: #1890ff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.btn-primary:disabled {
  background: #bae7ff;
  cursor: not-allowed;
}

.error-message {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #a8071a;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.success-message {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.danger-section {
  border-left: 4px solid #ff4d4f;
}

.warning-box {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-content h4 {
  margin: 0 0 0.5rem 0;
  color: #a8071a;
}

.warning-content p {
  margin: 0.5rem 0;
  color: #595959;
  font-size: 0.9rem;
}

.warning-content ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #595959;
  font-size: 0.9rem;
}

.btn-danger {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  width: 100%;
}

.btn-danger:hover:not(:disabled) {
  background: #ff7875;
}

.btn-danger:disabled {
  background: #ffccc7;
  cursor: not-allowed;
}
</style>