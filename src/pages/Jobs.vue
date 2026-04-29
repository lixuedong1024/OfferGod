<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVirtualList } from '@vueuse/core';
import { useBatchOperation } from '@/composables/useBatchOperation';
import type { JobData } from '../utils/jobScraper';
import type { JobData as JobDataType, MatchResult } from '@/types/job';
import { parseJobDescription } from '@/utils/jdParser';
import { matchJobWithResume, loadResumeData } from '@/utils/jobMatcher';
import { Logger } from '@/utils/logger';
import JobDetail from './JobDetail.vue';

interface Job {
  id: string;
  title: string;
  company: string;
  salary: string;
  location: string;
  experience: string;
  score: number;
  status: 'ready' | 'sent' | 'replied';
}

const jobs = ref<Job[]>([]);
const selectedFilter = ref('all');
const loading = ref(false);
const calculating = ref(false); // 匹配计算状态
const calculatingProgress = ref({ current: 0, total: 0 }); // 计算进度
const maxPages = ref(5); // 默认抓取5页
const selectedJobId = ref<string | null>(null);
const batchMode = ref(false); // 批量操作模式

// 批量操作
const {
  selectedIds,
  selectedCount,
  isProcessing,
  progress,
  toggleSelection,
  selectAll,
  clearSelection,
  invertSelection,
  isSelected,
  isAllSelected,
  isIndeterminate,
  executeBatch,
} = useBatchOperation();

const filteredJobs = computed(() => {
  if (selectedFilter.value === 'all') {
    return jobs.value;
  }
  return jobs.value.filter(j => j.status === selectedFilter.value);
});

// 虚拟滚动配置
const { list: virtualList, containerProps, wrapperProps } = useVirtualList(
  filteredJobs,
  {
    itemHeight: 80,
    overscan: 5,
  }
);

// 从 storage 加载岗位数据
const loadJobs = async () => {
  try {
    console.log('🔄 开始加载岗位数据...');
    const data = await chrome.storage.local.get(['jobs', 'lastUpdate']);

    if (data.jobs && Array.isArray(data.jobs)) {
      // 加载简历数据
      const resume = await loadResumeData();

      // 统计需要计算匹配度的岗位数量
      const jobsNeedCalculation = data.jobs.filter((job: JobData) => {
        const jobData = job as JobDataType;
        return resume && job.postDescription &&
               (!jobData.matchResult || jobData.matchResult.calculatedAt <= Date.now() - 24 * 60 * 60 * 1000);
      });

      if (jobsNeedCalculation.length > 0) {
        calculating.value = true;
        calculatingProgress.value = { current: 0, total: jobsNeedCalculation.length };
      }

      // 处理每个岗位
      const jobPromises = data.jobs.map(async (job: JobData) => {
        let score = 75; // 默认分数

        // 如果有简历数据，计算真实匹配度
        if (resume && job.postDescription) {
          try {
            // 检查是否已有缓存的匹配结果
            const jobData = job as JobDataType;
            if (jobData.matchResult && jobData.matchResult.calculatedAt > Date.now() - 24 * 60 * 60 * 1000) {
              // 使用缓存的结果（24小时内有效）
              score = jobData.matchResult.totalScore;
            } else {
              // 解析JD
              const requirement = await parseJobDescription(
                job.encryptJobId,
                job.jobName,
                job.postDescription,
                job.experienceName,
                job.degreeName,
                job.jobLabels
              );

              // 计算匹配度
              const matchResult = await matchJobWithResume(
                job.encryptJobId,
                job.jobName,
                requirement,
                resume
              );

              score = matchResult.totalScore;

              // 缓存结果到 storage
              jobData.matchResult = matchResult;
              jobData.requirement = requirement;

              // 更新进度
              calculatingProgress.value.current++;
            }
          } catch (error) {
            Logger.warn('计算匹配度失败，使用默认分数', { jobId: job.encryptJobId, error: String(error) });
          }
        }

        return {
          id: job.encryptJobId,
          title: job.jobName,
          company: job.brandName,
          salary: job.salaryDesc,
          location: job.cityName,
          experience: job.experienceName,
          score,
          status: (job.status || 'ready') as const,
        };
      });

      jobs.value = await Promise.all(jobPromises);

      // 保存更新后的岗位数据（包含匹配结果缓存）
      await chrome.storage.local.set({ jobs: data.jobs });

      // 重置计算状态
      calculating.value = false;
      calculatingProgress.value = { current: 0, total: 0 };

      console.log('✅ 加载岗位数据成功:', {
        数量: jobs.value.length,
        最后更新: data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : '未知'
      });
    } else {
      console.log('⚠️ 没有找到岗位数据');
    }
  } catch (error) {
    console.error('❌ 加载岗位数据失败:', error);
  }
};

