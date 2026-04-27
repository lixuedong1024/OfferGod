<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useWebSocket } from '@/composables/useWebSocket';
import { Logger } from '@/utils/logger';

interface Props {
  sessionId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const chatStore = useChatStore();
const wsClient = useWebSocket();

const inputMessage = ref('');
const sending = ref(false);
const chatContainer = ref<HTMLElement | null>(null);
const errorMessage = ref('');
const showError = ref(false);

const session = computed(() => chatStore.sessions.find(s => s.id === props.sessionId));

const displayMessages = computed(() => {
  if (!session.value) return [];
  return session.value.messages.map(msg => ({
    ...msg,
    name: msg.role === 'user' ? '我' : session.value.bossName,
    time: formatTime(msg.time),
  }));
});

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 显示错误提示
const showErrorMessage = (message: string, duration = 5000) => {
  errorMessage.value = message;
  showError.value = true;
  setTimeout(() => {
    showError.value = false;
  }, duration);
};

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || sending.value || !session.value) return;

  const content = inputMessage.value.trim();
  inputMessage.value = '';
  sending.value = true;

  try {
    // 获取用户信息
    const data = await chrome.storage.local.get('userInfo');
    const userInfo = data.userInfo;

    if (!userInfo || !userInfo.uid) {
      showErrorMessage('用户信息不存在，请刷新页面后重试');
      Logger.error('用户信息不存在，无法发送消息');
      return;
    }

    // 添加到本地消息列表
    const message = await chatStore.sendMessage(props.sessionId, content);

    // 通过 WebSocket 发送消息
    if (!wsClient.isConnected.value) {
      showErrorMessage('WebSocket 未连接，消息仅保存在本地');
      Logger.warn('WebSocket 未连接，消息仅保存在本地');
      // 更新消息状态为失败
      if (message) {
        const lastMsg = session.value.messages[session.value.messages.length - 1];
        if (lastMsg) {
          await chatStore.updateMessageStatus(lastMsg.id, 'failed');
        }
      }
    } else {
      const result = await wsClient.sendMessage({
        fromUid: userInfo.uid,
        toUid: session.value.bossUid,
        toName: session.value.bossEncryptUid,
        content,
      });

      if (!result.success) {
        showErrorMessage(result.error || '发送失败，请稍后重试');
        Logger.error('WebSocket 发送消息失败', { error: result.error });
        // 更新消息状态为失败
        const lastMsg = session.value.messages[session.value.messages.length - 1];
        if (lastMsg) {
          await chatStore.updateMessageStatus(lastMsg.id, 'failed');
        }
      } else {
        // 更新消息状态为已发送
        const lastMsg = session.value.messages[session.value.messages.length - 1];
        if (lastMsg) {
          await chatStore.updateMessageStatus(lastMsg.id, 'sent');
        }
      }
    }

    await nextTick();
    scrollToBottom();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    showErrorMessage('发送消息时出现错误: ' + errorMsg);
    Logger.error('发送消息失败', { error: errorMsg });
  } finally {
    sending.value = false;
  }
};

