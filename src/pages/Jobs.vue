<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { JobData } from '../utils/jobScraper';
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
const maxPages = ref(5); // 默认抓取5页
const selectedJobId = ref<string | null>(null);

const filteredJobs = computed(() => {
  if (selectedFilter.value === 'all') {
    return jobs.value;
  }
  return jobs.value.filter(j => j.status === selectedFilter.value);
});

// 从 storage 加载岗位数据
const loadJobs = async () => {
  try {
    console.log('🔄 开始加载岗位数据...');
    const data = await chrome.storage.local.get(['jobs', 'lastUpdate']);

    if (data.jobs && Array.isArray(data.jobs)) {
      jobs.value = data.jobs.map((job: JobData) => ({
        id: job.encryptJobId,
        title: job.jobName,
        company: job.brandName,
        salary: job.salaryDesc,
        location: job.cityName,
        experience: job.experienceName,
        score: Math.floor(Math.random() * 20) + 80, // 临时评分
        status: 'ready' as const,
      }));

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
        <div class="sub">共 {{ jobs.length }} 个岗位</div>
      </div>
      <div class="actions">
        <div style="display: flex; gap: 10px; align-items: center;">
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
        </div>
        <button class="btn btn-primary">开始投递</button>
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

    <div v-else class="job-list">
      <div
        v-for="job in filteredJobs"
        :key="job.id"
        class="job-row"
        @click="viewJobDetail(job.id)"
      >
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
</template>
