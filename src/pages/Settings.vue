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
const showEditModel = ref(false);
const editingModelKey = ref<string | null>(null);
const selectedModelType = ref('claude');
const fileInput = ref<HTMLInputElement | null>(null);
const backupFileInput = ref<HTMLInputElement | null>(null);
const testingModel = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

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
  base_url: '',
  model: 'claude-opus-4-7',
  temperature: 0.7,
  max_tokens: 8192,
});

// 预设的模型配置
const modelPresets = {
  claude: {
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      { label: 'Claude Opus 4.7 (最强推理)', value: 'claude-opus-4-7', tokens: 200000 },
      { label: 'Claude Sonnet 4.6 (平衡)', value: 'claude-sonnet-4-6', tokens: 200000 },
      { label: 'Claude Haiku 4.5 (快速)', value: 'claude-haiku-4-5', tokens: 200000 },
      { label: 'Claude 3.5 Sonnet (旧版)', value: 'claude-3-5-sonnet-20241022', tokens: 200000 },
      { label: 'Claude 3 Opus (旧版)', value: 'claude-3-opus-20240229', tokens: 200000 },
    ]
  },
  openai: {
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { label: 'GPT-4o (最新)', value: 'gpt-4o', tokens: 128000 },
      { label: 'GPT-4o-mini (快速)', value: 'gpt-4o-mini', tokens: 128000 },
      { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', tokens: 128000 },
      { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', tokens: 16385 },
    ]
  },
  deepseek: {
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    models: [
      { label: 'DeepSeek Chat', value: 'deepseek-chat', tokens: 64000 },
      { label: 'DeepSeek Coder', value: 'deepseek-coder', tokens: 64000 },
    ]
  },
  custom: {
    defaultBaseUrl: '',
    models: []
  }
};

// 当模型类型改变时，更新默认值
function onModelTypeChange(type: string) {
  selectedModelType.value = type;
  const preset = modelPresets[type as keyof typeof modelPresets];
  if (preset) {
    newModel.value.base_url = preset.defaultBaseUrl;
    if (preset.models.length > 0) {
      newModel.value.model = preset.models[0].value;
      newModel.value.max_tokens = preset.models[0].tokens;
    }
  }
}

// 当选择模型时，更新 max_tokens
function onModelChange(modelValue: string) {
  const preset = modelPresets[newModel.value.mode as keyof typeof modelPresets];
  const model = preset?.models.find(m => m.value === modelValue);
  if (model) {
    newModel.value.max_tokens = model.tokens;
  }
}

