/**
 * 简历与JD匹配算法
 * 计算匹配度并生成匹配报告
 */

import type {
  JobRequirement,
  ResumeData,
  MatchResult,
  MatchDetail,
  SkillMatchResult,
  SkillRequirement,
} from '@/types/job';
import { useModel } from '@/composables/useModel';
import { Logger } from './logger';

/**
 * 计算简历与JD的匹配度
 */
export async function matchJobWithResume(
  jobId: string,
  jobName: string,
  requirement: JobRequirement,
  resume: ResumeData
): Promise<MatchResult> {
  try {
    Logger.info('开始计算匹配度', { jobId, jobName });

    // 1. 经验匹配 (权重 30%)
    const experienceMatch = matchExperience(requirement.experience, resume.workYears);

    // 2. 学历匹配 (权重 20%)
    const educationMatch = matchEducation(requirement.education, resume.education, resume.major);

    // 3. 技能匹配 (权重 40%)
    const skillsMatch = matchSkills(requirement.skills, resume.skills, resume.keywords);

    // 4. 计算总分
    const totalScore = Math.round(
      experienceMatch.score * 0.3 +
      educationMatch.score * 0.2 +
      skillsMatch.score * 0.4 +
      10 // 基础分10分
    );

    // 5. 生成匹配项和缺失项
    const matchedItems = generateMatchedItems(experienceMatch, educationMatch, skillsMatch);
    const missingItems = generateMissingItems(experienceMatch, educationMatch, skillsMatch);

    // 6. 生成AI建议
    const { aiSuggestion, shouldApply, reason } = await generateAISuggestion(
      jobName,
      totalScore,
      experienceMatch,
      educationMatch,
      skillsMatch,
      requirement,
      resume
    );

    const result: MatchResult = {
      jobId,
      totalScore,
      experienceMatch,
      educationMatch,
      skillsMatch,
      matchedItems,
      missingItems,
      aiSuggestion,
      shouldApply,
      reason,
      calculatedAt: Date.now(),
      version: 1,
    };

    Logger.info('匹配度计算完成', {
      jobId,
      totalScore,
      shouldApply,
    });

    return result;
  } catch (error) {
    Logger.error('匹配度计算失败', { error: String(error) });
    throw error;
  }
}

/**
 * 匹配经验要求
 */
function matchExperience(
  requirement: { min: number; max: number; required: boolean; description?: string },
  workYears: number
): MatchDetail {
  let score = 0;
  let matched = false;
  let detail = '';

  if (!requirement.required) {
    // 不要求经验
    score = 100;
    matched = true;
    detail = '岗位对经验无硬性要求';
  } else if (workYears < requirement.min) {
    // 经验不足
    const gap = requirement.min - workYears;
    score = Math.max(0, 100 - gap * 20); // 每差1年扣20分
    matched = false;
    detail = `工作年限 ${workYears} 年，低于要求的 ${requirement.min} 年（差 ${gap} 年）`;
  } else if (requirement.max === -1 || workYears <= requirement.max) {
    // 完全匹配
    score = 100;
    matched = true;
    detail = `工作年限 ${workYears} 年，符合要求（${requirement.description || requirement.min + '年以上'}）`;
  } else {
    // 超出上限（通常不是问题）
    score = 95;
    matched = true;
    detail = `工作年限 ${workYears} 年，超出要求范围但经验丰富`;
  }

  return { score, matched, detail };
}

/**
 * 匹配学历要求
 */
function matchEducation(
  requirement: { level: string; required: boolean; major?: string },
  education: string,
  major?: string
): MatchDetail {
  let score = 0;
  let matched = false;
  let detail = '';

  const levelRank: Record<string, number> = {
    '不限': 0,
    '高中': 1,
    '大专': 2,
    '本科': 3,
    '硕士': 4,
    '博士': 5,
  };

  const reqRank = levelRank[requirement.level] || 0;
  const eduRank = levelRank[education] || 0;

  if (!requirement.required || requirement.level === '不限') {
    score = 100;
    matched = true;
    detail = '岗位对学历无硬性要求';
  } else if (eduRank >= reqRank) {
    score = 100;
    matched = true;
    detail = `学历 ${education}，符合要求（${requirement.level}）`;

    // 检查专业匹配
    if (requirement.major && major) {
      if (major.includes(requirement.major) || requirement.major.includes(major)) {
        detail += `，专业匹配（${major}）`;
      } else {
        score = 90;
        detail += `，但专业不完全匹配（${major} vs ${requirement.major}）`;
      }
    }
  } else {
    const gap = reqRank - eduRank;
    score = Math.max(0, 100 - gap * 25); // 每差1级扣25分
    matched = false;
    detail = `学历 ${education}，低于要求（${requirement.level}）`;
  }

  return { score, matched, detail };
}

/**
 * 匹配技能要求
 */
