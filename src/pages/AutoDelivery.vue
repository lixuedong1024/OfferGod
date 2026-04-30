<template>
  <div class="auto-delivery-page">
    <el-card class="header-card">
      <div class="header">
        <div class="title">
          <h2>自动投递</h2>
          <el-tag v-if="autoDelivery.isRunning.value" type="success" effect="dark">
            运行中
          </el-tag>
          <el-tag v-else-if="autoDelivery.isPaused.value" type="warning" effect="dark">
            已暂停
          </el-tag>
        </div>
        <div class="actions">
          <el-button
            v-if="!autoDelivery.isRunning.value"
            type="primary"
            :icon="VideoPlay"
            @click="handleStart"
          >
            开始投递
          </el-button>
          <el-button
            v-else-if="autoDelivery.isPaused.value"
            type="success"
            :icon="VideoPlay"
            @click="autoDelivery.resumeAutoDelivery()"
          >
            恢复
          </el-button>
          <el-button
            v-else
            type="warning"
            :icon="VideoPause"
            @click="autoDelivery.pauseAutoDelivery()"
          >
            暂停
          </el-button>
          <el-button
            v-if="autoDelivery.isRunning.value"
            type="danger"
            :icon="SwitchButton"
            @click="handleStop"
          >
            停止
          </el-button>
          <el-button :icon="Setting" @click="showConfigDialog = true">
            配置
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card>
          <el-statistic title="总任务数" :value="autoDelivery.stats.value.total" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="成功" :value="autoDelivery.stats.value.success">
            <template #suffix>
              <el-icon color="#67c23a"><SuccessFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="失败" :value="autoDelivery.stats.value.failed">
            <template #suffix>
              <el-icon color="#f56c6c"><CircleCloseFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <el-statistic title="跳过" :value="autoDelivery.stats.value.skipped">
            <template #suffix>
              <el-icon color="#909399"><WarningFilled /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <!-- 进度条 -->
    <el-card v-if="autoDelivery.isRunning.value" class="progress-card">
      <div class="progress-info">
        <span>投递进度</span>
        <span>{{ autoDelivery.progress.value }}%</span>
      </div>
      <el-progress
        :percentage="autoDelivery.progress.value"
        :status="autoDelivery.isPaused.value ? 'warning' : 'success'"
      />
      <div v-if="autoDelivery.currentTask.value" class="current-task">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在投递：{{ autoDelivery.currentTask.value.jobName }} - {{ autoDelivery.currentTask.value.companyName }}</span>
      </div>
    </el-card>

    <!-- 任务队列 -->
    <el-card class="queue-card">
      <template #header>
        <div class="card-header">
          <span>任务队列</span>
          <el-button text @click="loadHistory">查看历史</el-button>
        </div>
      </template>
      <el-table :data="autoDelivery.queue.value" style="width: 100%" max-height="400">
        <el-table-column prop="jobName" label="岗位" width="200" />
        <el-table-column prop="companyName" label="公司" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'pending'" type="info">等待中</el-tag>
            <el-tag v-else-if="row.status === 'running'" type="primary">投递中</el-tag>
            <el-tag v-else-if="row.status === 'success'" type="success">成功</el-tag>
            <el-tag v-else-if="row.status === 'failed'" type="danger">失败</el-tag>
            <el-tag v-else-if="row.status === 'skipped'" type="warning">跳过</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="消息" />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 配置对话框 -->
    <el-dialog v-model="showConfigDialog" title="投递配置" width="800px">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="筛选规则" name="rules">
          <el-form :model="configStore.config.rule" label-width="120px">
            <el-form-item label="启用规则">
              <el-switch v-model="configStore.config.rule.enabled" />
            </el-form-item>
            <el-form-item label="最低匹配分数">
              <el-slider v-model="configStore.config.rule.minScore" :min="0" :max="100" show-input />
            </el-form-item>
            <el-divider>薪资筛选</el-divider>
            <el-form-item label="启用薪资筛选">
              <el-switch v-model="configStore.config.rule.salaryFilter.enabled" />
            </el-form-item>
            <el-form-item label="薪资范围(K)">
              <el-col :span="11">
                <el-input-number v-model="configStore.config.rule.salaryFilter.minSalary" :min="0" />
              </el-col>
              <el-col :span="2" class="text-center">-</el-col>
              <el-col :span="11">
                <el-input-number v-model="configStore.config.rule.salaryFilter.maxSalary" :min="0" />
              </el-col>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="投递限制" name="limits">
          <el-form :model="configStore.config.limits" label-width="120px">
            <el-form-item label="每日上限">
              <el-input-number v-model="configStore.config.limits.dailyLimit" :min="1" :max="200" />
            </el-form-item>
            <el-form-item label="每小时上限">
              <el-input-number v-model="configStore.config.limits.hourlyLimit" :min="1" :max="50" />
            </el-form-item>
            <el-form-item label="最小间隔(秒)">
              <el-input-number v-model="configStore.config.limits.minInterval" :min="10" :max="300" />
            </el-form-item>
            <el-form-item label="最大间隔(秒)">
              <el-input-number v-model="configStore.config.limits.maxInterval" :min="10" :max="300" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="投递策略" name="strategy">
          <el-form :model="configStore.config.strategy" label-width="140px">
            <el-form-item label="自动生成打招呼语">
              <el-switch v-model="configStore.config.strategy.autoGenGreeting" />
            </el-form-item>
            <el-form-item label="使用 AI 生成">
              <el-switch v-model="configStore.config.strategy.useAI" />
            </el-form-item>
            <el-form-item label="打招呼语模板">
              <div style="display: flex; gap: 8px; align-items: flex-start;">
                <el-input
                  v-model="configStore.config.strategy.greetingTemplate"
                  type="textarea"
                  :rows="3"
                  placeholder="支持变量: {jobTitle} {company} {experience} {skills}"
                  style="flex: 1;"
                />
                <TemplateSelector @select="handleTemplateSelect" />
              </div>
              <div style="margin-top: 8px;">
                <el-button text size="small" @click="showTemplateManager = true">
                  管理模板
                </el-button>
              </div>
            </el-form-item>
            <el-form-item label="优先高分岗位">
              <el-switch v-model="configStore.config.strategy.prioritizeHighScore" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="安全设置" name="safety">
          <el-form :model="configStore.config.safety" label-width="120px">
            <el-form-item label="启用频率限制">
              <el-switch v-model="configStore.config.safety.enableRateLimit" />
            </el-form-item>
            <el-form-item label="随机延迟">
              <el-switch v-model="configStore.config.safety.randomDelay" />
            </el-form-item>
            <el-form-item label="遇错停止">
              <el-switch v-model="configStore.config.safety.stopOnError" />
            </el-form-item>
            <el-form-item label="最大重试次数">
              <el-input-number v-model="configStore.config.safety.maxRetries" :min="0" :max="5" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 模板管理对话框 -->
    <el-dialog v-model="showTemplateManager" title="打招呼语模板管理" width="900px" top="5vh">
      <TemplateManagerContent />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  VideoPlay,
  VideoPause,
  SwitchButton,
  Setting,
  Loading,
  SuccessFilled,
  CircleCloseFilled,
  WarningFilled,
} from '@element-plus/icons-vue';
import { useAutoDelivery } from '@/composables/useAutoDelivery';
import { useDeliveryConfig } from '@/stores/deliveryConfig';
import TemplateSelector from '@/components/TemplateSelector.vue';
import TemplateManagerContent from '@/pages/TemplateManager.vue';

