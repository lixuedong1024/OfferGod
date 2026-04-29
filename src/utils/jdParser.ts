/**
 * JD解析工具
 * 使用AI模型解析岗位描述，提取结构化信息
 */

import type {
  JobRequirement,
  SkillRequirement,
  ExperienceRequirement,
  EducationRequirement,
} from '@/types/job';
import { useModel } from '@/composables/useModel';
import { Logger } from './logger';

/**
 * 解析JD文本，提取结构化信息
 */
export async function parseJobDescription(
  jobId: string,
  jobName: string,
  description: string,
  experienceName: string,
  degreeName: string,
  jobLabels: string[]
): Promise<JobRequirement> {
  try {
    Logger.info('开始解析JD', { jobId, jobName });

    const modelStore = useModel();

    // 检查是否有可用的AI模型
    if (!modelStore.currentModel.value) {
      Logger.warn('没有可用的AI模型，使用规则解析');
      return parseJobDescriptionByRules(
        jobId,
        jobName,
        description,
        experienceName,
        degreeName,
        jobLabels
      );
    }

    // 构建AI解析提示词
    const prompt = `你是一位专业的招聘分析专家，擅长从JD中提取结构化信息。请仔细分析以下招聘信息，提取所有关键要求。

# 岗位信息
- 职位名称：${jobName}
- 经验要求：${experienceName}
- 学历要求：${degreeName}
- 技能标签：${jobLabels.join('、') || '无'}

# 岗位描述
${description}

# 任务要求
请提取以下结构化信息，以JSON格式返回（只返回JSON，不要任何其他文字或解释）：

## 输出格式示例
{
  "experience": {
    "min": 3,
    "max": 5,
    "required": true,
    "description": "3-5年相关工作经验"
  },
  "education": {
    "level": "本科",
    "required": true,
    "major": "计算机相关专业"
  },
  "skills": [
    {
      "name": "Python",
      "level": "精通",
      "required": true,
      "category": "编程语言"
    },
    {
      "name": "Django",
      "level": "熟悉",
      "required": true,
      "category": "框架"
    },
    {
      "name": "Docker",
      "level": "了解",
      "required": false,
      "category": "工具"
    }
  ],
  "responsibilities": [
    "负责后端系统开发和维护",
    "参与技术方案设计和评审"
  ],
  "requirements": [
    "3年以上Python开发经验",
    "熟悉Django/Flask等主流框架",
    "有微服务架构实践经验"
  ],
  "bonusPoints": [
    "有大型互联网项目经验",
    "有开源项目贡献经验"
  ],
  "keywords": [
    "Python",
    "Django",
    "后端开发",
    "微服务",
    "RESTful API"
  ]
}

## 字段约束
1. **experience.max**: 如果没有上限或"以上"则设为 -1
2. **skill.level**: 只能是"精通"、"熟悉"或"了解"三者之一
3. **skill.category**: 只能是"编程语言"、"框架"、"工具"、"数据库"或"软技能"
4. **education.level**: 只能是"不限"、"高中"、"大专"、"本科"、"硕士"或"博士"
5. **skills**: 提取所有明确提到的技能，包括编程语言、框架、工具、数据库等，区分必须(required=true)和加分项(required=false)
6. **responsibilities**: 提取3-5条主要工作职责，使用完整句子
7. **requirements**: 提取3-5条核心任职要求，使用完整句子
8. **bonusPoints**: 提取加分项，如"优先"、"有...经验更佳"等
9. **keywords**: 提取5-10个最能代表该岗位的关键词

## 提取原则
- 仔细阅读岗位描述，不要遗漏隐含的技能要求
- 根据"精通"、"熟悉"、"了解"等词判断技能等级，如无明确说明则根据上下文推断
- 区分硬性要求(required=true)和加分项(required=false)
- responsibilities 和 requirements 要提取完整的句子，不要只提取关键词`;

    // 调用AI模型
    const response = await modelStore.chat(prompt);

    // 解析AI返回的JSON
    const parsed = parseAIResponse(response);

    const requirement: JobRequirement = {
      jobId,
      experience: parsed.experience,
      education: parsed.education,
      skills: parsed.skills,
      responsibilities: parsed.responsibilities,
      requirements: parsed.requirements,
      bonusPoints: parsed.bonusPoints,
      keywords: parsed.keywords,
      rawDescription: description,
      parsedAt: Date.now(),
      version: 1,
    };

    Logger.info('JD解析成功', {
      jobId,
      skillsCount: requirement.skills.length,
      keywordsCount: requirement.keywords.length,
    });

    return requirement;
  } catch (error) {
    Logger.error('JD解析失败，使用规则解析', { error: String(error) });

    // 降级到规则解析
    return parseJobDescriptionByRules(
      jobId,
      jobName,
      description,
      experienceName,
      degreeName,
      jobLabels
    );
  }
}

