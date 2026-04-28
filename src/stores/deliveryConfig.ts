import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Logger } from '@/utils/logger';

/**
 * 投递规则配置
 */
export interface DeliveryRule {
  // 基础筛选
  enabled: boolean;
  minScore: number; // 最低匹配分数 0-100

  // 薪资筛选
  salaryFilter: {
    enabled: boolean;
    minSalary: number; // 最低薪资（K）
    maxSalary: number; // 最高薪资（K）
  };

  // 地点筛选
  locationFilter: {
    enabled: boolean;
    cities: string[]; // 允许的城市列表
    excludeCities: string[]; // 排除的城市列表
  };

  // 经验筛选
  experienceFilter: {
    enabled: boolean;
    allowedExperience: string[]; // 如 ["1-3年", "3-5年"]
  };

  // 学历筛选
  educationFilter: {
    enabled: boolean;
    minEducation: string; // 如 "本科"
  };

  // 公司筛选
  companyFilter: {
    enabled: boolean;
    minSize: string; // 最小公司规模
    industries: string[]; // 允许的行业
    excludeCompanies: string[]; // 排除的公司名单
  };

  // 技能筛选
  skillFilter: {
    enabled: boolean;
    requiredSkills: string[]; // 必须包含的技能
    excludeSkills: string[]; // 排除的技能
  };

  // Boss 筛选
  bossFilter: {
    enabled: boolean;
    minActiveLevel: string; // 最低活跃度 如 "本周活跃"
    excludeInactive: boolean; // 排除不活跃的
  };

  // 黑名单
  blacklist: {
    enabled: boolean;
    companies: string[]; // 公司黑名单
    keywords: string[]; // 关键词黑名单
  };
}

/**
 * 投递配置
 */
export interface DeliveryConfig {
  // 投递规则
  rule: DeliveryRule;

  // 投递限制
  limits: {
    dailyLimit: number; // 每日投递上限
    hourlyLimit: number; // 每小时投递上限
    minInterval: number; // 最小投递间隔（秒）
    maxInterval: number; // 最大投递间隔（秒）
  };

  // 投递策略
  strategy: {
    autoGenGreeting: boolean; // 自动生成打招呼语
    useAI: boolean; // 使用 AI 生成
    greetingTemplate: string; // 打招呼语模板
    prioritizeHighScore: boolean; // 优先投递高分岗位
  };

  // 安全设置
  safety: {
    enableRateLimit: boolean; // 启用频率限制
    randomDelay: boolean; // 随机延迟
    stopOnError: boolean; // 遇到错误时停止
    maxRetries: number; // 最大重试次数
  };
}

const STORAGE_KEY = 'delivery_config';

// 默认配置
const DEFAULT_CONFIG: DeliveryConfig = {
  rule: {
    enabled: true,
    minScore: 60,
    salaryFilter: {
      enabled: false,
      minSalary: 10,
      maxSalary: 50,
    },
    locationFilter: {
      enabled: false,
      cities: [],
      excludeCities: [],
    },
    experienceFilter: {
      enabled: false,
      allowedExperience: [],
    },
    educationFilter: {
      enabled: false,
      minEducation: '不限',
    },
    companyFilter: {
      enabled: false,
      minSize: '不限',
      industries: [],
      excludeCompanies: [],
    },
    skillFilter: {
      enabled: false,
      requiredSkills: [],
      excludeSkills: [],
    },
    bossFilter: {
      enabled: false,
      minActiveLevel: '本周活跃',
      excludeInactive: true,
    },
    blacklist: {
      enabled: true,
      companies: [],
      keywords: ['外包', '派遣', '中介'],
    },
  },
  limits: {
    dailyLimit: 50,
    hourlyLimit: 10,
    minInterval: 30,
    maxInterval: 60,
  },
  strategy: {
    autoGenGreeting: true,
    useAI: true,
    greetingTemplate: '你好，看到贵司在招聘{jobTitle}，我有{experience}相关经验，方便聊一下吗？',
    prioritizeHighScore: true,
  },
  safety: {
    enableRateLimit: true,
    randomDelay: true,
    stopOnError: false,
    maxRetries: 3,
  },
};