const autoDelivery = useAutoDelivery();
const configStore = useDeliveryConfig();

const showConfigDialog = ref(false);
const showTemplateManager = ref(false);
const activeTab = ref('rules');

// 处理模板选择
function handleTemplateSelect(content: string) {
  configStore.config.strategy.greetingTemplate = content;
}

onMounted(async () => {
  await autoDelivery.initialize();
});

async function handleStart() {
  try {
    // 获取岗位数据
    const data = await chrome.storage.local.get('jobs');
    const jobs = data.jobs || [];

    if (jobs.length === 0) {
      ElMessage.warning('没有可投递的岗位，请先抓取岗位数据');
      return;
    }

    // 确认开始
    await ElMessageBox.confirm(
      `即将开始自动投递，共 ${jobs.length} 个岗位。确认继续？`,
      '确认投递',
      {
        confirmButtonText: '开始',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await autoDelivery.startAutoDelivery(jobs);
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('启动失败: ' + String(error));
    }
  }
}

async function handleStop() {
  try {
    await ElMessageBox.confirm('确定要停止投递吗？', '确认停止', {
      confirmButtonText: '停止',
      cancelButtonText: '取消',
      type: 'warning',
    });

    autoDelivery.stopAutoDelivery();
    ElMessage.success('已停止投递');
  } catch (error) {
    // 用户取消
  }
}

async function handleSaveConfig() {
  try {
    await configStore.saveConfig();
    ElMessage.success('配置保存成功');
    showConfigDialog.value = false;
  } catch (error) {
    ElMessage.error('保存失败: ' + String(error));
  }
}

async function loadHistory() {
  // TODO: 实现历史记录查看
  ElMessage.info('历史记录功能开发中');
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}
</script>

<style scoped>
.auto-delivery-page {
  padding: 20px;
}

.header-card {
  margin-bottom: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title h2 {
  margin: 0;
  font-size: 20px;
}

.actions {
  display: flex;
  gap: 8px;
}

.stats-row {
  margin-bottom: 16px;
}

.progress-card {
  margin-bottom: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.current-task {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
}

.queue-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.text-center {
  text-align: center;
}
</style>