/**
 * 解析AI返回的JSON响应
 */
function parseAIResponse(response: string): any {
  try {
    // 尝试提取JSON（AI可能返回带有其他文字的内容）
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // 直接解析
    return JSON.parse(response);
  } catch (error) {
    throw new Error('无法解析AI返回的JSON: ' + error);
  }
}

/**
 * 基于规则的JD解析（备用方案）
 */
function parseJobDescriptionByRules(
  jobId: string,
  jobName: string,
  description: string,
  experienceName: string,
  degreeName: string,
  jobLabels: string[]
): JobRequirement {
  Logger.info('使用规则解析JD', { jobId });

  // 解析经验要求
  const experience = parseExperience(experienceName);

  // 解析学历要求
  const education = parseEducation(degreeName);

  // 从描述中提取技能
  const skills = extractSkills(description, jobLabels);

  // 提取职责和要求
  const { responsibilities, requirements } = extractResponsibilitiesAndRequirements(description);

  // 提取关键词
  const keywords = extractKeywords(description, jobName, jobLabels);

  return {
    jobId,
    experience,
    education,
    skills,
    responsibilities,
    requirements,
    bonusPoints: [],
    keywords,
    rawDescription: description,
    parsedAt: Date.now(),
    version: 1,
  };
}

/**
 * 解析经验要求
 */
function parseExperience(experienceName: string): ExperienceRequirement {
  const text = experienceName.toLowerCase();

  // 匹配 "3-5年"
  const rangeMatch = text.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1]),
      max: parseInt(rangeMatch[2]),
      required: true,
      description: experienceName,
    };
  }

  // 匹配 "3年以上" 或 "3+"
  const minMatch = text.match(/(\d+)[年+]/);
  if (minMatch) {
    return {
      min: parseInt(minMatch[1]),
      max: -1,
      required: true,
      description: experienceName,
    };
  }

  // 匹配 "应届生" 或 "不限"
  if (text.includes('应届') || text.includes('不限') || text.includes('经验不限')) {
    return {
      min: 0,
      max: -1,
      required: false,
      description: experienceName,
    };
  }

  // 默认
  return {
    min: 0,
    max: -1,
    required: false,
    description: experienceName,
  };
}

/**
 * 解析学历要求
 */
function parseEducation(degreeName: string): EducationRequirement {
  const text = degreeName.toLowerCase();

  const levelMap: Record<string, string> = {
    '博士': '博士',
    '硕士': '硕士',
    '本科': '本科',
    '大专': '大专',
    '高中': '高中',
    '不限': '不限',
  };

  for (const [key, value] of Object.entries(levelMap)) {
    if (text.includes(key)) {
      return {
        level: value,
        required: value !== '不限',
      };
    }
  }

  return {
    level: '不限',
    required: false,
  };
}

/**
 * 从描述中提取技能
 */
