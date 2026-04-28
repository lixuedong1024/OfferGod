import { ref, computed } from 'vue';
import { Logger } from '@/utils/logger';
import { useDeliveryConfig } from '@/stores/deliveryConfig';

export type DeliveryStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped' | 'paused';

export interface DeliveryTask {
  id: string;
  jobId: string;
  jobName: string;
  companyName: string;
  status: DeliveryStatus;
  message: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  error?: string;
}

export interface DeliveryStats {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  pending: number;
  todayCount: number;
  hourlyCount: number;
  lastDeliveryTime: number;
}

const STATS_KEY = 'delivery_stats';
const HISTORY_KEY = 'delivery_history';

/**
 * 投递队列管理器
 */
export function useDeliveryQueue() {
  const configStore = useDeliveryConfig();

  const queue = ref<DeliveryTask[]>([]);
  const currentTask = ref<DeliveryTask | null>(null);
  const isRunning = ref(false);
  const isPaused = ref(false);

  const stats = ref<DeliveryStats>({
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    pending: 0,
    todayCount: 0,
    hourlyCount: 0,
    lastDeliveryTime: 0,
  });

  const progress = computed(() => {
    if (stats.value.total === 0) return 0;
    const completed = stats.value.success + stats.value.failed + stats.value.skipped;
    return Math.round((completed / stats.value.total) * 100);
  });

  /**
   * 加载统计数据
   */
  async function loadStats() {
    try {
      const data = await chrome.storage.local.get(STATS_KEY);
      if (data[STATS_KEY]) {
        stats.value = data[STATS_KEY];

        // 检查是否需要重置每日/每小时计数
        const now = Date.now();
        const lastTime = stats.value.lastDeliveryTime;

        // 重置每日计数（跨天）
        if (lastTime && !isSameDay(lastTime, now)) {
          stats.value.todayCount = 0;
        }

        // 重置每小时计数（跨小时）
        if (lastTime && !isSameHour(lastTime, now)) {
          stats.value.hourlyCount = 0;
        }

        Logger.debug('加载投递统计', stats.value);
      }
    } catch (error) {
      Logger.error('加载投递统计失败', { error: String(error) });
    }
  }

  /**
   * 保存统计数据
   */
  async function saveStats() {
    try {
      await chrome.storage.local.set({ [STATS_KEY]: stats.value });
    } catch (error) {
      Logger.error('保存投递统计失败', { error: String(error) });
    }
  }

  /**
   * 添加任务到队列
   */
  function addTask(job: any): DeliveryTask {
    const task: DeliveryTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      jobId: job.encryptJobId,
      jobName: job.jobName,
      companyName: job.brandName,
      status: 'pending',
      message: '等待投递',
      createdAt: Date.now(),
      retryCount: 0,
    };

    queue.value.push(task);
    stats.value.total++;
    stats.value.pending++;

    Logger.debug('添加投递任务', { taskId: task.id, jobName: task.jobName });
    return task;
  }

  /**
   * 批量添加任务
   */
  function addTasks(jobs: any[]): DeliveryTask[] {
    return jobs.map(job => addTask(job));
  }

  /**
   * 更新任务状态
   */
  function updateTaskStatus(taskId: string, status: DeliveryStatus, message: string, error?: string) {
    const task = queue.value.find(t => t.id === taskId);
    if (task) {
      const oldStatus = task.status;
      task.status = status;
      task.message = message;
      task.error = error;

      if (status === 'running' && !task.startedAt) {
        task.startedAt = Date.now();
      }

      if (['success', 'failed', 'skipped'].includes(status) && !task.completedAt) {
        task.completedAt = Date.now();
      }

      // 更新统计
      if (oldStatus === 'pending') {
        stats.value.pending--;
      }

      if (status === 'success') {
        stats.value.success++;
        stats.value.todayCount++;
        stats.value.hourlyCount++;
        stats.value.lastDeliveryTime = Date.now();
      } else if (status === 'failed') {
        stats.value.failed++;
      } else if (status === 'skipped') {
        stats.value.skipped++;
      }

      Logger.debug('更新任务状态', { taskId, status, message });
    }
  }

  /**
   * 检查是否可以投递（频率限制）
   */
  function canDeliver(): { allowed: boolean; reason?: string } {
    const config = configStore.config;

    // 检查每日限制
    if (stats.value.todayCount >= config.limits.dailyLimit) {
      return { allowed: false, reason: `已达到每日投递上限 ${config.limits.dailyLimit}` };
    }

    // 检查每小时限制
    if (stats.value.hourlyCount >= config.limits.hourlyLimit) {
      return { allowed: false, reason: `已达到每小时投递上限 ${config.limits.hourlyLimit}` };
    }

    // 检查最小间隔
    if (stats.value.lastDeliveryTime > 0) {
      const elapsed = (Date.now() - stats.value.lastDeliveryTime) / 1000;
      if (elapsed < config.limits.minInterval) {
        const remaining = Math.ceil(config.limits.minInterval - elapsed);
        return { allowed: false, reason: `需要等待 ${remaining} 秒后才能继续投递` };
      }
    }

    return { allowed: true };
  }

  /**
   * 计算下次投递的延迟时间（秒）
   */
  function calculateDelay(): number {
    const config = configStore.config;
    const { minInterval, maxInterval } = config.limits;

    if (config.safety.randomDelay) {
      // 随机延迟，避免被检测
      return Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
    }

    return minInterval;
  }

  /**
   * 获取下一个待处理任务
   */
  function getNextTask(): DeliveryTask | null {
    // 优先处理失败需要重试的任务
    const retryTask = queue.value.find(
      t => t.status === 'failed' && t.retryCount < configStore.config.safety.maxRetries
    );
    if (retryTask) {
      return retryTask;
    }

    // 获取第一个待处理任务
    return queue.value.find(t => t.status === 'pending') || null;
  }

  /**
   * 清空队列
   */
  function clearQueue() {
    queue.value = [];
    stats.value.total = 0;
    stats.value.pending = 0;
    Logger.info('清空投递队列');
  }

  /**
   * 暂停投递
   */
  function pause() {
    isPaused.value = true;
    Logger.info('暂停投递');
  }

  /**
   * 恢复投递
   */
  function resume() {
    isPaused.value = false;
    Logger.info('恢复投递');
  }

  /**
   * 停止投递
   */
  function stop() {
    isRunning.value = false;
    isPaused.value = false;
    currentTask.value = null;
    Logger.info('停止投递');
  }

  /**
   * 重置统计
   */
  async function resetStats() {
    stats.value = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      todayCount: 0,
      hourlyCount: 0,
      lastDeliveryTime: 0,
    };
    await saveStats();
    Logger.info('重置投递统计');
  }

  /**
   * 保存投递历史
   */
  async function saveHistory() {
    try {
      const completedTasks = queue.value.filter(t =>
        ['success', 'failed', 'skipped'].includes(t.status)
      );

      if (completedTasks.length === 0) return;

      const data = await chrome.storage.local.get(HISTORY_KEY);
      const history = data[HISTORY_KEY] || [];

      // 添加新记录
      history.push(...completedTasks);

      // 只保留最近 1000 条记录
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }

      await chrome.storage.local.set({ [HISTORY_KEY]: history });
      Logger.debug('保存投递历史', { count: completedTasks.length });
    } catch (error) {
      Logger.error('保存投递历史失败', { error: String(error) });
    }
  }

  /**
   * 加载投递历史
   */
  async function loadHistory(): Promise<DeliveryTask[]> {
    try {
      const data = await chrome.storage.local.get(HISTORY_KEY);
      return data[HISTORY_KEY] || [];
    } catch (error) {
      Logger.error('加载投递历史失败', { error: String(error) });
      return [];
    }
  }

  return {
    queue,
    currentTask,
    isRunning,
    isPaused,
    stats,
    progress,
    loadStats,
    saveStats,
    addTask,
    addTasks,
    updateTaskStatus,
    canDeliver,
    calculateDelay,
    getNextTask,
    clearQueue,
    pause,
    resume,
    stop,
    resetStats,
    saveHistory,
    loadHistory,
  };
}

/**
 * 辅助函数：判断是否同一天
 */
function isSameDay(time1: number, time2: number): boolean {
  const d1 = new Date(time1);
  const d2 = new Date(time2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 辅助函数：判断是否同一小时
 */
function isSameHour(time1: number, time2: number): boolean {
  const d1 = new Date(time1);
  const d2 = new Date(time2);
  return (
    isSameDay(time1, time2) &&
    d1.getHours() === d2.getHours()
  );
}
