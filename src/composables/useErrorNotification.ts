import { ref, h, render } from 'vue'
import ErrorNotification from '../components/ErrorNotification.vue'

interface NotificationOptions {
  type?: 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    handler: () => void
  }
}

interface NotificationInstance {
  id: string
  container: HTMLDivElement
}

const notifications = ref<NotificationInstance[]>([])

export function useErrorNotification() {
  const show = (options: NotificationOptions) => {
    const id = `notification-${Date.now()}-${Math.random()}`
    const container = document.createElement('div')
    container.id = id
    document.body.appendChild(container)

    const instance: NotificationInstance = {
      id,
      container
    }

    notifications.value.push(instance)

    const vnode = h(ErrorNotification, {
      ...options,
      onClose: () => {
        hide(id)
      }
    })

    render(vnode, container)

    return id
  }

  const hide = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      const instance = notifications.value[index]
      render(null, instance.container)
      document.body.removeChild(instance.container)
      notifications.value.splice(index, 1)
    }
  }

  const clear = () => {
    notifications.value.forEach(instance => {
      render(null, instance.container)
      document.body.removeChild(instance.container)
    })
    notifications.value = []
  }

  return {
    show,
    hide,
    clear
  }
}