function matchSkills(
  requirements: SkillRequirement[],
  resumeSkills: string[],
  resumeKeywords: string[]
): SkillMatchResult {
  const matched: SkillRequirement[] = [];
  const missing: SkillRequirement[] = [];
  const bonus: SkillRequirement[] = [];

  // 合并简历技能和关键词（转小写用于匹配）
  const allResumeSkills = [...resumeSkills, ...resumeKeywords].map(s => s.toLowerCase());

  // 遍历要求的技能
  for (const req of requirements) {
    const reqName = req.name.toLowerCase();
    const isMatched = allResumeSkills.some(skill =>
      skill.includes(reqName) || reqName.includes(skill)
    );

    if (isMatched) {
      if (req.required) {
        matched.push(req);
      } else {
        bonus.push(req);
      }
    } else {
      if (req.required) {
        missing.push(req);
      }
    }
  }

  // 计算分数
  const requiredCount = requirements.filter(r => r.required).length;
  const matchedRequiredCount = matched.length;

  let score = 0;
  if (requiredCount === 0) {
    // 没有必须技能，根据加分项计算
    score = 60 + Math.min(40, bonus.length * 10);
  } else {
    // 必须技能匹配率
    const matchRate = matchedRequiredCount / requiredCount;
    score = Math.round(matchRate * 80); // 必须技能占80分

    // 加分项
    const bonusScore = Math.min(20, bonus.length * 5);
    score += bonusScore;
  }

  return {
    score,
    matched,
    missing,
    bonus,
    matchedNames: matched.map(s => s.name),
    missingNames: missing.map(s => s.name),
  };
}

/**
 * 生成匹配项列表
 */
function generateMatchedItems(
  experienceMatch: MatchDetail,
  educationMatch: MatchDetail,
  skillsMatch: SkillMatchResult
): string[] {
  const items: string[] = [];

  // 经验匹配
  if (experienceMatch.matched) {
    items.push(experienceMatch.detail);
  }

  // 学历匹配
  if (educationMatch.matched) {
    items.push(educationMatch.detail);
  }

  // 技能匹配
  if (skillsMatch.matched.length > 0) {
    const skillNames = skillsMatch.matched.slice(0, 5).map(s => s.name).join('、');
    items.push(`掌握要求的技能：${skillNames}${skillsMatch.matched.length > 5 ? ' 等' : ''}`);
  }

  // 加分项
  if (skillsMatch.bonus.length > 0) {
    const bonusNames = skillsMatch.bonus.slice(0, 3).map(s => s.name).join('、');
    items.push(`具备加分项：${bonusNames}${skillsMatch.bonus.length > 3 ? ' 等' : ''}`);
  }

  return items;
}

/**
 * 生成缺失项列表
 */
function generateMissingItems(
  experienceMatch: MatchDetail,
  educationMatch: MatchDetail,
  skillsMatch: SkillMatchResult
): string[] {
  const items: string[] = [];

  // 经验不足
  if (!experienceMatch.matched) {
    items.push(experienceMatch.detail);
  }

  // 学历不足
  if (!educationMatch.matched) {
    items.push(educationMatch.detail);
  }

  // 缺失技能
  if (skillsMatch.missing.length > 0) {
    for (const skill of skillsMatch.missing.slice(0, 3)) {
      items.push(`建议补充 ${skill.name} 相关经验（要求${skill.level}）`);
    }
  }

  return items;
}

/**
 * 生成AI建议
 */
