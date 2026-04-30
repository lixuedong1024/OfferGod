import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { JobData } from '@/types/job';
import { safeChromeCaller } from '@/utils/extensionContext';

export const useJobStore = defineStore('job', () => {
  const jobs = ref<JobData[]>([]);
  const lastUpdate = ref<number>(0);

  // 岗位总数
  const totalCount = computed(() => jobs.value.length);

  // 按状态统计
  const statusCounts = computed(() => {
    const counts = {
      ready: 0,
      sent: 0,
      replied: 0,
    };

    jobs.value.forEach(job => {
      if (job.status && counts[job.status as keyof typeof counts] !== undefined) {
        counts[job.status as keyof typeof counts]++;
      }
    });

    return counts;
  });

  // 从 storage 加载岗位数据
  async function loadFromStorage() {
    try {
      const data = await safeChromeCaller(
        () => chrome.storage.local.get(['jobs', 'lastUpdate']),
        { jobs: [], lastUpdate: 0 }
      );

      if (data && data.jobs && Array.isArray(data.jobs)) {
        jobs.value = data.jobs;
      }

      if (data && data.lastUpdate) {
        lastUpdate.value = data.lastUpdate;
      }
    } catch (error) {
      console.error('加载岗位数据失败:', error);
    }
  }

  // 保存到 storage
  async function saveToStorage() {
    try {
      await safeChromeCaller(
        () => chrome.storage.local.set({
          jobs: jobs.value,
          lastUpdate: Date.now(),
        })
      );
      lastUpdate.value = Date.now();
    } catch (error) {
      console.error('保存岗位数据失败:', error);
    }
  }

  // 添加岗位
  function addJob(job: JobData) {
    const index = jobs.value.findIndex(j => j.id === job.id);
    if (index >= 0) {
      jobs.value[index] = job;
    } else {
      jobs.value.push(job);
    }
  }

  // 批量添加岗位
  function addJobs(newJobs: JobData[]) {
    newJobs.forEach(job => addJob(job));
  }

  // 删除岗位
  function removeJob(jobId: string) {
    const index = jobs.value.findIndex(j => j.id === jobId);
    if (index >= 0) {
      jobs.value.splice(index, 1);
    }
  }

  // 更新岗位
  function updateJob(jobId: string, updates: Partial<JobData>) {
    const index = jobs.value.findIndex(j => j.id === jobId);
    if (index >= 0) {
      jobs.value[index] = { ...jobs.value[index], ...updates };
    }
  }

  // 清空岗位
  async function clearJobs() {
    jobs.value = [];
    await safeChromeCaller(
      () => chrome.storage.local.remove(['jobs', 'lastUpdate'])
    );
    lastUpdate.value = 0;
  }

  return {
    jobs,
    lastUpdate,
    totalCount,
    statusCounts,
    loadFromStorage,
    saveToStorage,
    addJob,
    addJobs,
    removeJob,
    updateJob,
    clearJobs,
  };
});
