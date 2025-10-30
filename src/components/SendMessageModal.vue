<template>
  <div class="message-modal-overlay" @click="$emit('close')">
    <div class="message-modal" @click.stop>
      <div class="modal-header">
        <h5 class="modal-title">
          <UserAvatar :user="recipient" size="sm" />
          发送私信给 {{ recipient.username }}
        </h5>
        <button type="button" class="btn-close" @click="$emit('close')"></button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSendMessage">
          <div class="mb-3">
            <label for="message-content" class="form-label">消息内容</label>
            <textarea
              id="message-content"
              v-model="messageContent"
              class="form-control"
              rows="4"
              placeholder="输入你想说的话..."
              maxlength="1000"
              required
            ></textarea>
            <div class="form-text">
              {{ messageContent.length }}/1000 字符
            </div>
          </div>

          <div class="message-tips">
            <h6>温馨提示：</h6>
            <ul>
              <li>请友善交流，尊重他人</li>
              <li>禁止发送垃圾信息或不当内容</li>
              <li>消息发送后无法撤回</li>
            </ul>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              取消
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="!messageContent.trim() || isSending"
            >
              <span v-if="isSending">
                <span class="spinner-border spinner-border-sm me-2"></span>
                发送中...
              </span>
              <span v-else>
                <i class="bi bi-send me-2"></i>
                发送消息
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessageStore } from '@/stores/messages'
import UserAvatar from './UserAvatar.vue'

interface Props {
  recipient: {
    id: string
    username: string
    avatar_url: string | null
    level: number
  }
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  sent: []
}>()

const messageStore = useMessageStore()
const { sendMessage } = messageStore

const messageContent = ref('')
const isSending = ref(false)

const handleSendMessage = async () => {
  if (!messageContent.value.trim()) return

  isSending.value = true
  try {
    const result = await sendMessage(props.recipient.id, messageContent.value.trim())
    
    if (result.success) {
      messageContent.value = ''
      emit('sent')
      emit('close')
    } else {
      alert('发送失败：' + (result.error || '未知错误'))
    }
  } catch (error) {
    console.error('发送消息失败:', error)
    alert('发送失败，请稍后重试')
  } finally {
    isSending.value = false
  }
}
</script>

<style scoped>
.message-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  padding: 20px;
}

.message-modal {
  background: white;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #212529;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-close:hover {
  background-color: #f8f9fa;
}

.modal-body {
  padding: 20px;
}

.form-label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.form-control {
  border: 1px solid #ced4da;
  border-radius: 6px;
  padding: 12px;
  font-size: 16px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.form-text {
  font-size: 14px;
  color: #6c757d;
  margin-top: 4px;
}

.message-tips {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.message-tips h6 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.message-tips ul {
  margin: 0;
  padding-left: 20px;
}

.message-tips li {
  font-size: 14px;
  color: #6c757d;
  margin-bottom: 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #5c636a;
  border-color: #565e64;
}

.btn-primary {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0b5ed7;
  border-color: #0a58ca;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

.spinner-border {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  vertical-align: -0.125em;
  border: 0.25em solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border 0.75s linear infinite;
}

@keyframes spinner-border {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 576px) {
  .message-modal-overlay {
    padding: 10px;
  }
  
  .message-modal {
    max-width: 100%;
  }
  
  .modal-header,
  .modal-body {
    padding: 16px;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>