async function generateAISuggestion(
  jobName: string,
  totalScore: number,
  experienceMatch: MatchDetail,
  educationMatch: MatchDetail,
  skillsMatch: SkillMatchResult,
  requirement: JobRequirement,
  resume: ResumeData
): Promise<{ aiSuggestion: string; shouldApply: boolean; reason: string }> {
  // 基于分数的基础判断
  let shouldApply = totalScore >= 70;
  let reason = '';

  if (totalScore >= 85) {
    reason = '匹配度很高，强烈建议投递';
  } else if (totalScore >= 70) {
    reason = '匹配度良好，建议投递';
  } else if (totalScore >= 60) {
    reason = '匹配度一般，可以尝试投递';
  } else {
    reason = '匹配度较低，建议补充相关经验后再投递';
  }

  // 尝试使用AI生成更详细的建议
  try {
    const modelStore = useModel();
    if (modelStore.currentModel.value) {
      const prompt = `你是一位专业的求职顾问，请基于以下匹配分析给出投递建议。

# 岗位信息
- 职位名称：${jobName}
- 综合匹配度：${totalScore}/100

# 详细匹配情况
## 工作经验
${experienceMatch.detail}
评分：${experienceMatch.score}/100

## 学历背景
${educationMatch.detail}
评分：${educationMatch.score}/100

## 技能匹配
- 匹配的必备技能：${skillsMatch.matched.length} 项${skillsMatch.matched.length > 0 ? '（' + skillsMatch.matchedNames.slice(0, 3).join('、') + (skillsMatch.matched.length > 3 ? ' 等' : '') + '）' : ''}
- 缺失的必备技能：${skillsMatch.missing.length} 项${skillsMatch.missing.length > 0 ? '（' + skillsMatch.missingNames.slice(0, 3).join('、') + (skillsMatch.missing.length > 3 ? ' 等' : '') + '）' : ''}
- 加分项技能：${skillsMatch.bonus.length} 项
评分：${skillsMatch.score}/100

# 任务要求
请给出专业的投递建议，要求：
1. 明确表态：建议投递/谨慎投递/不建议投递
2. 给出核心理由（一句话，30字以内）
3. 直接输出建议内容，格式：[建议]。[理由]

# 评判标准
- 85分以上：强烈建议投递，匹配度很高
- 70-84分：建议投递，匹配度良好
- 60-69分：谨慎投递，需要突出优势
- 60分以下：不建议投递，匹配度较低

请直接输出建议，不要其他解释。`;

      const aiResponse = await modelStore.chat(prompt);

      // 解析AI响应
      if (aiResponse.includes('建议投递') || aiResponse.includes('推荐投递')) {
        shouldApply = true;
      } else if (aiResponse.includes('不建议') || aiResponse.includes('谨慎')) {
        shouldApply = false;
      }

      return {
        aiSuggestion: aiResponse.trim(),
        shouldApply,
        reason,
      };
    }
  } catch (error) {
    Logger.warn('AI建议生成失败，使用默认建议', { error: String(error) });
  }

  // 默认建议
  const defaultSuggestion = generateDefaultSuggestion(
    totalScore,
    experienceMatch,
    educationMatch,
    skillsMatch
  );

  return {
    aiSuggestion: defaultSuggestion,
    shouldApply,
    reason,
  };
}

/**
 * 生成默认建议（当AI不可用时）
 */
function generateDefaultSuggestion(
  totalScore: number,
  experienceMatch: MatchDetail,
  educationMatch: MatchDetail,
  skillsMatch: SkillMatchResult
): string {
  const parts: string[] = [];

  if (totalScore >= 85) {
    parts.push('强烈建议投递');
  } else if (totalScore >= 70) {
    parts.push('建议投递');
  } else if (totalScore >= 60) {
    parts.push('可以尝试投递');
  } else {
    parts.push('建议谨慎考虑');
  }

  // 添加主要优势
  if (experienceMatch.matched && skillsMatch.matched.length > 0) {
    parts.push(`工作经验和核心技能匹配度高`);
  } else if (experienceMatch.matched) {
    parts.push(`工作经验符合要求`);
  } else if (skillsMatch.matched.length > 0) {
    parts.push(`技能匹配度较好`);
  }

  // 添加改进建议
  if (skillsMatch.missing.length > 0) {
    const missingSkill = skillsMatch.missing[0].name;
    parts.push(`建议在简历中突出 ${missingSkill} 相关经验`);
  }

  return parts.join('。') + '。';
}

/**
 * 从 chrome.storage 加载简历数据
 */
export async function loadResumeData(): Promise<ResumeData | null> {
  try {
    const data = await chrome.storage.local.get('resume-data');
    if (data['resume-data']) {
      const resumeData = data['resume-data'];

      // 转换为 ResumeData 格式
      return {
        name: resumeData.name || '求职者',
        workYears: calculateWorkYears(resumeData.workExperience || []),
        education: resumeData.education || '本科',
        major: resumeData.major,
        skills: resumeData.skills || [],
        workExperience: resumeData.workExperience || [],
        projects: resumeData.projects || [],
        keywords: extractResumeKeywords(resumeData),
      };
    }
    return null;
  } catch (error) {
    Logger.error('加载简历数据失败', { error: String(error) });
    return null;
  }
}

/**
 * 计算工作年限
 */
function calculateWorkYears(workExperience: any[]): number {
  if (!workExperience || workExperience.length === 0) {
    return 0;
  }

  // 简单计算：取最早的开始时间到现在
  const now = new Date();
  let earliestYear = now.getFullYear();

  for (const exp of workExperience) {
    if (exp.startDate) {
      const year = new Date(exp.startDate).getFullYear();
      if (year < earliestYear) {
        earliestYear = year;
      }
    }
  }

  return now.getFullYear() - earliestYear;
}

/**
 * 从简历中提取关键词
 */
function extractResumeKeywords(resumeData: any): string[] {
  const keywords = new Set<string>();

  // 从工作经历提取
  if (resumeData.workExperience) {
    for (const exp of resumeData.workExperience) {
      if (exp.description) {
        // 提取技术关键词（简单实现）
        const words = exp.description.match(/[A-Za-z]+/g) || [];
        words.forEach((w: string) => {
          if (w.length > 2) keywords.add(w);
        });
      }
    }
  }

  // 从项目经历提取
  if (resumeData.projects) {
    for (const proj of resumeData.projects) {
      if (proj.technologies) {
        proj.technologies.forEach((tech: string) => keywords.add(tech));
      }
    }
  }

  return Array.from(keywords);
}
