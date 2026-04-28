<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConfig } from '@/composables/useConfig';
import { useModel } from '@/composables/useModel';
import { ElMessage, ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElSlider, ElSwitch, ElInputNumber } from 'element-plus';
import SearchConfigCard from '@/components/SearchConfigCard.vue';
import ResumeProfileCard from '@/components/ResumeProfileCard.vue';
import AIScoreCard from '@/components/AIScoreCard.vue';
import { exportAllData, importAllData, downloadBackup, getAutoBackups, clearAllData } from '@/utils/backup';

const configStore = useConfig();
const modelStore = useModel();

const showAddModel = ref(false);
const selectedModelType = ref('claude');
const fileInput = ref<HTMLInputElement | null>(null);
const backupFileInput = ref<HTMLInputElement | null>(null);

// 备份相关
const showBackupDialog = ref(false);
const showRestoreDialog = ref(false);
const backupPassword = ref('');
const restorePassword = ref('');
const restoreFile = ref<File | null>(null);
const autoBackupList = ref<Array<{ timestamp: number; data: string }>>([]);

const newModel = ref({
  name: '',
  mode: 'claude',
  api_key: '',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  max_tokens: 4096,
});

function addModel() {
  showAddModel.value = true;
}

function saveNewModel() {
  const modelData = {
    key: Date.now().toString(),
    name: newModel.value.name,
    color: selectedModelType.value === 'claude' ? '#CC9B7A' : '#10A37F',
    data: {
      mode: newModel.value.mode,
      api_key: newModel.value.api_key,
      model: newModel.value.model,
      temperature: newModel.value.temperature,
      max_tokens: newModel.value.max_tokens,
    },
  };

  modelStore.modelData.push(modelData as any);
  modelStore.saveModel();
  showAddModel.value = false;
  ElMessage.success('模型添加成功');
}

function deleteModel(key: string) {
  modelStore.modelData = modelStore.modelData.filter(m => m.key !== key);
  modelStore.saveModel();
}

async function saveConfig() {
  await configStore.saveConfig();
}

function resetConfig() {
  configStore.resetConfig();
}

function exportConfig() {
  configStore.exportConfig();
}

function importConfig() {
  fileInput.value?.click();
}

async function handleImportFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await configStore.importConfig(file);
  }
}

// 备份功能
async function handleBackup(encrypted: boolean = false) {
  try {
    const password = encrypted ? backupPassword.value : undefined;
    if (encrypted && !password) {
      ElMessage.warning('请输入加密密码');
      return;
    }

    const backupData = await exportAllData(password);
    downloadBackup(backupData, encrypted);
    ElMessage.success('备份成功');
    showBackupDialog.value = false;
    backupPassword.value = '';
  } catch (error: any) {
    ElMessage.error(error.message || '备份失败');
  }
}

function openBackupDialog() {
  showBackupDialog.value = true;
}

function openRestoreDialog() {
  backupFileInput.value?.click();
}

async function handleRestoreFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    restoreFile.value = file;
    showRestoreDialog.value = true;
  }
}

async function handleRestore() {
  if (!restoreFile.value) {
    ElMessage.warning('请选择备份文件');
    return;
  }

  try {
    const fileContent = await restoreFile.value.text();
    const backup = JSON.parse(fileContent);

    const password = backup.encrypted ? restorePassword.value : undefined;
    if (backup.encrypted && !password) {
      ElMessage.warning('此备份已加密，请输入密码');
      return;
    }

    await importAllData(fileContent, password);
    showRestoreDialog.value = false;
    restorePassword.value = '';
    restoreFile.value = null;
  } catch (error: any) {
    ElMessage.error(error.message || '恢复失败');
  }
}

async function loadAutoBackups() {
  autoBackupList.value = await getAutoBackups();
}

async function restoreFromAutoBackup(backupData: string) {
  try {
    await importAllData(backupData);
  } catch (error: any) {
    ElMessage.error(error.message || '恢复失败');
  }
}

async function handleClearAllData() {
  if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
    await clearAllData();
    setTimeout(() => location.reload(), 1000);
  }
}