// 测试模型连接
async function testModelConnection() {
  // 验证必填字段
  if (!newModel.value.api_key.trim()) {
    ElMessage.warning('请先输入 API Key');
    return;
  }
  if (!newModel.value.model.trim()) {
    ElMessage.warning('请先选择模型');
    return;
  }

  testingModel.value = true;
  testResult.value = null;

  try {
    const baseUrl = newModel.value.base_url || modelPresets[newModel.value.mode as keyof typeof modelPresets]?.defaultBaseUrl;

    if (newModel.value.mode === 'claude') {
      // 测试 Claude API
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': newModel.value.api_key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: newModel.value.model,
          max_tokens: 100,
          messages: [
            { role: 'user', content: '请回复"测试成功"' }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        testResult.value = {
          success: true,
          message: `连接成功！模型响应：${data.content?.[0]?.text || '正常'}`
        };
        ElMessage.success('模型测试成功');
      } else {
        const error = await response.json();
        testResult.value = {
          success: false,
          message: `连接失败：${error.error?.message || response.statusText}`
        };
        ElMessage.error('模型测试失败');
      }
    } else {
      // 测试 OpenAI 兼容 API
      const apiUrl = newModel.value.mode === 'custom'
        ? baseUrl
        : `${baseUrl}/chat/completions`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newModel.value.api_key}`,
        },
        body: JSON.stringify({
          model: newModel.value.model,
          messages: [
            { role: 'user', content: '请回复"测试成功"' }
          ],
          max_tokens: 100,
        })
      });

      if (response.ok) {
        const data = await response.json();
        testResult.value = {
          success: true,
          message: `连接成功！模型响应：${data.choices?.[0]?.message?.content || '正常'}`
        };
        ElMessage.success('模型测试成功');
      } else {
        const error = await response.json();
        testResult.value = {
          success: false,
          message: `连接失败：${error.error?.message || response.statusText}`
        };
        ElMessage.error('模型测试失败');
      }
    }
  } catch (error: any) {
    console.error('测试连接失败:', error);

    testResult.value = {
      success: false,
      message: '测试失败，但不影响实际使用。请保存后在实际场景中验证'
    };
    ElMessage.warning('测试连接失败，但配置可能仍然有效，请保存后在实际使用中验证');
  } finally {
    testingModel.value = false;
  }
}

function addModel() {
  showAddModel.value = true;
}

function saveNewModel() {
  // 验证必填字段
  if (!newModel.value.name.trim()) {
    ElMessage.warning('请输入模型名称');
    return;
  }
  if (!newModel.value.api_key.trim()) {
    ElMessage.warning('请输入 API Key');
    return;
  }
  if (!newModel.value.model.trim()) {
    ElMessage.warning('请选择模型');
    return;
  }

  // 验证 base_url 格式
  if (newModel.value.base_url && !newModel.value.base_url.startsWith('http')) {
    ElMessage.warning('API 端点必须以 http:// 或 https:// 开头');
    return;
  }

  const modelColors: Record<string, string> = {
    claude: '#CC9B7A',
    openai: '#10A37F',
    deepseek: '#1E88E5',
    custom: '#9C27B0'
  };

  const modelData = {
    key: Date.now().toString(),
    name: newModel.value.name,
    color: modelColors[newModel.value.mode] || '#666',
    data: {
      mode: newModel.value.mode,
      api_key: newModel.value.api_key,
      base_url: newModel.value.base_url || modelPresets[newModel.value.mode as keyof typeof modelPresets]?.defaultBaseUrl || '',
      model: newModel.value.model,
      temperature: newModel.value.temperature,
      max_tokens: newModel.value.max_tokens,
    },
  };

  modelStore.modelData.push(modelData as any);
  modelStore.saveModel();
  showAddModel.value = false;

  // 重置表单
  newModel.value = {
    name: '',
    mode: 'claude',
    api_key: '',
    base_url: '',
    model: 'claude-opus-4-7',
    temperature: 0.7,
    max_tokens: 8192,
  };

  ElMessage.success('模型添加成功');
}

function deleteModel(key: string) {
  modelStore.modelData = modelStore.modelData.filter(m => m.key !== key);
  modelStore.saveModel();
}

// 编辑模型
function editModel(model: any) {
  editingModelKey.value = model.key;
  newModel.value = {
    name: model.name,
    mode: model.data?.mode || 'claude',
    api_key: model.data?.api_key || '',
    base_url: model.data?.base_url || '',
    model: model.data?.model || '',
    temperature: model.data?.temperature || 0.7,
    max_tokens: model.data?.max_tokens || 8192,
  };
  selectedModelType.value = model.data?.mode || 'claude';
  showEditModel.value = true;
}

// 保存编辑的模型
function saveEditedModel() {
  // 验证必填字段
  if (!newModel.value.name.trim()) {
    ElMessage.warning('请输入模型名称');
    return;
  }
  if (!newModel.value.api_key.trim()) {
    ElMessage.warning('请输入 API Key');
    return;
  }
  if (!newModel.value.model.trim()) {
    ElMessage.warning('请选择模型');
    return;
  }

  // 验证 base_url 格式
  if (newModel.value.base_url && !newModel.value.base_url.startsWith('http')) {
    ElMessage.warning('API 端点必须以 http:// 或 https:// 开头');
    return;
  }

  const modelColors: Record<string, string> = {
    claude: '#CC9B7A',
    openai: '#10A37F',
    deepseek: '#1E88E5',
    custom: '#9C27B0'
  };

  // 找到要编辑的模型
  const modelIndex = modelStore.modelData.findIndex(m => m.key === editingModelKey.value);
  if (modelIndex === -1) {
    ElMessage.error('模型不存在');
    return;
  }

  // 更新模型数据
  modelStore.modelData[modelIndex] = {
    key: editingModelKey.value!,
    name: newModel.value.name,
    color: modelColors[newModel.value.mode] || '#666',
    data: {
      mode: newModel.value.mode,
      api_key: newModel.value.api_key,
      base_url: newModel.value.base_url || modelPresets[newModel.value.mode as keyof typeof modelPresets]?.defaultBaseUrl || '',
      model: newModel.value.model,
      temperature: newModel.value.temperature,
      max_tokens: newModel.value.max_tokens,
    },
  } as any;

  modelStore.saveModel();
  showEditModel.value = false;
  editingModelKey.value = null;

  // 重置表单
  newModel.value = {
    name: '',
    mode: 'claude',
    api_key: '',
    base_url: '',
    model: 'claude-opus-4-7',
    temperature: 0.7,
    max_tokens: 8192,
  };

  ElMessage.success('模型更新成功');
}

// 测试已保存的模型
async function testSavedModel(model: any) {
  const testingKey = `testing_${model.key}`;
  (model as any)[testingKey] = true;

  try {
    const baseUrl = model.data?.base_url || modelPresets[model.data?.mode as keyof typeof modelPresets]?.defaultBaseUrl;

    if (model.data?.mode === 'claude') {
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': model.data.api_key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model.data.model,
          max_tokens: 100,
          messages: [{ role: 'user', content: '请回复"测试成功"' }]
        })
      });

      if (response.ok) {
        ElMessage.success(`${model.name} 测试成功`);
      } else {
        const error = await response.json();
        ElMessage.error(`${model.name} 测试失败：${error.error?.message || response.statusText}`);
      }
    } else {
      const apiUrl = model.data?.mode === 'custom'
        ? baseUrl
        : `${baseUrl}/chat/completions`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.data.api_key}`,
        },
        body: JSON.stringify({
          model: model.data.model,
          messages: [{ role: 'user', content: '请回复"测试成功"' }],
          max_tokens: 100,
        })
      });

      if (response.ok) {
        ElMessage.success(`${model.name} 测试成功`);
      } else {
        const error = await response.json();
        ElMessage.error(`${model.name} 测试失败：${error.error?.message || response.statusText}`);
      }
    }
  } catch (error: any) {
    ElMessage.error(`${model.name} 测试失败：${error.message}`);
  } finally {
    delete (model as any)[testingKey];
  }
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
              <div style="display: flex; gap: 8px">
                <button
                  class="btn btn-ghost sm"
                  :disabled="(model as any)[`testing_${model.key}`]"
                  @click="testSavedModel(model)"
                >
                  <svg v-if="!(model as any)[`testing_${model.key}`]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  {{ (model as any)[`testing_${model.key}`] ? '测试中...' : '测试' }}
                </button>
                <button class="btn btn-ghost sm" @click="editModel(model)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  编辑
                </button>
                <button class="btn btn-ghost sm" @click="deleteModel(model.key)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  删除
                </button>
              </div>
            </div>
            <div class="card-body">
              <div style="font-size: 11.5px; color: var(--fg-2); line-height: 1.6">
                <div style="margin-bottom: 4px">
                  <span style="color: var(--fg-3)">模型:</span>
                  <span style="color: var(--fg-1)">{{ model.data?.model }}</span>
                </div>
                <div style="margin-bottom: 4px">
                  <span style="color: var(--fg-3)">端点:</span>
                  <span style="color: var(--fg-1)">{{ model.data?.base_url || '默认' }}</span>
                </div>
                <div style="margin-bottom: 4px">
                  <span style="color: var(--fg-3)">API Key:</span>
                  <span style="color: var(--fg-1); font-family: monospace">{{ model.data?.api_key?.substring(0, 20) }}...</span>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 6px">
                  <span style="color: var(--fg-3)">温度: <span style="color: var(--fg-1)">{{ model.data?.temperature }}</span></span>
                  <span style="color: var(--fg-3)">最大令牌: <span style="color: var(--fg-1)">{{ model.data?.max_tokens }}</span></span>
                </div>
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

    <ElDialog v-model="showAddModel" title="添加 AI 模型" width="600px">
      <ElForm :model="newModel" label-width="100px" label-position="left">
        <ElFormItem label="模型名称" required>
          <ElInput
            v-model="newModel.name"
            placeholder="例如：我的 Claude Opus 4.7"
            clearable
          />
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            给这个模型配置起一个便于识别的名称
          </div>
        </ElFormItem>

        <ElFormItem label="模型类型" required>
          <ElSelect
            v-model="newModel.mode"
            @change="onModelTypeChange"
            style="width: 100%"
          >
            <ElOption label="Claude (Anthropic)" value="claude">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #CC9B7A"></span>
                <span>Claude (Anthropic)</span>
              </div>
            </ElOption>
            <ElOption label="OpenAI" value="openai">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10A37F"></span>
                <span>OpenAI</span>
              </div>
            </ElOption>
            <ElOption label="DeepSeek" value="deepseek">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #1E88E5"></span>
                <span>DeepSeek</span>
              </div>
            </ElOption>
            <ElOption label="自定义 (OpenAI 兼容)" value="custom">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #9C27B0"></span>
                <span>自定义 (OpenAI 兼容)</span>
              </div>
            </ElOption>
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="API 端点">
          <ElInput
            v-model="newModel.base_url"
            :placeholder="modelPresets[newModel.mode as keyof typeof modelPresets]?.defaultBaseUrl || 'https://api.example.com/v1'"
            clearable
          >
            <template #prepend>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </template>
          </ElInput>
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            留空使用默认端点。支持自定义代理或中转服务
          </div>
        </ElFormItem>

        <ElFormItem label="API Key" required>
          <ElInput
            v-model="newModel.api_key"
            type="password"
            show-password
            :placeholder="newModel.mode === 'claude' ? 'sk-ant-api03-...' : 'sk-...'"
            clearable
          >
            <template #prepend>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </template>
          </ElInput>
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            API 密钥将使用 AES-256 加密存储
          </div>
        </ElFormItem>

        <ElFormItem label="模型" required>
          <ElSelect
            v-if="newModel.mode !== 'custom'"
            v-model="newModel.model"
            @change="onModelChange"
            style="width: 100%"
          >
            <template v-if="newModel.mode === 'claude'">
              <ElOption
                v-for="model in modelPresets.claude.models"
                :key="model.value"
                :label="model.label"
                :value="model.value"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ model.label }}</span>
                  <span style="font-size: 11px; color: var(--fg-3)">{{ (model.tokens / 1000).toFixed(0) }}K tokens</span>
                </div>
              </ElOption>
            </template>
            <template v-else-if="newModel.mode === 'openai'">
              <ElOption
                v-for="model in modelPresets.openai.models"
                :key="model.value"
                :label="model.label"
                :value="model.value"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ model.label }}</span>
                  <span style="font-size: 11px; color: var(--fg-3)">{{ (model.tokens / 1000).toFixed(0) }}K tokens</span>
                </div>
              </ElOption>
            </template>
            <template v-else-if="newModel.mode === 'deepseek'">
              <ElOption
                v-for="model in modelPresets.deepseek.models"
                :key="model.value"
                :label="model.label"
                :value="model.value"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ model.label }}</span>
                  <span style="font-size: 11px; color: var(--fg-3)">{{ (model.tokens / 1000).toFixed(0) }}K tokens</span>
                </div>
              </ElOption>
            </template>
          </ElSelect>
          <ElInput
            v-else
            v-model="newModel.model"
            placeholder="输入模型名称，例如：gpt-4o"
            clearable
          />
          <div v-if="newModel.mode === 'custom'" style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            自定义模式需要手动输入模型名称
          </div>
        </ElFormItem>

        <ElFormItem label="Max Tokens">
          <ElInputNumber
            v-model="newModel.max_tokens"
            :min="1024"
            :max="200000"
            :step="1024"
            style="width: 100%"
          />
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            最大输出长度
          </div>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div style="display: flex; align-items: center; gap: 12px">
            <ElButton
              :loading="testingModel"
              :disabled="!newModel.api_key || !newModel.model"
              @click="testModelConnection"
            >
              <svg v-if="!testingModel" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              {{ testingModel ? '测试中...' : '测试连接' }}
            </ElButton>
            <div v-if="testResult" style="font-size: 11px; display: flex; align-items: center; gap: 4px">
              <svg v-if="testResult.success" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52c41a" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span :style="{ color: testResult.success ? '#52c41a' : '#ff4d4f' }">
                {{ testResult.message }}
              </span>
            </div>
          </div>
          <div style="display: flex; gap: 8px">
            <ElButton @click="showAddModel = false">取消</ElButton>
            <ElButton type="primary" @click="saveNewModel">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              保存模型
            </ElButton>
          </div>
        </div>
      </template>
    </ElDialog>

    <!-- 编辑模型对话框 -->
    <ElDialog v-model="showEditModel" title="编辑 AI 模型" width="600px">
      <ElForm :model="newModel" label-width="100px" label-position="left">
        <ElFormItem label="模型名称" required>
          <ElInput
            v-model="newModel.name"
            placeholder="例如：我的 Claude Opus 4.7"
            clearable
          />
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            给这个模型配置起一个便于识别的名称
          </div>
        </ElFormItem>

        <ElFormItem label="模型类型" required>
          <ElSelect
            v-model="newModel.mode"
            @change="onModelTypeChange"
            style="width: 100%"
          >
            <ElOption label="Claude (Anthropic)" value="claude">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #CC9B7A"></span>
                <span>Claude (Anthropic)</span>
              </div>
            </ElOption>
            <ElOption label="OpenAI" value="openai">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10A37F"></span>
                <span>OpenAI</span>
              </div>
            </ElOption>
            <ElOption label="DeepSeek" value="deepseek">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #1E88E5"></span>
                <span>DeepSeek</span>
              </div>
            </ElOption>
            <ElOption label="自定义 (OpenAI 兼容)" value="custom">
              <div style="display: flex; align-items: center; gap: 8px">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #9C27B0"></span>
                <span>自定义 (OpenAI 兼容)</span>
              </div>
            </ElOption>
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="API 端点">
          <ElInput
            v-model="newModel.base_url"
            :placeholder="modelPresets[newModel.mode as keyof typeof modelPresets]?.defaultBaseUrl || 'https://api.example.com/v1'"
            clearable
          >
            <template #prepend>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </template>
          </ElInput>
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            留空使用默认端点。支持自定义代理或中转服务
          </div>
        </ElFormItem>

        <ElFormItem label="API Key" required>
          <ElInput
            v-model="newModel.api_key"
            type="password"
            show-password
            :placeholder="newModel.mode === 'claude' ? 'sk-ant-api03-...' : 'sk-...'"
            clearable
          >
            <template #prepend>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </template>
          </ElInput>
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            API 密钥将使用 AES-256 加密存储
          </div>
        </ElFormItem>

        <ElFormItem label="模型" required>
          <ElSelect
            v-if="newModel.mode !== 'custom'"
            v-model="newModel.model"
            @change="onModelChange"
            style="width: 100%"
          >
            <template v-if="newModel.mode === 'claude'">
              <ElOption
                v-for="model in modelPresets.claude.models"
                :key="model.value"
                :label="model.label"
                :value="model.value"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ model.label }}</span>
                  <span style="font-size: 11px; color: var(--fg-3)">{{ (model.tokens / 1000).toFixed(0) }}K tokens</span>
                </div>
              </ElOption>
            </template>
            <template v-else-if="newModel.mode === 'openai'">
              <ElOption
                v-for="model in modelPresets.openai.models"
                :key="model.value"
                :label="model.label"
                :value="model.value"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ model.label }}</span>
                  <span style="font-size: 11px; color: var(--fg-3)">{{ (model.tokens / 1000).toFixed(0) }}K tokens</span>
                </div>
              </ElOption>
            </template>
            <template v-else-if="newModel.mode === 'deepseek'">
              <ElOption
                v-for="model in modelPresets.deepseek.models"
                :key="model.value"
                :label="model.label"
                :value="model.value"
              >
                <div style="display: flex; justify-content: space-between; align-items: center">
                  <span>{{ model.label }}</span>
                  <span style="font-size: 11px; color: var(--fg-3)">{{ (model.tokens / 1000).toFixed(0) }}K tokens</span>
                </div>
              </ElOption>
            </template>
          </ElSelect>
          <ElInput
            v-else
            v-model="newModel.model"
            placeholder="输入模型名称，例如：gpt-4o"
            clearable
          />
          <div v-if="newModel.mode === 'custom'" style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            自定义模式需要手动输入模型名称
          </div>
        </ElFormItem>

        <ElFormItem label="Max Tokens">
          <ElInputNumber
            v-model="newModel.max_tokens"
            :min="1024"
            :max="200000"
            :step="1024"
            style="width: 100%"
          />
          <div style="font-size: 11px; color: var(--fg-3); margin-top: 4px">
            最大输出长度
          </div>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div style="display: flex; align-items: center; gap: 12px">
            <ElButton
              :loading="testingModel"
              :disabled="!newModel.api_key || !newModel.model"
              @click="testModelConnection"
            >
              <svg v-if="!testingModel" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              {{ testingModel ? '测试中...' : '测试连接' }}
            </ElButton>
            <div v-if="testResult" style="font-size: 11px; display: flex; align-items: center; gap: 4px">
              <svg v-if="testResult.success" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52c41a" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span :style="{ color: testResult.success ? '#52c41a' : '#ff4d4f' }">
                {{ testResult.message }}
              </span>
            </div>
          </div>
          <div style="display: flex; gap: 8px">
            <ElButton @click="showEditModel = false">取消</ElButton>
            <ElButton type="primary" @click="saveEditedModel">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              保存修改
            </ElButton>
          </div>
        </div>
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