// 刷新岗位数据
const refreshJobs = async () => {
  loading.value = true;
  try {
    console.log(`🔄 开始抓取 ${maxPages.value} 页岗位...`);

    // 直接通过 window.postMessage 触发批量抓取
    window.postMessage({ type: 'OFFERGOD_GET_JOBS', maxPages: maxPages.value }, '*');

    // 等待数据更新（根据页数调整等待时间）
    const waitTime = Math.max(2000, maxPages.value * 1000);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // 重新加载数据
    await loadJobs();

    console.log('✅ 刷新完成');
  } catch (error) {
    console.error('刷新失败:', error);
  } finally {
    loading.value = false;
  }
};

// 查看岗位详情
const viewJobDetail = (jobId: string) => {
  selectedJobId.value = jobId;
};

// 返回岗位列表
const backToList = () => {
  selectedJobId.value = null;
};

// 切换批量操作模式
const toggleBatchMode = () => {
  batchMode.value = !batchMode.value;
  if (!batchMode.value) {
    clearSelection();
  }
};

// 全选/取消全选
const handleSelectAll = () => {
  if (isAllSelected(filteredJobs.value.length)) {
    clearSelection();
  } else {
    selectAll(filteredJobs.value.map(j => j.id));
  }
};

// 批量投递
const batchDeliver = async () => {
  if (selectedCount.value === 0) {
    alert('请先选择要投递的岗位');
    return;
  }

  if (!confirm(`确定要投递选中的 ${selectedCount.value} 个岗位吗？`)) {
    return;
  }

  const selectedJobs = jobs.value.filter(j => isSelected(j.id));

  await executeBatch(
    selectedJobs,
    async (job) => {
      // 模拟投递操作
      console.log('投递岗位:', job.title, job.company);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // 更新状态
      job.status = 'sent';
    },
    {
      onSuccess: (count) => {
        alert(`成功投递 ${count} 个岗位`);
        clearSelection();
        batchMode.value = false;
      },
      onError: (error) => {
        alert('批量投递失败: ' + error.message);
      },
      onProgress: (current, total) => {
        console.log(`投递进度: ${current}/${total}`);
      },
    }
  );
};

// 批量标记状态
const batchMarkStatus = async (status: Job['status']) => {
  if (selectedCount.value === 0) {
    alert('请先选择要标记的岗位');
    return;
  }

  const statusText = status === 'ready' ? '待投递' : status === 'sent' ? '已投递' : '已回复';
  if (!confirm(`确定要将选中的 ${selectedCount.value} 个岗位标记为"${statusText}"吗？`)) {
    return;
  }

  const selectedJobs = jobs.value.filter(j => isSelected(j.id));

  await executeBatch(
    selectedJobs,
    async (job) => {
      job.status = status;
      await new Promise(resolve => setTimeout(resolve, 100));
    },
    {
      onSuccess: (count) => {
        alert(`成功标记 ${count} 个岗位`);
        clearSelection();
      },
      onError: (error) => {
        alert('批量标记失败: ' + error.message);
      },
    }
  );
};

