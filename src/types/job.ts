/**
 * 岗位相关类型定义
 */

/**
 * 技能要求
 */
export interface SkillRequirement {
  name: string;           // 技能名称（如：Python、React、Docker）
  level: string;          // 要求等级（精通/熟悉/了解）
  required: boolean;      // 是否必须
  category: string;       // 分类（编程语言/框架/工具/软技能）
}

/**
 * 经验要求
 */
export interface ExperienceRequirement {
  min: number;            // 最低年限
  max: number;            // 最高年限（-1表示不限）
  required: boolean;      // 是否必须
  description?: string;   // 详细描述
}

/**
 * 学历要求
 */
export interface EducationRequirement {
  level: string;          // 学历等级（高中/大专/本科/硕士/博士）
  required: boolean;      // 是否必须
  major?: string;         // 专业要求
}

/**
 * 结构化的岗位要求（从JD解析得到）
 */
export interface JobRequirement {
  jobId: string;                          // 关联的岗位ID

  // 基础要求
  experience: ExperienceRequirement;      // 经验要求
  education: EducationRequirement;        // 学历要求

  // 技能要求
  skills: SkillRequirement[];             // 技能列表

  // 职责和要求
  responsibilities: string[];             // 岗位职责
  requirements: string[];                 // 任职要求
  bonusPoints: string[];                  // 加分项

  // 关键词
  keywords: string[];                     // 从JD提取的关键词

  // 元数据
  rawDescription: string;                 // 原始JD文本
  parsedAt: number;                       // 解析时间戳
  version: number;                        // 数据版本（用于兼容性）
}

/**
 * 匹配结果详情
 */
export interface MatchDetail {
  score: number;          // 分数 0-100
  matched: boolean;       // 是否匹配
  detail: string;         // 详细说明
}

/**
 * 技能匹配结果
 */
export interface SkillMatchResult {
  score: number;                    // 技能匹配分数 0-100
  matched: SkillRequirement[];      // 匹配的技能
  missing: SkillRequirement[];      // 缺失的技能
  bonus: SkillRequirement[];        // 加分项技能
  matchedNames: string[];           // 匹配的技能名称（用于显示）
  missingNames: string[];           // 缺失的技能名称（用于显示）
}

/**
 * 简历与JD的匹配结果
 */
export interface MatchResult {
  jobId: string;                    // 岗位ID

  // 总分
  totalScore: number;               // 总分 0-100

  // 各项匹配详情
  experienceMatch: MatchDetail;     // 经验匹配
  educationMatch: MatchDetail;      // 学历匹配
  skillsMatch: SkillMatchResult;    // 技能匹配

  // 匹配项和缺失项（用于UI显示）
  matchedItems: string[];           // 匹配的要求
  missingItems: string[];           // 缺失的要求

  // AI建议
  aiSuggestion: string;             // AI生成的投递建议
  shouldApply: boolean;             // 是否建议投递
  reason: string;                   // 建议理由

  // 元数据
  calculatedAt: number;             // 计算时间戳
  version: number;                  // 数据版本
}

/**
 * 简历数据（简化版，用于匹配）
 */
export interface ResumeData {
  // 基础信息
  name: string;
  workYears: number;                // 工作年限
  education: string;                // 学历
  major?: string;                   // 专业

  // 技能
  skills: string[];                 // 技能列表

  // 工作经历
  workExperience: {
    company: string;
    position: string;
    duration: string;
    description: string;
    achievements: string[];
  }[];

  // 项目经历
  projects: {
    name: string;
    role: string;
    description: string;
    technologies: string[];
  }[];

  // 关键词（从简历提取）
  keywords: string[];
}

/**
 * 岗位数据（从Boss直聘抓取）
 */
export interface JobData {
  // 基础信息
  encryptJobId: string;
  jobName: string;
  brandName: string;
  salaryDesc: string;
  cityName: string;
  areaDistrict?: string;
  businessDistrict?: string;

  // 要求
  experienceName: string;           // 如："3-5年"
  degreeName: string;               // 如："本科"

  // 标签和技能
  jobLabels: string[];
  skills?: string[];

  // Boss信息
  bossName: string;
  bossTitle: string;
  bossAvatar: string;
  bossId: string;
  encryptBossId: string;
  activeTimeDesc: string;

  // 公司信息
  brandIndustry: string;
  brandScaleName: string;
  welfareList: string[];

  // 详细信息
  postDescription: string;          // 岗位描述（JD）
  address?: string;
  longitude?: number;
  latitude?: number;

  // 本地状态
  status?: 'ready' | 'sent' | 'replied';
  addedAt?: number;

  // 匹配结果（缓存）
  matchResult?: MatchResult;
  requirement?: JobRequirement;
}
