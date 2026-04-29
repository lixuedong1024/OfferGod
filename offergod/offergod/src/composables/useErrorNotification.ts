import { ref } from 'vue';
import type { ErrorInfo } from '@/utils/errorHandler';

interface NotificationOptions {
  error: ErrorInfo;
  onRetry?: () => void;
  duration?: number;
}

const notifications = ref<NotificationOptions[]>([]);

export function useErrorNotification() {
  const show = (options: NotificationOptions) => {
    notifications.value.push(options);

    // 自动关闭
    if (options.duration !== 0) {
      setTimeout(() => {
        dismiss(options);
      }, options.duration || 5000);
    }
  };

  const dismiss = (options: NotificationOptions) => {
    const index = notifications.value.indexOf(options);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  const dismissAll = () => {
    notifications.value = [];
  };

  return {
    notifications,
    show,
    dismiss,
    dismissAll,
  };
}