// 重试发送失败的消息
const retryMessage = async (messageId: string) => {
  const message = session.value?.messages.find(m => m.id === messageId);
  if (!message || !session.value) return;

  try {
    // 更新消息状态为发送中
    await chatStore.updateMessageStatus(messageId, 'sending');

    // 获取用户信息
    const data = await chrome.storage.local.get('userInfo');
    const userInfo = data.userInfo;

    if (!userInfo || !userInfo.uid) {
      showErrorMessage('用户信息不存在，请刷新页面后重试');
      await chatStore.updateMessageStatus(messageId, 'failed');
      return;
    }

    if (!wsClient.isConnected.value) {
      showErrorMessage('WebSocket 未连接，请稍后重试');
      await chatStore.updateMessageStatus(messageId, 'failed');
      return;
    }

    const result = await wsClient.sendMessage({
      fromUid: userInfo.uid,
      toUid: session.value.bossUid,
      toName: session.value.bossEncryptUid,
      content: message.content,
    });

    if (result.success) {
      await chatStore.updateMessageStatus(messageId, 'sent');
      showErrorMessage('消息重发成功', 2000);
    } else {
      await chatStore.updateMessageStatus(messageId, 'failed');
      showErrorMessage(result.error || '重发失败，请稍后重试');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    showErrorMessage('重发消息时出现错误: ' + errorMsg);
    await chatStore.updateMessageStatus(messageId, 'failed');
  }
};

// 滚动到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

// 处理回车发送
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// 监听 WebSocket 消息
const handleWebSocketMessage = async (event: CustomEvent) => {
  const messages = event.detail;
  Logger.debug('收到 WebSocket 消息', { count: messages.length });

  // 获取用户信息
  const data = await chrome.storage.local.get('userInfo');
  const userInfo = data.userInfo;

  if (!userInfo || !userInfo.uid) {
    Logger.warn('用户信息不存在，无法处理消息');
    return;
  }

  // 处理接收到的消息
  messages.forEach((msg: any) => {
    if (msg.to.uid === userInfo.uid && session.value && msg.from.uid === session.value.bossUid) {
      // 添加到当前会话
      chatStore.addMessage(props.sessionId, {
        role: 'boss',
        content: msg.body.text || '',
        time: parseInt(msg.time) || Date.now(),
        status: 'read',
      });
    }
  });

  nextTick(() => scrollToBottom());
};

// 监听 WebSocket 错误
const handleWebSocketError = (event: CustomEvent) => {
  showErrorMessage(event.detail.message);
};

// 监听 WebSocket 关闭
const handleWebSocketClose = (event: CustomEvent) => {
  if (event.detail.code !== 1000) {
    showErrorMessage(event.detail.message);
  }
};

onMounted(() => {
  scrollToBottom();
  // 监听 WebSocket 消息事件
  window.addEventListener('offergod:chat:message', handleWebSocketMessage as EventListener);
  window.addEventListener('offergod:websocket:error', handleWebSocketError as EventListener);
  window.addEventListener('offergod:websocket:close', handleWebSocketClose as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('offergod:chat:message', handleWebSocketMessage as EventListener);
  window.removeEventListener('offergod:websocket:error', handleWebSocketError as EventListener);
  window.removeEventListener('offergod:websocket:close', handleWebSocketClose as EventListener);
});
</script>

<template>
  <div class="chat-overlay" @click.self="emit('close')">
    <div class="chat-window">
      <!-- 错误提示 -->
      <transition name="slide-down">
        <div v-if="showError" class="error-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ errorMessage }}</span>
          <button class="btn-close" @click="showError = false">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </transition>

      <div class="chat-header">
        <div class="row-flex" style="gap: 10px;">
          <div class="job-logo" style="width: 32px; height: 32px; font-size: 13px;">{{ session?.companyName[0] }}</div>
          <div>
            <div style="font-weight: 600; font-size: 13px;">{{ session?.companyName }}</div>
            <div class="muted" style="font-size: 11px;">{{ session?.jobTitle }}</div>
          </div>
        </div>
        <div class="row-flex" style="gap: 8px;">
          <span v-if="wsClient.isConnected.value" class="pill accent" style="font-size: 10px;">已连接</span>
          <span v-else class="pill" style="font-size: 10px; background: var(--bg-2); color: var(--fg-2);">未连接</span>
          <button class="btn btn-ghost sm" @click="emit('close')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div ref="chatContainer" class="chat-messages">
        <div v-if="displayMessages.length === 0" style="text-align: center; padding: 40px; color: var(--fg-2);">
          <p style="font-size: 13px;">暂无消息</p>
          <p style="font-size: 11px; margin-top: 8px;">开始与 HR 沟通吧</p>
        </div>
        <div v-for="msg in displayMessages" :key="msg.id" :class="['chat-message', msg.role]">
          <div class="message-avatar">{{ msg.name[0] }}</div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-name">{{ msg.name }}</span>
              <span class="message-time">{{ msg.time }}</span>
              <span v-if="msg.role === 'user' && msg.status === 'sending'" class="message-status">发送中...</span>
              <span v-else-if="msg.role === 'user' && msg.status === 'failed'" class="message-status" style="color: var(--danger);">
                发送失败
                <button class="btn-retry" @click="retryMessage(msg.id)" title="重试">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </button>
              </span>
            </div>
            <div class="message-text">{{ msg.content }}</div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <textarea
          v-model="inputMessage"
          placeholder="输入消息... (Enter发送，Shift+Enter换行)"
          rows="3"
          @keydown="handleKeydown"
        ></textarea>
        <div class="chat-input-actions">
          <div class="muted" style="font-size: 11px;">{{ inputMessage.length }} / 500</div>
          <button class="btn btn-primary sm" @click="sendMessage" :disabled="!inputMessage.trim() || sending">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
}

.chat-window {
  width: 600px;
  max-width: 90vw;
  height: 700px;
  max-height: 85vh;
  background: rgba(20, 21, 26, 0.98);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  position: relative;
}

.error-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: var(--danger);
  color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  z-index: 10;
  border-radius: 12px 12px 0 0;
}

.error-banner .btn-close {
  margin-left: auto;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.error-banner .btn-close:hover {
  opacity: 1;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.chat-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--bg-3);
  border-radius: 3px;
}

.chat-message {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.chat-message.user .message-avatar {
  background: var(--bg-3);
  color: var(--fg-0);
}

.message-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-message.user .message-content {
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.message-name {
  font-weight: 600;
  color: var(--fg-1);
}

.message-time {
  color: var(--fg-3);
}

.message-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-retry {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.btn-retry:hover {
  opacity: 1;
}

.message-text {
  padding: 10px 14px;
  background: var(--bg-0);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.chat-message.user .message-text {
  background: var(--accent);
  color: white;
}

.chat-input {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-input textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  font-family: inherit;
  color: var(--fg-0);
}

.chat-input textarea:focus {
  border-color: var(--accent);
}

.chat-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
