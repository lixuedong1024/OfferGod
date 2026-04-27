import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';

export interface SearchConfig {
  keywords: string[];
  excludeKeywords: string[];
  city: string;
  districts: string[];
  experience: string;
  education: string;
  salaryRange: [number, number];
  enabled: boolean;
}

export interface ResumeProfile {
  fileName: string;
  fileSize: string;
  uploadDate: string;
  tags: string[];
  preferences: string;
  parsed: boolean;
}

export interface AIScoreConfig {
  threshold: number;
  autoApply: boolean;
}

export interface AppConfig {
  search: SearchConfig;
  resume: ResumeProfile | null;
  aiScore: AIScoreConfig;
  notifications: boolean;
  autoRefresh: boolean;
  deliveryLimit: number;
}

const DEFAULT_CONFIG: AppConfig = {
  search: {
    keywords: [],
    excludeKeywords: [],
    city: '北京',
    districts: [],
    experience: '3-5年',
    education: '本科',
    salaryRange: [15, 25],
    enabled: true,
  },
  resume: null,
  aiScore: {
    threshold: 75,
    autoApply: true,
  },
  notifications: true,
  autoRefresh: false,
  deliveryLimit: 80,
};

export const useConfig = defineStore('config', () => {
  const config = ref<AppConfig>(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  const loading = ref(false);

  // 从 storage 加载配置
  async function loadConfig() {
    try {
      loading.value = true;
      const data = await chrome.storage.local.get('offergod_config');
      if (data.offergod_config) {
        config.value = { ...DEFAULT_CONFIG, ...data.offergod_config };
        console.log('配置加载成功:', config.value);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      ElMessage.error('加载配置失败');
    } finally {
      loading.value = false;
    }
  }

  // 保存配置
  async function saveConfig() {
    try {
      loading.value = true;
      await chrome.storage.local.set({ offergod_config: config.value });
      ElMessage.success('配置保存成功');
      console.log('配置已保存:', config.value);
    } catch (error) {
      console.error('保存配置失败:', error);
      ElMessage.error('保存配置失败');
    } finally {
      loading.value = false;
    }
  }

  // 重置配置
  function resetConfig() {
    config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    ElMessage.success('配置已重置');
  }

  // 导出配置
  function exportConfig() {
    const dataStr = JSON.stringify(config.value, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offergod_config_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    ElMessage.success('配置导出成功');
  }

  // 导入配置
  function importConfig(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target?.result as string);
          config.value = { ...DEFAULT_CONFIG, ...importedConfig };
          ElMessage.success('配置导入成功');
          resolve(config.value);
        } catch (error) {
          ElMessage.error('配置文件格式错误');
          reject(error);
        }
      };
      reader.onerror = () => {
        ElMessage.error('读取配置文件失败');
        reject(reader.error);
      };
      reader.readAsText(file);
    });
  }

  // 更新搜索配置
  function updateSearchConfig(updates: Partial<SearchConfig>) {
    config.value.search = { ...config.value.search, ...updates };
  }

  // 更新简历配置
  function updateResumeProfile(resume: ResumeProfile) {
    config.value.resume = resume;
  }

  // 更新AI评分配置
  function updateAIScoreConfig(updates: Partial<AIScoreConfig>) {
    config.value.aiScore = { ...config.value.aiScore, ...updates };
  }

  return {
    config,
    loading,
    loadConfig,
    saveConfig,
    resetConfig,
    exportConfig,
    importConfig,
    updateSearchConfig,
    updateResumeProfile,
    updateAIScoreConfig,
  };
});