function extractSkills(description: string, jobLabels: string[]): SkillRequirement[] {
  const skills: SkillRequirement[] = [];
  const skillSet = new Set<string>();

  // 常见技能关键词库
  const skillKeywords = {
    编程语言: ['Python', 'Java', 'JavaScript', 'TypeScript', 'Go', 'C++', 'C#', 'PHP', 'Ruby', 'Rust', 'Kotlin', 'Swift'],
    框架: ['React', 'Vue', 'Angular', 'Django', 'Flask', 'Spring', 'Express', 'FastAPI', 'Next.js', 'Nuxt.js'],
    工具: ['Git', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab', 'GitHub', 'Linux', 'Nginx', 'Redis', 'Kafka'],
    数据库: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Oracle', 'SQL Server', 'Elasticsearch'],
    软技能: ['沟通能力', '团队协作', '学习能力', '问题解决', '项目管理', '英语'],
  };

  const text = description + ' ' + jobLabels.join(' ');

  // 遍历技能库，查找匹配
  for (const [category, keywords] of Object.entries(skillKeywords)) {
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      if (regex.test(text) && !skillSet.has(keyword)) {
        skillSet.add(keyword);

        // 判断要求等级
        let level = '了解';
        let required = false;

        if (text.match(new RegExp(`精通.*?${keyword}|${keyword}.*?精通`, 'i'))) {
          level = '精通';
          required = true;
        } else if (text.match(new RegExp(`熟悉.*?${keyword}|${keyword}.*?熟悉`, 'i'))) {
          level = '熟悉';
          required = true;
        } else if (text.match(new RegExp(`了解.*?${keyword}|${keyword}.*?了解`, 'i'))) {
          level = '了解';
          required = false;
        } else {
          // 默认判断：如果在前半部分出现，可能是必须的
          const position = text.toLowerCase().indexOf(keyword.toLowerCase());
          if (position < text.length / 2) {
            level = '熟悉';
            required = true;
          }
        }

        skills.push({
          name: keyword,
          level,
          required,
          category,
        });
      }
    }
  }

  return skills;
}

/**
 * 提取职责和要求
 */
function extractResponsibilitiesAndRequirements(description: string): {
  responsibilities: string[];
  requirements: string[];
} {
  const responsibilities: string[] = [];
  const requirements: string[] = [];

  // 按行分割
  const lines = description.split(/\n|；|;/).map(line => line.trim()).filter(line => line.length > 0);

  for (const line of lines) {
    // 职责关键词
    if (line.match(/职责|负责|工作内容|岗位职责/i)) {
      responsibilities.push(line);
    }
    // 要求关键词
    else if (line.match(/要求|任职要求|岗位要求|必须|需要/i)) {
      requirements.push(line);
    }
    // 包含数字编号的可能是职责或要求
    else if (line.match(/^\d+[、.．]/)) {
      if (responsibilities.length < 3) {
        responsibilities.push(line);
      } else {
        requirements.push(line);
      }
    }
  }

  return {
    responsibilities: responsibilities.slice(0, 5),
    requirements: requirements.slice(0, 5),
  };
}

/**
 * 提取关键词
 */
function extractKeywords(description: string, jobName: string, jobLabels: string[]): string[] {
  const keywords = new Set<string>();

  // 添加岗位名称
  keywords.add(jobName);

  // 添加标签
  jobLabels.forEach(label => keywords.add(label));

  // 常见关键词
  const commonKeywords = [
    '后端', '前端', '全栈', '移动端', '算法', '数据', '运维', '测试', '产品', '设计',
    '架构', '微服务', '分布式', '高并发', '大数据', '人工智能', '机器学习', '深度学习',
    'API', 'RESTful', 'GraphQL', '云计算', 'DevOps', 'CI/CD',
  ];

  for (const keyword of commonKeywords) {
    if (description.includes(keyword)) {
      keywords.add(keyword);
    }
  }

  return Array.from(keywords).slice(0, 10);
}
