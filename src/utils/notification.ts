import { Logger } from '@/utils/logger';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationOptions {
  title: string;
  message: string;
  priority?: NotificationPriority;
  iconUrl?: string;
  requireInteraction?: boolean;
  buttons?: Array<{
    title: string;
    iconUrl?: string;
  }>;
  contextMessage?: string;
  tag?: string; // 用于分组和去重
}

export interface NotificationGroup {
  id: string;
  name: string;
  enabled: boolean;
  priority: NotificationPriority;
}

const PERMISSION_KEY = 'notification_permission';
const GROUPS_KEY = 'notification_groups';

// 默认通知分组
const DEFAULT_GROUPS: NotificationGroup[] = [
  { id: 'message', name: '新消息通知', enabled: true, priority: 'high' },
  { id: 'reply', name: 'HR 回复通知', enabled: true, priority: 'urgent' },
  { id: 'apply', name: '投递成功通知', enabled: true, priority: 'normal' },
  { id: 'reminder', name: '提醒通知', enabled: true, priority: 'normal' },
  { id: 'system', name: '系统通知', enabled: true, priority: 'low' },
];

/**
 * 通知管理器
 */
export class NotificationManager {
  private permissionGranted = false;
  private groups: NotificationGroup[] = [];

  constructor() {
    this.init();
  }

  /**
   * 初始化
   */
  async init() {
    await this.loadPermission();
    await this.loadGroups();
  }

  /**
   * 加载通知权限状态
   */
  async loadPermission() {
    try {
      const data = await chrome.storage.local.get(PERMISSION_KEY);
      this.permissionGranted = data[PERMISSION_KEY] || false;
      Logger.debug('加载通知权限状态', { granted: this.permissionGranted });
    } catch (error) {
      Logger.error('加载通知权限失败', { error: String(error) });
    }
  }

  /**
   * 加载通知分组配置
   */
  async loadGroups() {
    try {
      const data = await chrome.storage.local.get(GROUPS_KEY);
      this.groups = data[GROUPS_KEY] || DEFAULT_GROUPS;
      Logger.debug('加载通知分组配置', { count: this.groups.length });
    } catch (error) {
      Logger.error('加载通知分组失败', { error: String(error) });
      this.groups = DEFAULT_GROUPS;
    }
  }

  /**
   * 保存通知分组配置
   */
  async saveGroups() {
    try {
      await chrome.storage.local.set({ [GROUPS_KEY]: this.groups });
      Logger.debug('保存通知分组配置');
    } catch (error) {
      Logger.error('保存通知分组失败', { error: String(error) });
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Chrome 扩展的通知权限在 manifest.json 中声明
      // 这里只需要记录用户的偏好
      this.permissionGranted = true;
      await chrome.storage.local.set({ [PERMISSION_KEY]: true });
      Logger.info('通知权限已授予');
      return true;
    } catch (error) {
      Logger.error('请求通知权限失败', { error: String(error) });
      return false;
    }
  }

  /**
   * 撤销通知权限
   */
  async revokePermission() {
    this.permissionGranted = false;
    await chrome.storage.local.set({ [PERMISSION_KEY]: false });
    Logger.info('通知权限已撤销');
  }

  /**
   * 检查通知权限
   */
  hasPermission(): boolean {
    return this.permissionGranted;
  }

  /**
   * 获取通知分组
   */
  getGroups(): NotificationGroup[] {
    return this.groups;
  }

  /**
   * 获取指定分组
   */
  getGroup(groupId: string): NotificationGroup | undefined {
    return this.groups.find(g => g.id === groupId);
  }

