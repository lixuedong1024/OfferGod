<script setup lang="ts">
import { ref, onMounted, onErrorCaptured } from 'vue';
import { useModel } from '@/composables/useModel';
import { useTheme } from '@/composables/useTheme';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';
import { errorHandler, ErrorType } from '@/utils/errorHandler';
import { useErrorNotification } from '@/composables/useErrorNotification';
import { Logger } from '@/utils/logger';
import Dashboard from './pages/Dashboard.vue';
import Jobs from './pages/Jobs.vue';
import Workflow from './pages/Workflow.vue';
import Settings from './pages/Settings.vue';
import SearchConfig from './pages/SearchConfig.vue';
import Analytics from './pages/Analytics.vue';
import Inbox from './pages/Inbox.vue';
import DebugLogs from './pages/DebugLogs.vue';
import AutoDelivery from './pages/AutoDelivery.vue';
import DeliveryHistory from './pages/DeliveryHistory.vue';
import Calendar from './pages/Calendar.vue';
import TemplateManager from './pages/TemplateManager.vue';

const modelStore = useModel();
const { currentTheme, toggleTheme, loadTheme } = useTheme();
const chatStore = useChatStore();
const userStore = useUserStore();
const { show } = useErrorNotification();

// 错误类型到通知类型的映射
const errorTypeMap: Record<ErrorType, 'error' | 'warning' | 'info'> = {
  [ErrorType.NETWORK]: 'error',
  [ErrorType.BUSINESS]: 'warning',
  [ErrorType.SYSTEM]: 'error',
  [ErrorType.UNKNOWN]: 'error',
};

// 错误类型到标题的映射
const errorTitleMap: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络错误',
  [ErrorType.BUSINESS]: '操作失败',
  [ErrorType.SYSTEM]: '系统错误',
  [ErrorType.UNKNOWN]: '未知错误',
};

// 设置错误处理器的通知回调
errorHandler.setNotificationCallback((error, onRetry) => {
  show({
    type: errorTypeMap[error.type],
    title: errorTitleMap[error.type],
    message: error.message,
    duration: 5000,
    action: onRetry ? {
      label: '重试',
      handler: onRetry
    } : undefined
  });
});

// 全局错误捕获
onErrorCaptured((err, instance, info) => {
  console.error('组件错误:', err, info);
  errorHandler.handleSystemError(err);
  // 阻止错误继续传播
  return false;
});

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: '主面板',
    items: [
      { id: 'dashboard', label: '工作台', icon: 'dashboard' },
      { id: 'workflow', label: '工作流', icon: 'workflow', badge: '8' },
    ],
  },
  {
    group: '求职',
    items: [
      { id: 'jobs', label: '岗位', icon: 'jobs', badge: '47' },
      { id: 'delivery', label: '自动投递', icon: 'rocket' },
      { id: 'history', label: '投递历史', icon: 'history' },
      { id: 'inbox', label: '沟通', icon: 'inbox' },
      { id: 'calendar', label: '面试日程', icon: 'calendar', badge: '5' },
    ],
  },
  {
    group: '配置',
    items: [
      { id: 'search', label: '搜索条件', icon: 'sliders' },
      { id: 'templates', label: '模板管理', icon: 'file-text' },
      { id: 'analytics', label: '数据看板', icon: 'chart' },
      { id: 'logs', label: '调试日志', icon: 'settings' },
      { id: 'settings', label: '设置', icon: 'settings' },
    ],
  },
];

const currentPage = ref('dashboard');
const engineRunning = ref(true);

function navigate(page: string) {
  currentPage.value = page;
}

function closeApp() {
  const container = document.getElementById('offergod-app');
  if (container) {
    container.remove();
  }
}

// 获取沟通徽章数字
function getInboxBadge() {
  return chatStore.totalUnreadCount > 0 ? String(chatStore.totalUnreadCount) : undefined;
}

onMounted(async () => {
  loadTheme();
  await modelStore.initModel();
  await chatStore.loadSessions();
  await userStore.loadUserInfo();

  // 全局未捕获错误
  window.addEventListener('error', (event) => {
    Logger.error('全局错误', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    errorHandler.handleSystemError(
      new Error(`${event.message} at ${event.filename}:${event.lineno}`)
    );
  });

  // Promise 未捕获错误
  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('未处理的Promise拒绝', {
      reason: event.reason,
    });

    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    errorHandler.handleSystemError(error);
  });
});
</script>

