import { ref } from 'vue';
import { useModel } from './useModel';
import { Logger } from '@/utils/logger';

export interface JobAnalysisResult {
  score: number; // 匹配度评分 0-100
  matched: string[]; // 匹配的技能和要求
  missing: string[]; // 缺失的技能和要求
  suggestions: string[]; // 改进建议
  summary: string; // 总结
  shouldApply: boolean; // 是否建议投递
  cachedAt?: number; // 缓存时间
}

export interface ResumeProfile {
  skills: string[];
  experience: string;
  education: string;
  projects: string[];
  strengths: string[];
}

const CACHE_KEY = 'job_analysis_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

/**
 * AI 岗位匹配分析
 */
export function useJobAnalysis() {
  const modelStore = useModel();
  const analyzing = ref(false);

  /**
   * 从缓存加载分析结果
   */
  async function loadFromCache(jobId: string): Promise<JobAnalysisResult | null> {
    try {
      const data = await chrome.storage.local.get(CACHE_KEY);
      const cache = data[CACHE_KEY] || {};
      const cached = cache[jobId];

      if (cached && cached.cachedAt) {
        const age = Date.now() - cached.cachedAt;
        if (age < CACHE_DURATION) {
          Logger.debug('从缓存加载分析结果', { jobId, age });
          return cached;
        }
      }

      return null;
    } catch (error) {
      Logger.error('加载缓存失败', { error: String(error) });
      return null;
    }
  }

  /**
   * 保存分析结果到缓存
   */
  async function saveToCache(jobId: string, result: JobAnalysisResult): Promise<void> {
    try {
      const data = await chrome.storage.local.get(CACHE_KEY);
      const cache = data[CACHE_KEY] || {};

      cache[jobId] = {
        ...result,
        cachedAt: Date.now(),
      };

      await chrome.storage.local.set({ [CACHE_KEY]: cache });
      Logger.debug('保存分析结果到缓存', { jobId });
    } catch (error) {
      Logger.error('保存缓存失败', { error: String(error) });
    }
  }

  /**
   * 清理过期缓存
   */
  async function cleanExpiredCache(): Promise<void> {
    try {
      const data = await chrome.storage.local.get(CACHE_KEY);
      const cache = data[CACHE_KEY] || {};
      const now = Date.now();
      let cleaned = 0;

      for (const jobId in cache) {
        const age = now - (cache[jobId].cachedAt || 0);
        if (age >= CACHE_DURATION) {
          delete cache[jobId];
          cleaned++;
        }
      }

      if (cleaned > 0) {
        await chrome.storage.local.set({ [CACHE_KEY]: cache });
        Logger.info('清理过期缓存', { cleaned });
      }
    } catch (error) {
      Logger.error('清理缓存失败', { error: String(error) });
    }
  }

  /**
   * 使用 AI 分析岗位匹配度
   */
  async function analyzeJobMatch(
    jobData: any,
    resume: ResumeProfile,
    useCache = true
  ): Promise<JobAnalysisResult> {
    analyzing.value = true;

    try {
      // 尝试从缓存加载
      if (useCache) {
        const cached = await loadFromCache(jobData.encryptJobId);
        if (cached) {
          analyzing.value = false;
          return cached;
        }
      }

      // 检查是否配置了 AI 模型
      if (!modelStore.modelData || modelStore.modelData.length === 0) {
        Logger.warn('未配置 AI 模型，使用基础分析');
        return basicAnalysis(jobData, resume);
      }

      // 使用第一个可用的模型
      const model = modelStore.modelData[0];

      // 构建分析提示词
      const prompt = buildAnalysisPrompt(jobData, resume);

      // 调用 AI 模型
      const llm = modelStore.getModel(model, prompt);
      const response = await llm.chat();

      // 解析 AI 响应
      const result = parseAIResponse(response);

      // 保存到缓存
      await saveToCache(jobData.encryptJobId, result);

      return result;
    } catch (error) {
      Logger.error('AI 分析失败，使用基础分析', { error: String(error) });
      return basicAnalysis(jobData, resume);
    } finally {
      analyzing.value = false;
    }
  }

  /**
   * 构建分析提示词
   */
  function buildAnalysisPrompt(jobData: any, resume: ResumeProfile): string {
    return `你是一位专业的求职顾问，请分析以下岗位与候选人的匹配度。

## 岗位信息
- 职位：${jobData.jobName}
- 公司：${jobData.brandName}
- 薪资：${jobData.salaryDesc}
- 地点：${jobData.cityName}
- 经验要求：${jobData.experienceName}
- 学历要求：${jobData.degreeName}
- 技能要求：${jobData.jobLabels?.join('、') || '无'}
- 岗位描述：${jobData.postDescription || '无'}

## 候选人信息
- 工作经验：${resume.experience}
- 学历：${resume.education}
- 技能：${resume.skills.join('、')}
- 项目经验：${resume.projects.join('；')}
- 优势：${resume.strengths.join('、')}

请按以下 JSON 格式返回分析结果（只返回 JSON，不要其他内容）：

{
  "score": 85,
  "matched": ["匹配的技能1", "匹配的要求2"],
  "missing": ["缺失的技能1", "需要补充的经验2"],
  "suggestions": ["建议1", "建议2"],
  "summary": "总体评价和建议",
  "shouldApply": true
}

评分标准：
- 90-100分：高度匹配，强烈推荐投递
- 75-89分：较好匹配，建议投递
- 60-74分：基本匹配，可以尝试
- 60分以下：匹配度较低，不建议投递`;
  }

  /**
   * 解析 AI 响应
   */
  function parseAIResponse(response: string): JobAnalysisResult {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: Math.max(0, Math.min(100, parsed.score || 0)),
          matched: Array.isArray(parsed.matched) ? parsed.matched : [],
          missing: Array.isArray(parsed.missing) ? parsed.missing : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          summary: parsed.summary || '',
          shouldApply: parsed.shouldApply !== false,
        };
      }

      throw new Error('无法解析 AI 响应');
    } catch (error) {
      Logger.error('解析 AI 响应失败', { error: String(error), response });
      throw error;
    }
  }

  /**
   * 基础分析（不使用 AI）
   */
  function basicAnalysis(jobData: any, resume: ResumeProfile): JobAnalysisResult {
    const jobSkills = new Set(jobData.jobLabels || []);
    const resumeSkills = new Set(resume.skills);

    // 计算技能匹配度
    const matchedSkills = Array.from(jobSkills).filter(skill =>
      Array.from(resumeSkills).some(rs => rs.toLowerCase().includes(skill.toLowerCase()))
    );

    const missingSkills = Array.from(jobSkills).filter(skill =>
      !Array.from(resumeSkills).some(rs => rs.toLowerCase().includes(skill.toLowerCase()))
    );

    // 简单评分
    const skillMatchRate = jobSkills.size > 0 ? (matchedSkills.length / jobSkills.size) : 0.5;
    const score = Math.round(50 + skillMatchRate * 50);

    return {
      score,
      matched: matchedSkills.length > 0 ? matchedSkills : ['工作经验符合要求'],
      missing: missingSkills.length > 0 ? missingSkills : ['建议补充更多项目案例'],
      suggestions: [
        '在简历中突出相关项目经验',
        '准备好技术问题的回答',
        '了解公司业务和产品',
      ],
      summary: score >= 75
        ? '岗位匹配度较高，建议投递'
        : score >= 60
        ? '岗位基本匹配，可以尝试投递'
        : '匹配度一般，建议谨慎考虑',
      shouldApply: score >= 60,
    };
  }

  /**
   * 批量分析岗位
   */
  async function batchAnalyzeJobs(
    jobs: any[],
    resume: ResumeProfile,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, JobAnalysisResult>> {
    const results = new Map<string, JobAnalysisResult>();

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      try {
        const result = await analyzeJobMatch(job, resume, true);
        results.set(job.encryptJobId, result);

        if (onProgress) {
          onProgress(i + 1, jobs.length);
        }

        // 避免请求过快
        if (i < jobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        Logger.error('分析岗位失败', { jobId: job.encryptJobId, error: String(error) });
      }
    }

    return results;
  }

  return {
    analyzing,
    analyzeJobMatch,
    batchAnalyzeJobs,
    cleanExpiredCache,
  };
}
