<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ErrorInfo } from '@/utils/errorHandler';

interface Props {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const props = defineProps<Props>();

const visible = ref(true);

const errorIcon = computed(() => {
  switch (props.error.type) {
    case 'network':
      return '🌐';
    case 'business':
      return '⚠️';
    case 'system':
      return '❌';
    default:
      return '❓';
  }
});

const errorTitle = computed(() => {
  switch (props.error.type) {
    case 'network':
      return '网络错误';
    case 'business':
      return '操作失败';
    case 'system':
      return '系统错误';
    default:
      return '错误';
  }
});

const dismiss = () => {
  visible.value = false;
  props.onDismiss?.();
};

const retry = () => {
  visible.value = false;
  props.onRetry?.();
};
</script>

<template>
  <Transition name="slide-fade">
    <div v-if="visible" class="error-notification">
      <div class="error-icon">{{ errorIcon }}</div>
      <div class="error-content">
        <div class="error-title">{{ errorTitle }}</div>
        <div class="error-message">{{ error.message }}</div>
        <div v-if="error.detail" class="error-detail">{{ error.detail }}</div>
      </div>
      <div class="error-actions">
        <button v-if="onRetry" class="btn-retry" @click="retry">重试</button>
        <button class="btn-dismiss" @click="dismiss">关闭</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.error-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  background: rgba(239, 68, 68, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  gap: 12px;
  z-index: 10000;
  color: white;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.error-message {
  font-size: 13px;
  opacity: 0.9;
}

.error-detail {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  font-family: monospace;
  max-height: 60px;
  overflow: auto;
}

.error-actions {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.btn-retry,
.btn-dismiss {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry:hover,
.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.2);
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>