onMounted(async () => {
  await configStore.loadConfig();
  await modelStore.initModel();
  await loadAutoBackups();
});
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>搜索条件</h1>
        <div class="sub">配置 AI 抓取与筛选规则 · 修改后 5 分钟内生效</div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" @click="resetConfig">重置</button>
        <button class="btn btn-primary" @click="saveConfig">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          保存并启用
        </button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px">
      <SearchConfigCard />

      <div class="col-flex" style="gap: 14px">
        <ResumeProfileCard />
        <AIScoreCard />
      </div>
    </div>

    <!-- AI 模型配置 -->
    <div class="card">
      <div class="card-h">
        <h3>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          AI 模型配置
        </h3>
        <button class="btn btn-primary sm" @click="addModel">添加模型</button>
      </div>
      <div class="card-body">
        <div v-if="modelStore.modelData.length === 0" class="empty">
          暂无配置的模型，点击右上角"添加模型"开始配置
        </div>
        <div v-else class="col-flex" style="gap: 12px">
          <div
            v-for="model in modelStore.modelData"
            :key="model.key"
            class="card"
            style="background: var(--bg-2)"
          >
            <div class="card-h">
              <h3>
                <span
                  class="pill"
                  :style="{ background: model.color + '33', color: model.color }"
                >
                  {{ model.data?.mode }}
                </span>
                {{ model.name }}
              </h3>
              <button class="btn btn-ghost sm" @click="deleteModel(model.key)">删除</button>
            </div>
            <div class="card-body">
              <div style="font-size: 11.5px; color: var(--fg-2)">
                <div>模型: {{ model.data?.model }}</div>
                <div>API Key: {{ model.data?.api_key?.substring(0, 20) }}...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统配置 -->
    <div class="card" style="margin-top: 14px">
      <div class="card-h">
        <h3>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m13.2 5.2l-4.2-4.2m0-6l-4.2-4.2"></path>
          </svg>
          系统配置
        </h3>
      </div>
      <div class="card-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
          <div class="config-item">
            <label class="lbl">通知提醒</label>
            <ElSwitch v-model="configStore.config.notifications" />
          </div>
          <div class="config-item">
            <label class="lbl">自动刷新</label>
            <ElSwitch v-model="configStore.config.autoRefresh" />
          </div>
          <div class="config-item">
            <label class="lbl">每日投递上限</label>
            <ElInputNumber
              v-model="configStore.config.deliveryLimit"
              :min="1"
              :max="200"
              :step="10"
            />
          </div>
        </div>

        <div class="hr" style="margin: 16px 0"></div>

        <div style="display: flex; gap: 10px">
          <button class="btn btn-ghost" @click="exportConfig">导出配置</button>
          <button class="btn btn-ghost" @click="importConfig">导入配置</button>
        </div>
      </div>
    </div>

    <!-- 数据备份与恢复 -->
    <div class="card" style="margin-top: 14px">
      <div class="card-h">
        <h3>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          数据备份与恢复
        </h3>
      </div>
      <div class="card-body">
        <div style="display: flex; gap: 10px; margin-bottom: 16px">
          <button class="btn btn-primary" @click="openBackupDialog">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            备份数据
          </button>
          <button class="btn btn-ghost" @click="openRestoreDialog">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            恢复数据
          </button>
          <button class="btn btn-ghost" style="color: var(--danger)" @click="handleClearAllData">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            清除所有数据
          </button>
        </div>

        <div v-if="autoBackupList.length > 0" class="auto-backup-section">
          <div class="hr" style="margin: 16px 0"></div>
          <h4 style="font-size: 12px; color: var(--fg-2); margin-bottom: 12px">自动备份记录（最近 5 个）</h4>
          <div class="backup-list">
            <div v-for="(backup, index) in autoBackupList" :key="index" class="backup-item">
              <div class="backup-info">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>{{ new Date(backup.timestamp).toLocaleString('zh-CN') }}</span>
              </div>
              <button class="btn btn-ghost sm" @click="restoreFromAutoBackup(backup.data)">恢复</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ElDialog v-model="showAddModel" title="添加 AI 模型" width="500px">
      <ElForm :model="newModel" label-width="100px">
        <ElFormItem label="模型名称">
          <ElInput v-model="newModel.name" placeholder="例如：我的 Claude" />
        </ElFormItem>
        <ElFormItem label="模型类型">
          <ElSelect v-model="newModel.mode" @change="selectedModelType = newModel.mode">
            <ElOption label="Claude (Anthropic)" value="claude" />
            <ElOption label="OpenAI 兼容" value="openai" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="API Key">
          <ElInput
            v-model="newModel.api_key"
            type="password"
            placeholder="sk-ant-... 或 sk-..."
          />
        </ElFormItem>
        <ElFormItem label="模型">
          <ElSelect v-model="newModel.model">
            <template v-if="newModel.mode === 'claude'">
              <ElOption label="Claude 3.5 Sonnet (最新)" value="claude-3-5-sonnet-20241022" />
              <ElOption label="Claude 3 Opus" value="claude-3-opus-20240229" />
              <ElOption label="Claude 3 Haiku" value="claude-3-haiku-20240307" />
            </template>
            <template v-else>
              <ElOption label="GPT-4o" value="gpt-4o" />
              <ElOption label="GPT-4o-mini" value="gpt-4o-mini" />
              <ElOption label="DeepSeek Chat" value="deepseek-chat" />
            </template>
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="Temperature">
          <ElSlider v-model="newModel.temperature" :min="0" :max="1" :step="0.1" />
        </ElFormItem>
        <ElFormItem label="Max Tokens">
          <ElInput v-model.number="newModel.max_tokens" type="number" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="showAddModel = false">取消</ElButton>
        <ElButton type="primary" @click="saveNewModel">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 备份对话框 -->
    <ElDialog v-model="showBackupDialog" title="备份数据" width="450px">
      <div style="margin-bottom: 16px">
        <p style="font-size: 13px; color: var(--fg-2); margin-bottom: 12px">
          备份将包含所有配置、AI 模型、简历、投递记录等数据
        </p>
        <ElForm label-width="80px">
          <ElFormItem label="加密密码">
            <ElInput
              v-model="backupPassword"
              type="password"
              placeholder="留空则不加密（可选）"
              clearable
            />
          </ElFormItem>
        </ElForm>
      </div>
      <template #footer>
        <ElButton @click="showBackupDialog = false">取消</ElButton>
        <ElButton type="primary" @click="handleBackup(!!backupPassword)">
          {{ backupPassword ? '加密备份' : '备份' }}
        </ElButton>
      </template>
    </ElDialog>

    <!-- 恢复对话框 -->
    <ElDialog v-model="showRestoreDialog" title="恢复数据" width="450px">
      <div style="margin-bottom: 16px">
        <p style="font-size: 13px; color: var(--fg-2); margin-bottom: 12px">
          恢复数据将覆盖当前所有配置，建议先备份当前数据
        </p>
        <ElForm label-width="80px">
          <ElFormItem label="备份文件">
            <div style="font-size: 12px; color: var(--fg-1)">
              {{ restoreFile?.name || '未选择文件' }}
            </div>
          </ElFormItem>
          <ElFormItem label="解密密码">
            <ElInput
              v-model="restorePassword"
              type="password"
              placeholder="如果备份已加密，请输入密码"
              clearable
            />
          </ElFormItem>
        </ElForm>
      </div>
      <template #footer>
        <ElButton @click="showRestoreDialog = false">取消</ElButton>
        <ElButton type="primary" @click="handleRestore">恢复</ElButton>
      </template>
    </ElDialog>

    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleImportFile"
    />
    <input
      ref="backupFileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleRestoreFile"
    />
  </div>
</template>

<style scoped>
.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--bg-1);
  border-radius: 6px;
}

.lbl {
  font-size: 12px;
  font-weight: 500;
  color: var(--fg-1);
}

.hr {
  height: 1px;
  background: var(--line);
}

.backup-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-1);
  border-radius: 6px;
  font-size: 12px;
}

.backup-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fg-1);
}

.backup-info svg {
  color: var(--fg-3);
}
</style>