// 批量删除
const batchDelete = async () => {
  if (selectedCount.value === 0) {
    alert('请先选择要删除的岗位');
    return;
  }

  if (!confirm(`确定要删除选中的 ${selectedCount.value} 个岗位吗？此操作不可恢复！`)) {
    return;
  }

  const selectedJobIds = Array.from(selectedIds.value);
  jobs.value = jobs.value.filter(j => !selectedJobIds.includes(j.id));

  // 保存到 storage
  try {
    const jobsData = await chrome.storage.local.get('jobs');
    const updatedJobs = (jobsData.jobs || []).filter(
      (job: JobData) => !selectedJobIds.includes(job.encryptJobId)
    );
    await chrome.storage.local.set({ jobs: updatedJobs });
    alert(`成功删除 ${selectedJobIds.length} 个岗位`);
  } catch (error) {
    alert('删除失败: ' + error);
  }

  clearSelection();
  batchMode.value = false;
};

// 批量导出
const batchExport = () => {
  if (selectedCount.value === 0) {
    alert('请先选择要导出的岗位');
    return;
  }

  const selectedJobs = jobs.value.filter(j => isSelected(j.id));
  const csv = [
    '岗位名称,公司名称,薪资,地点,经验要求,评分,状态',
    ...selectedJobs.map(job =>
      `"${job.title}","${job.company}","${job.salary}","${job.location}","${job.experience}",${job.score},"${job.status === 'ready' ? '待投递' : job.status === 'sent' ? '已投递' : '已回复'}"`
    )
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `岗位列表_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  alert(`成功导出 ${selectedCount.value} 个岗位`);
};

// 处理岗位点击
const handleJobClick = (jobId: string, event: MouseEvent) => {
  if (batchMode.value) {
    event.stopPropagation();
    toggleSelection(jobId);
  } else {
    viewJobDetail(jobId);
  }
};

onMounted(() => {
  loadJobs();

  // 监听 storage 变化，实时更新
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.jobs) {
      console.log('🔔 检测到岗位数据更新，重新加载...');
      loadJobs();
    }
  });
});
</script>

<template>
  <div>
    <!-- 岗位详情页 -->
    <JobDetail v-if="selectedJobId" :job-id="selectedJobId" :on-back="backToList" />

    <!-- 岗位列表页 -->
    <div v-else>
    <div class="page-h">
      <div>
        <h1>岗位列表</h1>
        <div class="sub">
          共 {{ jobs.length }} 个岗位
          <span v-if="batchMode && selectedCount > 0" style="margin-left: 8px; color: var(--primary);">
            · 已选择 {{ selectedCount }} 个
          </span>
          <span v-if="calculating" style="margin-left: 8px; color: var(--primary);">
            · 正在计算匹配度 {{ calculatingProgress.current }}/{{ calculatingProgress.total }}
          </span>
        </div>
      </div>
      <div class="actions">
        <div v-if="!batchMode" style="display: flex; gap: 10px; align-items: center;">
          <span style="font-size: 12px; color: var(--fg-2);">抓取页数:</span>
          <input
            v-model.number="maxPages"
            type="number"
            min="1"
            max="20"
            style="width: 60px; padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-2); color: var(--fg);"
          />
          <button class="btn" @click="refreshJobs" :disabled="loading">
            {{ loading ? '抓取中...' : '抓取岗位' }}
          </button>
          <button class="btn" @click="toggleBatchMode">批量操作</button>
        </div>
        <div v-else style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-sm" @click="handleSelectAll">
            {{ isAllSelected(filteredJobs.length) ? '取消全选' : '全选' }}
          </button>
          <button class="btn btn-sm" @click="invertSelection(filteredJobs.map(j => j.id))">
            反选
          </button>
          <button class="btn btn-sm btn-primary" @click="batchDeliver" :disabled="selectedCount === 0 || isProcessing">
            {{ isProcessing ? `投递中 ${progress.current}/${progress.total}` : '批量投递' }}
          </button>
          <div class="dropdown">
            <button class="btn btn-sm" :disabled="selectedCount === 0">
              标记状态 ▼
            </button>
            <div class="dropdown-menu">
              <button @click="batchMarkStatus('ready')">待投递</button>
              <button @click="batchMarkStatus('sent')">已投递</button>
              <button @click="batchMarkStatus('replied')">已回复</button>
            </div>
          </div>
          <button class="btn btn-sm" @click="batchExport" :disabled="selectedCount === 0">
            导出
          </button>
          <button class="btn btn-sm" @click="batchDelete" :disabled="selectedCount === 0" style="color: var(--danger);">
            删除
          </button>
          <button class="btn btn-sm btn-ghost" @click="toggleBatchMode">
            取消
          </button>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button
        :class="['tab', { active: selectedFilter === 'all' }]"
        @click="selectedFilter = 'all'"
      >
        全部 ({{ jobs.length }})
      </button>
      <button
        :class="['tab', { active: selectedFilter === 'ready' }]"
        @click="selectedFilter = 'ready'"
      >
        待投递 ({{ jobs.filter(j => j.status === 'ready').length }})
      </button>
      <button
        :class="['tab', { active: selectedFilter === 'sent' }]"
        @click="selectedFilter = 'sent'"
      >
        已投递 ({{ jobs.filter(j => j.status === 'sent').length }})
      </button>
      <button
        :class="['tab', { active: selectedFilter === 'replied' }]"
        @click="selectedFilter = 'replied'"
      >
        已回复 ({{ jobs.filter(j => j.status === 'replied').length }})
      </button>
    </div>

    <div v-if="jobs.length === 0" style="padding: 40px; text-align: center; color: var(--fg-2);">
      <p style="font-size: 14px; margin-bottom: 10px;">暂无岗位数据</p>
      <p style="font-size: 12px;">请在 Boss 直聘岗位列表页面点击"抓取岗位"按钮</p>
    </div>

    <div v-else class="job-list" v-bind="containerProps" style="height: calc(100vh - 280px); overflow-y: auto;">
      <div v-bind="wrapperProps">
        <div
          v-for="{ data: job, index } in virtualList"
          :key="job.id"
          :class="['job-row', { selected: batchMode && isSelected(job.id) }]"
          @click="handleJobClick(job.id, $event)"
        >
          <div v-if="batchMode" class="job-checkbox" @click.stop="toggleSelection(job.id)">
            <input type="checkbox" :checked="isSelected(job.id)" />
          </div>
          <div class="job-logo">{{ job.company[0] }}</div>
          <div class="job-main">
            <div class="title">
              <span>{{ job.title }}</span>
              <span class="salary">{{ job.salary }}</span>
            </div>
            <div class="meta">
              <span>{{ job.company }}</span>
              <span class="sp">·</span>
              <span>{{ job.location }}</span>
              <span class="sp">·</span>
              <span>{{ job.experience }}</span>
            </div>
          </div>
          <div class="job-side">
            <div class="score">
              <div class="score-bar">
                <div class="score-bar-fill" :style="{ width: job.score + '%' }"></div>
              </div>
              <span class="score-num">{{ job.score }}</span>
            </div>
            <span
              :class="[
                'pill',
                job.status === 'ready' ? 'info' : job.status === 'sent' ? 'warn' : 'accent',
              ]"
            >
              {{ job.status === 'ready' ? '待投递' : job.status === 'sent' ? '已投递' : '已回复' }}
            </span>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
.job-row {
  position: relative;
  transition: all 0.2s;
}

.job-row.selected {
  background: rgba(20, 184, 166, 0.1);
  border-color: var(--primary);
}

.job-checkbox {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.job-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary);
}

.job-row.selected .job-logo,
.job-row.selected .job-main,
.job-row.selected .job-side {
  margin-left: 30px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 120px;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-menu button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  color: var(--fg-0);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-menu button:hover {
  background: var(--bg-3);
}

.dropdown-menu button:first-child {
  border-radius: 6px 6px 0 0;
}

.dropdown-menu button:last-child {
  border-radius: 0 0 6px 6px;
}
</style>
