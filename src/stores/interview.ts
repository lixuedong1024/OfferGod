import { ref } from 'vue';
import { Logger } from '@/utils/logger';

export interface Interview {
  id: string;
  jobId: string;
  jobName: string;
  companyName: string;
  type: 'phone' | 'video' | 'onsite' | 'other';
  datetime: number;
  location?: string;
  contact?: string;
  contactPhone?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  reminder: boolean;
  reminderTime: number; // 提前多少分钟提醒
  result?: 'passed' | 'failed' | 'pending';
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'interviews';

const interviews = ref<Interview[]>([]);
const loading = ref(false);

export function useInterview() {
  // 加载面试数据
  async function loadInterviews() {
    loading.value = true;
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      interviews.value = data[STORAGE_KEY] || [];
      Logger.info('面试数据加载成功', { count: interviews.value.length });
    } catch (error) {
      Logger.error('加载面试数据失败', error);
      interviews.value = [];
    } finally {
      loading.value = false;
    }
  }

  // 保存面试数据
  async function saveInterviews() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: interviews.value });
      Logger.info('面试数据保存成功');
    } catch (error) {
      Logger.error('保存面试数据失败', error);
      throw error;
    }
  }

  // 添加面试
  async function addInterview(interview: Omit<Interview, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now();
    const newInterview: Interview = {
      ...interview,
      id: `interview_${now}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    interviews.value.push(newInterview);
    await saveInterviews();

    // 如果启用了提醒，设置提醒
    if (newInterview.reminder) {
      await scheduleReminder(newInterview);
    }

    Logger.info('添加面试成功', { id: newInterview.id });
    return newInterview;
  }

  // 更新面试
  async function updateInterview(id: string, updates: Partial<Interview>) {
    const index = interviews.value.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error('面试不存在');
    }

    const oldInterview = interviews.value[index];
    interviews.value[index] = {
      ...oldInterview,
      ...updates,
      updatedAt: Date.now(),
    };

    await saveInterviews();

    // 更新提醒
    if (updates.reminder !== undefined || updates.datetime !== undefined || updates.reminderTime !== undefined) {
      if (interviews.value[index].reminder) {
        await scheduleReminder(interviews.value[index]);
      } else {
        await cancelReminder(id);
      }
    }

    Logger.info('更新面试成功', { id });
  }

  // 删除面试
  async function deleteInterview(id: string) {
    const index = interviews.value.findIndex(i => i.id === id);
    if (index === -1) {
      throw new Error('面试不存在');
    }

    interviews.value.splice(index, 1);
    await saveInterviews();
    await cancelReminder(id);

    Logger.info('删除面试成功', { id });
  }

  // 获取单个面试
  function getInterview(id: string): Interview | undefined {
    return interviews.value.find(i => i.id === id);
  }

  // 获取即将到来的面试
  function getUpcomingInterviews(days: number = 7): Interview[] {
    const now = Date.now();
    const endTime = now + days * 24 * 60 * 60 * 1000;

    return interviews.value
      .filter(i => i.status === 'scheduled' && i.datetime >= now && i.datetime <= endTime)
      .sort((a, b) => a.datetime - b.datetime);
  }

  // 获取今天的面试
  function getTodayInterviews(): Interview[] {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    return interviews.value
      .filter(i => i.datetime >= startOfDay && i.datetime < endOfDay)
      .sort((a, b) => a.datetime - b.datetime);
  }

  // 设置提醒
  async function scheduleReminder(interview: Interview) {
    if (!interview.reminder) return;

    const reminderTime = interview.datetime - interview.reminderTime * 60 * 1000;
    const now = Date.now();

    if (reminderTime <= now) {
      Logger.warn('提醒时间已过', { id: interview.id });
      return;
    }

    try {
      // 使用 Chrome Alarms API 设置提醒
      await chrome.alarms.create(`interview_${interview.id}`, {
        when: reminderTime,
      });

      Logger.info('设置面试提醒成功', {
        id: interview.id,
        reminderTime: new Date(reminderTime).toLocaleString(),
      });
    } catch (error) {
      Logger.error('设置面试提醒失败', error);
    }
  }

  // 取消提醒
  async function cancelReminder(id: string) {
    try {
      await chrome.alarms.clear(`interview_${id}`);
      Logger.info('取消面试提醒成功', { id });
    } catch (error) {
      Logger.error('取消面试提醒失败', error);
    }
  }

  // 获取统计信息
  function getStatistics() {
    const total = interviews.value.length;
    const scheduled = interviews.value.filter(i => i.status === 'scheduled').length;
    const completed = interviews.value.filter(i => i.status === 'completed').length;
    const cancelled = interviews.value.filter(i => i.status === 'cancelled').length;

    const passed = interviews.value.filter(i => i.result === 'passed').length;
    const failed = interviews.value.filter(i => i.result === 'failed').length;

    return {
      total,
      scheduled,
      completed,
      cancelled,
      passed,
      failed,
      passRate: completed > 0 ? ((passed / completed) * 100).toFixed(1) : '0',
    };
  }

  return {
    interviews,
    loading,
    loadInterviews,
    addInterview,
    updateInterview,
    deleteInterview,
    getInterview,
    getUpcomingInterviews,
    getTodayInterviews,
    getStatistics,
  };
}
