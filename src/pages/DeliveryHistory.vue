<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVirtualList } from '@vueuse/core';
import { useDeliveryQueue, type DeliveryTask } from '@/composables/useDeliveryQueue';
import { ElMessage, ElDatePicker, ElSelect, ElOption, ElButton } from 'element-plus';

const deliveryQueue = useDeliveryQueue();

const historyList = ref<DeliveryTask[]>([]);
const loading = ref(false);
const filterStatus = ref<string>('all');
const filterDateRange = ref<[Date, Date] | null>(null);
const searchKeyword = ref('');

// 过滤后的历史记录
const filteredHistory = computed(() => {
  let result = [...historyList.value];

  // 按状态过滤
  if (filterStatus.value !== 'all') {
    result = result.filter(item => item.status === filterStatus.value);
  }

  // 按日期范围过滤
  if (filterDateRange.value) {
    const [start, end] = filterDateRange.value;
    const startTime = start.getTime();
    const endTime = end.getTime() + 24 * 60 * 60 * 1000; // 包含结束日期
    result = result.filter(item => {
      const time = item.completedAt || item.createdAt;
      return time >= startTime && time < endTime;
    });
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(item =>
      item.jobName.toLowerCase().includes(keyword) ||
      item.companyName.toLowerCase().includes(keyword)
    );
  }

  // 按时间倒序排列
  return result.sort((a, b) => {
    const timeA = a.completedAt || a.createdAt;
    const timeB = b.completedAt || b.createdAt;
    return timeB - timeA;
  });
});

// 虚拟滚动配置
const { list: virtualHistory, containerProps, wrapperProps } = useVirtualList(
  filteredHistory,
  {
    itemHeight: 100,
    overscan: 5,
  }
);

// 统计数据
const statistics = computed(() => {
  const total = filteredHistory.value.length;
  const success = filteredHistory.value.filter(item => item.status === 'success').length;
  const failed = filteredHistory.value.filter(item => item.status === 'failed').length;
  const skipped = filteredHistory.value.filter(item => item.status === 'skipped').length;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';

  return { total, success, failed, skipped, successRate };
});

// 加载历史记录
async function loadHistory() {
  loading.value = true;
  try {
    historyList.value = await deliveryQueue.loadHistory();
    ElMessage.success(`加载了 ${historyList.value.length} 条历史记录`);
  } catch (error) {
    ElMessage.error('加载历史记录失败');
  } finally {
    loading.value = false;
  }
}

// 导出历史记录
function exportHistory() {
  const data = filteredHistory.value.map(item => ({
    岗位名称: item.jobName,
    公司名称: item.companyName,
    状态: getStatusText(item.status),
    消息: item.message,
    创建时间: formatTime(item.createdAt),
    完成时间: item.completedAt ? formatTime(item.completedAt) : '-',
    耗时: item.completedAt && item.startedAt
      ? `${Math.round((item.completedAt - item.startedAt) / 1000)}秒`
      : '-',
  }));

  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).join(','))
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `投递历史_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  ElMessage.success('导出成功');
}

// 清空历史记录
async function clearHistory() {
  if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
    return;
  }

  try {
    await chrome.storage.local.remove('delivery_history');
    historyList.value = [];
    ElMessage.success('历史记录已清空');
  } catch (error) {
    ElMessage.error('清空失败');
  }
}

// 格式化时间
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

// 获取状态文本
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    success: '成功',
    failed: '失败',
    skipped: '跳过',
    pending: '等待中',
    running: '投递中',
  };
  return statusMap[status] || status;
}

// 获取状态颜色
function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    success: '#67c23a',
    failed: '#f56c6c',
    skipped: '#e6a23c',
    pending: '#909399',
    running: '#409eff',
  };
  return colorMap[status] || '#909399';
}

onMounted(() => {
  loadHistory();
});
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>投递历史</h1>
        <div class="sub">查看所有投递记录 · 最多保留 1000 条</div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" @click="loadHistory">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          刷新
        </button>
        <button class="btn btn-ghost" @click="exportHistory" :disabled="filteredHistory.length === 0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          导出 CSV
        </button>
        <button class="btn btn-ghost" style="color: var(--danger)" @click="clearHistory">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          清空历史
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">总记录数</div>
        <div class="stat-value">{{ statistics.total }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">成功</div>
        <div class="stat-value" style="color: #67c23a">{{ statistics.success }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">失败</div>
        <div class="stat-value" style="color: #f56c6c">{{ statistics.failed }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">跳过</div>
        <div class="stat-value" style="color: #e6a23c">{{ statistics.skipped }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">成功率</div>
        <div class="stat-value">{{ statistics.successRate }}%</div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="card" style="margin-bottom: 16px">
      <div class="card-body">
        <div class="filters">
          <div class="filter-item">
            <label>状态</label>
            <ElSelect v-model="filterStatus" placeholder="全部" style="width: 120px">
              <ElOption label="全部" value="all" />
              <ElOption label="成功" value="success" />
              <ElOption label="失败" value="failed" />
              <ElOption label="跳过" value="skipped" />
            </ElSelect>
          </div>
          <div class="filter-item">
            <label>日期范围</label>
            <ElDatePicker
              v-model="filterDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 280px"
            />
          </div>
          <div class="filter-item">
            <label>搜索</label>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="岗位名称或公司名称"
              class="search-input"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 历史记录列表 -->
    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="empty">加载中...</div>
        <div v-else-if="filteredHistory.length === 0" class="empty">
          暂无历史记录
        </div>
        <div v-else class="history-list-container" v-bind="containerProps">
          <div v-bind="wrapperProps">
            <div
              v-for="{ data: item, index } in virtualHistory"
              :key="item.id"
              class="history-item"
            >
              <div class="history-main">
                <div class="history-info">
                  <div class="history-title">{{ item.jobName }}</div>
                  <div class="history-company">{{ item.companyName }}</div>
                </div>
                <div class="history-status">
                  <span
                    class="status-badge"
                    :style="{ background: getStatusColor(item.status) + '22', color: getStatusColor(item.status) }"
                  >
                    {{ getStatusText(item.status) }}
                  </span>
                </div>
              </div>
              <div class="history-meta">
                <div class="history-message">{{ item.message }}</div>
                <div class="history-time">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {{ formatTime(item.completedAt || item.createdAt) }}
                </div>
              </div>
              <div v-if="item.error" class="history-error">
                错误: {{ item.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--fg-2);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--fg-0);
}

.filters {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-item label {
  font-size: 12px;
  color: var(--fg-2);
}

.search-input {
  width: 240px;
  padding: 8px 12px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--fg-0);
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.history-list-container {
  height: calc(100vh - 520px);
  overflow-y: auto;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 14px;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 8px;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.history-info {
  flex: 1;
}

.history-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--fg-0);
  margin-bottom: 4px;
}

.history-company {
  font-size: 12px;
  color: var(--fg-2);
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.history-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--fg-2);
}

.history-message {
  flex: 1;
}

.history-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.history-error {
  margin-top: 8px;
  padding: 8px;
  background: rgba(245, 108, 108, 0.1);
  border-left: 3px solid #f56c6c;
  border-radius: 4px;
  font-size: 12px;
  color: #f56c6c;
}
</style>
