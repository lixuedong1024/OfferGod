<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import ChatWindow from '../components/ChatWindow.vue';

const chatStore = useChatStore();
const selectedSessionId = ref<string | null>(null);
const filterStatus = ref<'all' | 'sent' | 'replied' | 'read'>('all');

const filteredSessions = computed(() => {
  // 暂时返回所有会话，后续可以根据 filterStatus 过滤
  return chatStore.sessions;
});

const unreadCount = computed(() => chatStore.totalUnreadCount);
const repliedCount = computed(() => {
  return chatStore.sessions.filter(s => s.messages.length > 0 && s.messages.some(m => m.role === 'boss')).length;
});

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  // 昨天
  if (diff < 48 * 60 * 60 * 1000) {
    return '昨天';
  }

  // 本周
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  }

  // 更早
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
};

// 选择会话
const selectSession = (sessionId: string) => {
  selectedSessionId.value = sessionId;
  chatStore.setCurrentSession(sessionId);
};

// 关闭聊天窗口
const closeChat = () => {
  selectedSessionId.value = null;
  chatStore.setCurrentSession(null);
};

// 全部标记已读
const markAllRead = async () => {
  for (const session of chatStore.sessions) {
    await chatStore.markSessionAsRead(session.id);
  }
};

onMounted(async () => {
  await chatStore.loadSessions();
});
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>沟通</h1>
        <div class="sub">{{ chatStore.sessions.length }} 个会话 · {{ repliedCount }} 条回复 · {{ unreadCount }} 条未读</div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          筛选
        </button>
        <button class="btn" @click="markAllRead">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          全部标记已读
        </button>
      </div>
    </div>

    <div class="tabs">
      <button :class="['tab', { active: filterStatus === 'all' }]" @click="filterStatus = 'all'">
        全部 ({{ chatStore.sessions.length }})
      </button>
      <button :class="['tab', { active: filterStatus === 'replied' }]" @click="filterStatus = 'replied'">
        已回复 ({{ repliedCount }})
      </button>
      <button :class="['tab', { active: filterStatus === 'sent' }]" @click="filterStatus = 'sent'">
        已投递 ({{ chatStore.sessions.length - repliedCount }})
      </button>
    </div>

    <div class="card">
      <div class="card-h">
        <h3>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
          </svg>
          收件箱
        </h3>
        <div class="row-flex">
          <span class="pill accent">实时同步</span>
        </div>
      </div>
      <div class="card-body" style="padding: 0;">
        <div v-if="filteredSessions.length === 0" style="padding: 40px; text-align: center; color: var(--fg-2);">
          <p style="font-size: 14px;">暂无消息</p>
          <p style="font-size: 12px; margin-top: 8px;">开始投递岗位后，这里会显示与 HR 的沟通记录</p>
        </div>
        <div
          v-for="(session, i) in filteredSessions"
          :key="session.id"
          class="message-row"
          :style="{ borderBottom: i < filteredSessions.length - 1 ? '1px solid var(--line-soft)' : 0 }"
          @click="selectSession(session.id)"
        >
          <div class="job-logo" style="width: 36px; height: 36px; font-size: 14px; position: relative;">
            {{ session.companyName[0] }}
            <span v-if="session.unreadCount > 0" class="unread-dot"></span>
          </div>
          <div style="min-width: 0; flex: 1;">
            <div class="row-flex" style="gap: 8px;">
              <span :style="{ fontWeight: session.unreadCount > 0 ? 600 : 500, fontSize: '13px' }">{{ session.companyName }}</span>
              <span class="muted" style="font-size: 11.5px;">· {{ session.jobTitle }}</span>
              <span v-if="session.messages.length > 0" :class="['status-pill', session.messages.some(m => m.role === 'boss') ? 'replied' : 'sent']">
                {{ session.messages.some(m => m.role === 'boss') ? '已回复' : '已投递' }}
              </span>
            </div>
            <div :style="{ fontSize: '12px', color: session.unreadCount > 0 ? 'var(--fg-0)' : 'var(--fg-2)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }">
              {{ session.lastMessage || '暂无消息' }}
            </div>
          </div>
          <div class="muted mono" style="font-size: 11px; text-align: right;">
            {{ session.lastMessageTime ? formatTime(session.lastMessageTime) : '' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天窗口 -->
    <ChatWindow v-if="selectedSessionId" :sessionId="selectedSessionId" @close="closeChat" />
  </div>
</template>

<style scoped>
.message-row {
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 40px 1fr 90px;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s;
}

.message-row:hover {
  background: var(--bg-0);
}

.unread-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  background: var(--accent);
  border-radius: 50%;
  border: 2px solid var(--bg-1);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 500;
}

.status-pill.sent {
  background: var(--bg-2);
  color: var(--fg-2);
}

.status-pill.replied {
  background: var(--accent-bg);
  color: var(--accent);
}

.status-pill.read {
  background: var(--bg-1);
  color: var(--fg-3);
}
</style>