<template>
  <div class="app">
    <!-- 关闭按钮 -->
    <button class="close-btn" @click="closeApp" title="关闭">✕</button>

    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark"></div>
        <div>
          <div class="brand-name">OfferGod</div>
          <div class="brand-sub mono">v1.0 · 神之加持</div>
        </div>
      </div>

      <template v-for="group in NAV" :key="group.group">
        <div class="nav-group-label">{{ group.group }}</div>
        <div
          v-for="item in group.items"
          :key="item.id"
          :class="['nav-item', { active: currentPage === item.id }]"
          @click="navigate(item.id)"
        >
          <span class="ico">
            <svg v-if="item.icon === 'dashboard'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <svg v-else-if="item.icon === 'workflow'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <svg v-else-if="item.icon === 'jobs'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <svg v-else-if="item.icon === 'rocket'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            </svg>
            <svg v-else-if="item.icon === 'history'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M12 7v5l4 2"></path>
            </svg>
            <svg v-else-if="item.icon === 'inbox'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
            </svg>
            <svg v-else-if="item.icon === 'calendar'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <svg v-else-if="item.icon === 'sliders'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="21" x2="4" y2="14"></line>
              <line x1="4" y1="10" x2="4" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12" y2="3"></line>
              <line x1="20" y1="21" x2="20" y2="16"></line>
              <line x1="20" y1="12" x2="20" y2="3"></line>
              <line x1="1" y1="14" x2="7" y2="14"></line>
              <line x1="9" y1="8" x2="15" y2="8"></line>
              <line x1="17" y1="16" x2="23" y2="16"></line>
            </svg>
            <svg v-else-if="item.icon === 'file-text'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <svg v-else-if="item.icon === 'chart'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            <svg v-else-if="item.icon === 'settings'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m13.2 5.2l-4.2-4.2m0-6l-4.2-4.2"></path>
            </svg>
            <span v-else>{{ item.icon }}</span>
          </span>
          <span>{{ item.label }}</span>
          <span v-if="item.id === 'inbox' && chatStore.totalUnreadCount > 0" class="badge">{{ chatStore.totalUnreadCount }}</span>
          <span v-else-if="item.badge" class="badge">{{ item.badge }}</span>
        </div>
      </template>

      <div class="sidebar-foot">
        <div class="avatar">{{ userStore.userInfo?.name?.[0] || '张' }}</div>
        <div class="user-meta">
          <span class="user-name">{{ userStore.userInfo?.name || '张工' }}</span>
          <span class="user-status">
            <span class="dot"></span>
            {{ engineRunning ? '引擎运行中' : '已暂停' }}
          </span>
        </div>
      </div>
    </aside>

    <main class="main">
      <div class="topbar">
        <div class="crumbs">
          <span class="cur">{{ NAV.flatMap(g => g.items).find(i => i.id === currentPage)?.label }}</span>
        </div>
        <div class="topbar-spacer"></div>

        <!-- 右上角工具栏 -->
        <div class="topbar-actions">
          <!-- 引擎状态 -->
          <div :class="['engine-indicator', { paused: !engineRunning }]" title="引擎运行状态">
            <span class="pulse"></span>
            <span class="engine-text">平衡模式</span>
            <span class="engine-count">16/80</span>
          </div>

          <!-- 主题切换 -->
          <button class="icon-btn" @click="toggleTheme" :title="currentTheme === 'dark' ? '浅色' : '深色'">
            <svg v-if="currentTheme === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>

          <!-- 工作台快捷入口 -->
          <button class="icon-btn" @click="navigate('dashboard')" title="工作台">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>

          <!-- 设置快捷入口 -->
          <button class="icon-btn" @click="navigate('settings')" title="设置">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m13.2 5.2l-4.2-4.2m0-6l-4.2-4.2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="content">
        <Dashboard v-if="currentPage === 'dashboard'" />
        <Jobs v-else-if="currentPage === 'jobs'" />
        <AutoDelivery v-else-if="currentPage === 'delivery'" />
        <DeliveryHistory v-else-if="currentPage === 'history'" />
        <Calendar v-else-if="currentPage === 'calendar'" />
        <Inbox v-else-if="currentPage === 'inbox'" />
        <Workflow v-else-if="currentPage === 'workflow'" />
        <SearchConfig v-else-if="currentPage === 'search'" />
        <Analytics v-else-if="currentPage === 'analytics'" />
        <DebugLogs v-else-if="currentPage === 'logs'" />
        <Settings v-else-if="currentPage === 'settings'" />
        <div v-else class="empty">功能开发中...</div>
      </div>
    </main>
  </div>
</template>

<style>
@import './assets/styles.css';
@import './assets/theme-patch.css';

/* 玻璃模糊背景 */
.app {
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* 或者使用完全不透明背景 */
/* .app {
  background: oklch(0.16 0.008 240);
} */

.close-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 18px;
  cursor: pointer;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* 顶栏右侧工具栏 */
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 引擎状态指示器 */
.engine-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(20, 184, 166, 0.08);
  border: 1px solid rgba(20, 184, 166, 0.2);
  font-size: 11px;
  transition: all 0.2s;
}

.engine-indicator .pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: oklch(0.75 0.15 180);
  animation: pulse 2s ease-in-out infinite;
}

.engine-indicator.paused .pulse {
  background: oklch(0.65 0.1 60);
  animation: none;
}

.engine-indicator .engine-text {
  color: var(--fg-1);
  font-weight: 500;
}

.engine-indicator .engine-count {
  color: var(--fg-2);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 10px;
}

/* 图标按钮 */
.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(51, 65, 85, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--fg-1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(51, 65, 85, 0.5);
  border-color: rgba(20, 184, 166, 0.3);
  color: var(--fg-0);
  transform: translateY(-1px);
}

.icon-btn:active {
  transform: translateY(0);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0);
  }
}
</style>