export const useDeliveryConfig = defineStore('deliveryConfig', () => {
  const config = ref<DeliveryConfig>(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
  const loading = ref(false);

  /**
   * 加载配置
   */
  async function loadConfig() {
    loading.value = true;
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);
      if (data[STORAGE_KEY]) {
        config.value = data[STORAGE_KEY];
        Logger.info('加载投递配置成功');
      } else {
        Logger.info('使用默认投递配置');
      }
    } catch (error) {
      Logger.error('加载投递配置失败', { error: String(error) });
    } finally {
      loading.value = false;
    }
  }

  /**
   * 保存配置
   */
  async function saveConfig() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: config.value });
      Logger.info('保存投递配置成功');
    } catch (error) {
      Logger.error('保存投递配置失败', { error: String(error) });
      throw error;
    }
  }

  /**
   * 更新配置
   */
  async function updateConfig(updates: Partial<DeliveryConfig>) {
    config.value = {
      ...config.value,
      ...updates,
    };
    await saveConfig();
  }

  /**
   * 重置为默认配置
   */
  async function resetConfig() {
    config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    await saveConfig();
    Logger.info('重置投递配置为默认值');
  }

  /**
   * 检查岗位是否符合规则
   */
  function checkJobMatchesRule(job: any, analysisResult?: any): { passed: boolean; reason?: string } {
    const rule = config.value.rule;

    if (!rule.enabled) {
      return { passed: true };
    }

    // 检查匹配分数
    if (analysisResult && analysisResult.score < rule.minScore) {
      return { passed: false, reason: `匹配分数 ${analysisResult.score} 低于最低要求 ${rule.minScore}` };
    }

    // 检查薪资
    if (rule.salaryFilter.enabled && job.salaryDesc) {
      const salaryMatch = job.salaryDesc.match(/(\d+)-(\d+)K/);
      if (salaryMatch) {
        const minSalary = parseInt(salaryMatch[1]);
        const maxSalary = parseInt(salaryMatch[2]);
        if (maxSalary < rule.salaryFilter.minSalary || minSalary > rule.salaryFilter.maxSalary) {
          return { passed: false, reason: `薪资 ${job.salaryDesc} 不符合要求` };
        }
      }
    }

    // 检查地点
    if (rule.locationFilter.enabled) {
      if (rule.locationFilter.cities.length > 0 && !rule.locationFilter.cities.includes(job.cityName)) {
        return { passed: false, reason: `地点 ${job.cityName} 不在允许列表中` };
      }
      if (rule.locationFilter.excludeCities.includes(job.cityName)) {
        return { passed: false, reason: `地点 ${job.cityName} 在排除列表中` };
      }
    }

    // 检查经验
    if (rule.experienceFilter.enabled && rule.experienceFilter.allowedExperience.length > 0) {
      if (!rule.experienceFilter.allowedExperience.includes(job.experienceName)) {
        return { passed: false, reason: `经验要求 ${job.experienceName} 不符合` };
      }
    }

    // 检查公司
    if (rule.companyFilter.enabled) {
      if (rule.companyFilter.excludeCompanies.includes(job.brandName)) {
        return { passed: false, reason: `公司 ${job.brandName} 在排除列表中` };
      }
    }

    // 检查技能
    if (rule.skillFilter.enabled) {
      const jobSkills = job.jobLabels || [];

      // 检查必须技能
      if (rule.skillFilter.requiredSkills.length > 0) {
        const hasRequired = rule.skillFilter.requiredSkills.some(skill =>
          jobSkills.some((js: string) => js.toLowerCase().includes(skill.toLowerCase()))
        );
        if (!hasRequired) {
          return { passed: false, reason: '缺少必需技能' };
        }
      }

      // 检查排除技能
      if (rule.skillFilter.excludeSkills.length > 0) {
        const hasExcluded = rule.skillFilter.excludeSkills.some(skill =>
          jobSkills.some((js: string) => js.toLowerCase().includes(skill.toLowerCase()))
        );
        if (hasExcluded) {
          return { passed: false, reason: '包含排除的技能' };
        }
      }
    }

    // 检查黑名单
    if (rule.blacklist.enabled) {
      // 检查公司黑名单
      if (rule.blacklist.companies.includes(job.brandName)) {
        return { passed: false, reason: `公司 ${job.brandName} 在黑名单中` };
      }

      // 检查关键词黑名单
      const jobText = `${job.jobName} ${job.brandName} ${job.postDescription || ''}`.toLowerCase();
      for (const keyword of rule.blacklist.keywords) {
        if (jobText.includes(keyword.toLowerCase())) {
          return { passed: false, reason: `包含黑名单关键词: ${keyword}` };
        }
      }
    }

    return { passed: true };
  }

  return {
    config,
    loading,
    loadConfig,
    saveConfig,
    updateConfig,
    resetConfig,
    checkJobMatchesRule,
  };
});
