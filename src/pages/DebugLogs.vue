<template>
  <div class="debug-logs">
    <div class="header">
      <h2>调试日志</h2>
      <div class="actions">
        <el-button @click="refreshLogs" :icon="Refresh" size="small">刷新</el-button>
        <el-button @click="downloadLogs" :icon="Download" size="small">导出</el-button>
        <el-button @click="clearLogs" :icon="Delete" size="small" type="danger">清空</el-button>
      </div>
    </div>

    <div class="filters">
      <el-radio-group v-model="filterLevel" size="small">
        <el-radio-button label="all">全部 ({{ logs.length }})</el-radio-button>
        <el-radio-button label="info">信息 ({{ countByLevel('info') }})</el-radio-button>
        <el-radio-button label="warn">警告 ({{ countByLevel('warn') }})</el-radio-button>
        <el-radio-button label="error">错误 ({{ countByLevel('error') }})</el-radio-button>
        <el-radio-button label="debug">调试 ({{ countByLevel('debug') }})</el-radio-button>
      </el-radio-group>
    </div>

    <div class="log-list">
      <div
        v-for="log in filteredLogs"
        :key="log.timestamp"
        :class="['log-item', `level-${log.level}`]"
      >
        <div class="log-header">
          <span :class="['level-badge', `level-${log.level}`]">{{ log.level.toUpperCase() }}</span>
          <span class="timestamp">{{ formatTime(log.timestamp) }}</span>
        </div>
        <div class="log-message">{{ log.message }}</div>
        <div v-if="log.data" class="log-data">
          <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
        </div>
      </div>

      <div v-if="filteredLogs.length === 0" class="empty">
        <span>暂无日志</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Refresh, Download, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Logger } from '@/utils/logger';

const logs = ref<any[]>([]);
const filterLevel = ref('all');

// 加载日志
async function refreshLogs() {
  logs.value = await Logger.getLogs();
  logs.value.sort((a, b) => b.timestamp - a.timestamp); // 最新的在前
}

// 过滤日志
const filteredLogs = computed(() => {
  if (filterLevel.value === 'all') {
    return logs.value;
  }
  return logs.value.filter(log => log.level === filterLevel.value);
});

// 统计各级别日志数量
function countByLevel(level: string) {
  return logs.value.filter(log => log.level === level).length;
}

// 格式化时间
function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// 下载日志
async function downloadLogs() {
  try {
    await Logger.downloadLogs();
    ElMessage.success('日志已导出');
  } catch (error) {
    ElMessage.error('导出失败');
  }
}

// 清空日志
async function clearLogs() {
  try {
    await ElMessageBox.confirm('确定要清空所有日志吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await Logger.clearLogs();
    logs.value = [];
    ElMessage.success('日志已清空');
  } catch (error) {
    // 用户取消
  }
}

onMounted(() => {
  refreshLogs();
});
</script>

<style scoped>
.debug-logs {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--fg-0);
}

.actions {
  display: flex;
  gap: 8px;
}

.filters {
  padding: 12px;
  background: var(--bg-1);
  border-radius: 8px;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  padding: 12px;
  background: var(--bg-1);
  border-radius: 8px;
  border-left: 3px solid var(--border);
  transition: all 0.2s;
}

.log-item:hover {
  background: var(--bg-2);
}

.log-item.level-info {
  border-left-color: var(--primary);
}

.log-item.level-warn {
  border-left-color: #f59e0b;
}

.log-item.level-error {
  border-left-color: #ef4444;
}

.log-item.level-debug {
  border-left-color: #8b5cf6;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.level-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.level-badge.level-info {
  background: rgba(20, 184, 166, 0.2);
  color: var(--primary);
}

.level-badge.level-warn {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.level-badge.level-error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.level-badge.level-debug {
  background: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

.timestamp {
  font-size: 12px;
  color: var(--fg-2);
  font-family: 'Consolas', 'Monaco', monospace;
}

.log-message {
  font-size: 14px;
  color: var(--fg-0);
  line-height: 1.5;
}

.log-data {
  margin-top: 8px;
  padding: 8px;
  background: var(--bg-0);
  border-radius: 4px;
  overflow-x: auto;
}

.log-data pre {
  margin: 0;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--fg-1);
  line-height: 1.4;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-2);
  font-size: 14px;
}
</style>