  /**
   * 更新分组配置
   */
  async updateGroup(groupId: string, updates: Partial<NotificationGroup>) {
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      Object.assign(group, updates);
      await this.saveGroups();
      Logger.debug('更新通知分组', { groupId, updates });
    }
  }

  /**
   * 启用/禁用分组
   */
  async toggleGroup(groupId: string, enabled: boolean) {
    await this.updateGroup(groupId, { enabled });
  }

  /**
   * 检查分组是否启用
   */
  isGroupEnabled(groupId: string): boolean {
    const group = this.getGroup(groupId);
    return group ? group.enabled : false;
  }

  /**
   * 发送通知
   */
  async notify(groupId: string, options: NotificationOptions): Promise<string | null> {
    // 检查权限
    if (!this.permissionGranted) {
      Logger.warn('通知权限未授予，跳过通知', { groupId, title: options.title });
      return null;
    }

    // 检查分组是否启用
    if (!this.isGroupEnabled(groupId)) {
      Logger.debug('通知分组已禁用，跳过通知', { groupId, title: options.title });
      return null;
    }

    try {
      const group = this.getGroup(groupId);
      const priority = options.priority || group?.priority || 'normal';

      // 构建通知选项
      const notificationOptions: chrome.notifications.NotificationOptions<true> = {
        type: 'basic',
        iconUrl: options.iconUrl || chrome.runtime.getURL('icons/128.png'),
        title: options.title,
        message: options.message,
        priority: this.mapPriority(priority),
        requireInteraction: options.requireInteraction || priority === 'urgent',
        contextMessage: options.contextMessage,
        buttons: options.buttons,
      };

      // 创建通知
      const notificationId = await chrome.notifications.create(
        options.tag || `${groupId}_${Date.now()}`,
        notificationOptions
      );

      Logger.info('发送通知成功', {
        groupId,
        notificationId,
        title: options.title,
        priority,
      });

      return notificationId;
    } catch (error) {
      Logger.error('发送通知失败', {
        groupId,
        title: options.title,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * 映射优先级
   */
  private mapPriority(priority: NotificationPriority): number {
    const priorityMap: Record<NotificationPriority, number> = {
      low: -1,
      normal: 0,
      high: 1,
      urgent: 2,
    };
    return priorityMap[priority] || 0;
  }

  /**
   * 清除通知
   */
  async clearNotification(notificationId: string) {
    try {
      await chrome.notifications.clear(notificationId);
      Logger.debug('清除通知', { notificationId });
    } catch (error) {
      Logger.error('清除通知失败', { notificationId, error: String(error) });
    }
  }

  /**
   * 清除所有通知
   */
  async clearAllNotifications() {
    try {
      const notifications = await chrome.notifications.getAll();
      for (const notificationId in notifications) {
        await chrome.notifications.clear(notificationId);
      }
      Logger.info('清除所有通知');
    } catch (error) {
      Logger.error('清除所有通知失败', { error: String(error) });
    }
  }
}

// 单例实例
export const notificationManager = new NotificationManager();

/**
 * 快捷通知方法
 */
export async function notifyNewMessage(senderName: string, message: string) {
  return notificationManager.notify('message', {
    title: `${senderName} 发来新消息`,
    message: message.substring(0, 100),
    priority: 'high',
    requireInteraction: true,
    buttons: [
      { title: '查看' },
      { title: '忽略' },
    ],
  });
}

export async function notifyHRReply(hrName: string, companyName: string, message: string) {
  return notificationManager.notify('reply', {
    title: `${hrName} 回复了你`,
    message: message.substring(0, 100),
    contextMessage: companyName,
    priority: 'urgent',
    requireInteraction: true,
    buttons: [
      { title: '立即回复' },
      { title: '稍后查看' },
    ],
  });
}

export async function notifyApplySuccess(jobTitle: string, companyName: string) {
  return notificationManager.notify('apply', {
    title: '投递成功',
    message: `已成功投递 ${companyName} 的 ${jobTitle} 岗位`,
    priority: 'normal',
  });
}

export async function notifyReminder(title: string, message: string) {
  return notificationManager.notify('reminder', {
    title,
    message,
    priority: 'normal',
    requireInteraction: true,
  });
}

export async function notifySystem(title: string, message: string) {
  return notificationManager.notify('system', {
    title,
    message,
    priority: 'low',
  });
}
