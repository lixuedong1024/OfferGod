<template>
  <Transition name="slide-fade">
    <div
      v-if="visible"
      :class="['error-notification', `error-notification--${type}`]"
      role="alert"
      aria-live="assertive"
    >
      <div class="error-notification__icon">
        <svg v-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path d="M15 9l-6 6M9 9l6 6" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2L2 20h20L12 2z" stroke-width="2" stroke-linejoin="round"/>
          <path d="M12 9v4M12 17h.01" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <div class="error-notification__content">
        <h4 class="error-notification__title">{{ title }}</h4>
        <p class="error-notification__message">{{ message }}</p>
        <button
          v-if="action"
          class="error-notification__action"
          @click="handleAction"
        >
          {{ action.label }}
        </button>
      </div>

      <button
        class="error-notification__close"
        @click="close"
        aria-label="关闭通知"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  type?: 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
}

const props = withDefaults(defineProps<Props>(), {
  type: 'error',
  duration: 5000
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
let timer: number | null = null

onMounted(() => {
  visible.value = true

  if (props.duration > 0) {
    timer = window.setTimeout(() => {
      close()
    }, props.duration)
  }
})

const close = () => {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
  }
  setTimeout(() => {
    emit('close')
  }, 300)
}

const handleAction = () => {
  if (props.action) {
    props.action.handler()
    close()
  }
}
</script>

<style scoped>
.error-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 12px;
  z-index: 9999;
  border-left: 4px solid;
}

.error-notification--error {
  border-left-color: #ef4444;
}

.error-notification--warning {
  border-left-color: #f59e0b;
}

.error-notification--info {
  border-left-color: #3b82f6;
}

.error-notification__icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}

.error-notification--error .error-notification__icon {
  color: #ef4444;
}

.error-notification--warning .error-notification__icon {
  color: #f59e0b;
}

.error-notification--info .error-notification__icon {
  color: #3b82f6;
}

.error-notification__content {
  flex: 1;
  min-width: 0;
}

.error-notification__title {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.error-notification__message {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}

.error-notification__action {
  margin-top: 8px;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.error-notification__action:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.error-notification__close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s;
}

.error-notification__close:hover {
  color: #6b7280;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
