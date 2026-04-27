import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface DailyStats {
  date: string; // YYYY-MM-DD
  sent: number;
  replied: number;
  interview: number;
  scanned: number;
  filtered: number;
  skipped: number;
}

export interface ActivityLog {
  time: string;
  kind: 'ok' | 'warn' | 'log' | 'error';
  msg: string;
  jobId?: string;
  companyName?: string;
}

export interface IndustryStats {
  industry: string;
  replyRate: number;
  count: number;
}

export interface TimeSlotStats {
  hour: number;
  replyRate: number;
  count: number;
}

export const useStatisticsStore = defineStore('statistics', () => {
  const dailyStats = ref<DailyStats[]>([]);
  const activities = ref<ActivityLog[]>([]);
  const industryStats = ref<IndustryStats[]>([]);
  const timeSlotStats = ref<TimeSlotStats[]>([]);

  // 今日统计
  const todayStats = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return dailyStats.value.find(d => d.date === today) || {
      date: today,
      sent: 0,
      replied: 0,
      interview: 0,
      scanned: 0,
      filtered: 0,
      skipped: 0,
    };
  });

  // 累计统计
  const totalStats = computed(() => {
    return dailyStats.value.reduce((acc, day) => ({
      sent: acc.sent + day.sent,
      replied: acc.replied + day.replied,
      interview: acc.interview + day.interview,
      scanned: acc.scanned + day.scanned,
      filtered: acc.filtered + day.filtered,
      skipped: acc.skipped + day.skipped,
    }), { sent: 0, replied: 0, interview: 0, scanned: 0, filtered: 0, skipped: 0 });
  });

  // 回复率
  const replyRate = computed(() => {
    const total = totalStats.value.sent;
    return total > 0 ? Math.round((totalStats.value.replied / total) * 100) : 0;
  });

  // 面试率
  const interviewRate = computed(() => {
    const total = totalStats.value.sent;
    return total > 0 ? Math.round((totalStats.value.interview / total) * 100) : 0;
  });

  // 获取最近N天的数据
  function getRecentDays(days: number): DailyStats[] {
    return dailyStats.value.slice(-days);
  }

  // 添加活动日志
  function addActivity(activity: Omit<ActivityLog, 'time'>) {
    const now = new Date();
    const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    activities.value.unshift({
      ...activity,
      time,
    });

    // 只保留最近100条
    if (activities.value.length > 100) {
      activities.value = activities.value.slice(0, 100);
    }

    saveActivities();
  }

  // 更新今日统计
  function updateTodayStats(updates: Partial<Omit<DailyStats, 'date'>>) {
    const today = new Date().toISOString().split('T')[0];
    const index = dailyStats.value.findIndex(d => d.date === today);

    if (index >= 0) {
      dailyStats.value[index] = {
        ...dailyStats.value[index],
        ...updates,
      };
    } else {
      dailyStats.value.push({
        date: today,
        sent: 0,
        replied: 0,
        interview: 0,
        scanned: 0,
        filtered: 0,
        skipped: 0,
        ...updates,
      });
    }

    saveDailyStats();
  }

  // 增加今日统计
  function incrementTodayStats(field: keyof Omit<DailyStats, 'date'>, amount = 1) {
    const today = new Date().toISOString().split('T')[0];
    const index = dailyStats.value.findIndex(d => d.date === today);

    if (index >= 0) {
      dailyStats.value[index][field] += amount;
    } else {
      const newStats: DailyStats = {
        date: today,
        sent: 0,
        replied: 0,
        interview: 0,
        scanned: 0,
        filtered: 0,
        skipped: 0,
      };
      newStats[field] = amount;
      dailyStats.value.push(newStats);
    }

    saveDailyStats();
  }

  // 更新行业统计
  function updateIndustryStats(industry: string, replied: boolean) {
    const index = industryStats.value.findIndex(i => i.industry === industry);

    if (index >= 0) {
      const stats = industryStats.value[index];
      stats.count += 1;
      if (replied) {
        stats.replyRate = Math.round(((stats.replyRate * (stats.count - 1) + 100) / stats.count));
      } else {
        stats.replyRate = Math.round((stats.replyRate * (stats.count - 1) / stats.count));
      }
    } else {
      industryStats.value.push({
        industry,
        replyRate: replied ? 100 : 0,
        count: 1,
      });
    }

    saveIndustryStats();
  }

  // 更新时段统计
  function updateTimeSlotStats(hour: number, replied: boolean) {
    const index = timeSlotStats.value.findIndex(t => t.hour === hour);

    if (index >= 0) {
      const stats = timeSlotStats.value[index];
      stats.count += 1;
      if (replied) {
        stats.replyRate = Math.round(((stats.replyRate * (stats.count - 1) + 100) / stats.count));
      } else {
        stats.replyRate = Math.round((stats.replyRate * (stats.count - 1) / stats.count));
      }
    } else {
      timeSlotStats.value.push({
        hour,
        replyRate: replied ? 100 : 0,
        count: 1,
      });
    }

    saveTimeSlotStats();
  }

  // 保存到 storage
  async function saveDailyStats() {
    await chrome.storage.local.set({ dailyStats: dailyStats.value });
  }

  async function saveActivities() {
    await chrome.storage.local.set({ activities: activities.value });
  }

  async function saveIndustryStats() {
    await chrome.storage.local.set({ industryStats: industryStats.value });
  }

  async function saveTimeSlotStats() {
    await chrome.storage.local.set({ timeSlotStats: timeSlotStats.value });
  }

  // 从 storage 加载
  async function loadFromStorage() {
    const data = await chrome.storage.local.get([
      'dailyStats',
      'activities',
      'industryStats',
      'timeSlotStats',
    ]);

    if (data.dailyStats) dailyStats.value = data.dailyStats;
    if (data.activities) activities.value = data.activities;
    if (data.industryStats) industryStats.value = data.industryStats;
    if (data.timeSlotStats) timeSlotStats.value = data.timeSlotStats;
  }

  // 清空统计数据
  async function clearStats() {
    dailyStats.value = [];
    activities.value = [];
    industryStats.value = [];
    timeSlotStats.value = [];

    await chrome.storage.local.remove([
      'dailyStats',
      'activities',
      'industryStats',
      'timeSlotStats',
    ]);
  }

  return {
    dailyStats,
    activities,
    industryStats,
    timeSlotStats,
    todayStats,
    totalStats,
    replyRate,
    interviewRate,
    getRecentDays,
    addActivity,
    updateTodayStats,
    incrementTodayStats,
    updateIndustryStats,
    updateTimeSlotStats,
    loadFromStorage,
    clearStats,
  };
});
