import { Logger } from './logger';

export interface ParsedResume {
  // 基本信息
  name?: string;
  email?: string;
  phone?: string;
  location?: string;

  // 工作经验
  experience: string; // 如 "5年"
  currentPosition?: string;
  currentCompany?: string;

  // 教育背景
  education: string; // 如 "本科"
  major?: string;
  school?: string;

  // 技能标签
  skills: string[];

  // 项目经验
  projects: string[];

  // 个人优势
  strengths: string[];

  // 求职偏好
  preferences: string;

  // 期望
  expectedSalary?: string;
  expectedLocation?: string;
  expectedPosition?: string;
}

/**
 * 验证 PDF 文件
 */
export function validatePDFFile(file: File): void {
  // 检查文件类型
  if (file.type !== 'application/pdf') {
    throw new Error('请上传 PDF 格式的简历文件');
  }

  // 检查文件大小（限制 32MB，Claude API 限制）
  const maxSize = 32 * 1024 * 1024; // 32MB
  if (file.size > maxSize) {
    throw new Error(`文件大小超过限制（最大 32MB），当前文件: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }

  // 检查文件大小（建议 5MB 以下以获得更好的性能）
  const recommendedSize = 5 * 1024 * 1024; // 5MB
  if (file.size > recommendedSize) {
    Logger.warn('文件较大，解析可能需要较长时间', {
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    });
  }

  Logger.info('PDF 文件验证通过', {
    name: file.name,
    size: `${(file.size / 1024).toFixed(2)}KB`,
    type: file.type
  });
}

/**
 * 使用 Claude AI 直接解析 PDF 简历
 * @param pdfFile PDF 文件对象
 * @param modelStore 模型存储
 * @returns 解析后的简历数据
 */
export async function parseResumeWithAI(
  pdfFile: File,
  modelStore: any
): Promise<ParsedResume> {
  try {
    // 验证 PDF 文件
    validatePDFFile(pdfFile);

    // 检查是否配置了 Claude 模型
    if (!modelStore.modelData || modelStore.modelData.length === 0) {
      throw new Error('未配置 AI 模型，无法解析简历');
    }

    const model = modelStore.modelData[0];

    // 检查是否为 Claude 模型
    if (model.mode !== 'claude') {
      throw new Error('简历解析功能目前仅支持 Claude 模型');
    }

    Logger.info('开始使用 Claude 解析 PDF 简历', {
      fileName: pdfFile.name,
      fileSize: `${(pdfFile.size / 1024).toFixed(2)}KB`,
      model: model.model
    });

    // 构建解析提示词
    const prompt = buildResumeParsePrompt();

    // 获取 Claude 模型实例
    const llm = modelStore.getModel(model, '');

    // 直接传输 PDF 文件给 Claude
    const response = await llm.parseDocument(pdfFile, prompt, true);

    Logger.info('Claude API 调用成功', {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      cacheRead: response.usage?.cache_read_input_tokens,
      cacheCreation: response.usage?.cache_creation_input_tokens
    });

    // 解析 AI 响应
    const parsed = parseAIResumeResponse(response.content || '');

    Logger.info('简历解析成功', {
      name: parsed.name,
      skills: parsed.skills.length,
      projects: parsed.projects.length
    });

    return parsed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    Logger.error('AI 简历解析失败', { error: errorMessage });
    throw error;
  }
}

/**
 * 构建简历解析提示词
 */
function buildResumeParsePrompt(): string {
  return `你是一位专业的简历分析专家。我已经上传了一份 PDF 格式的简历，请仔细阅读并提取关键信息。

# 提取任务

请从简历中提取以下信息：

1. **基本信息**：姓名、邮箱、电话、所在城市
2. **工作经验**：总工作年限（如"3年"、"5-7年"）、当前职位、当前公司
3. **教育背景**：最高学历（本科/硕士/博士）、专业、学校
4. **技能标签**：提取 8-15 个核心技能关键词（编程语言、框架、工具、领域知识等）
5. **项目经验**：提取 3-5 个主要项目的简短描述（每个 20-30 字）
6. **个人优势**：总结 3-5 个核心竞争力（如"5年后端开发经验"、"熟悉微服务架构"）
7. **求职偏好**：根据简历内容推断求职偏好（期望行业、技术栈偏好、工作方式等，80-120字）

# 输出格式

请严格按照以下 JSON 格式返回（只返回 JSON，不要任何其他文字）：

\`\`\`json
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "138****1234",
  "location": "北京",
  "experience": "5年",
  "currentPosition": "高级后端工程师",
  "currentCompany": "某科技公司",
  "education": "本科",
  "major": "计算机科学与技术",
  "school": "某大学",
  "skills": ["Java", "Spring Boot", "MySQL", "Redis", "Kafka", "Docker", "K8s", "微服务"],
  "projects": [
    "电商平台后端系统：负责订单、支付模块，日均处理 10 万笔订单",
    "用户画像系统：基于 Flink 实时计算，支持千万级用户标签",
    "监控告警平台：整合 Prometheus + Grafana，覆盖 200+ 服务"
  ],
  "strengths": [
    "5 年 Java 后端开发经验",
    "熟悉高并发系统设计",
    "有大型电商项目经验",
    "熟练使用 K8s 容器化部署"
  ],
  "preferences": "偏好互联网/电商行业，技术栈倾向 Java + 微服务 + 云原生，可接受适度加班但希望技术氛围好，倾向一线城市机会。",
  "expectedSalary": "25-35K",
  "expectedLocation": "北京",
  "expectedPosition": "高级后端工程师/架构师"
}
\`\`\`

# 注意事项

- 如果某些信息在简历中未找到，对应字段设为 null
- skills 数组要提取最核心的技能关键词，不要太泛泛
- projects 要简洁有力，突出技术亮点和业务价值
- strengths 要具体可量化，不要空洞的形容词
- preferences 要根据简历内容合理推断，体现候选人的真实倾向
- 工作年限要规范化为 "X年" 或 "X-Y年" 格式
- 学历要规范化为 "专科"、"本科"、"硕士"、"博士" 之一
- 电话号码如果存在，请脱敏处理（如 138****1234）`;
}

/**
 * 解析 AI 简历响应
 */
function parseAIResumeResponse(response: string): ParsedResume {
  try {
    // 提取 JSON（支持 markdown 代码块格式）
    let jsonStr = response;

    // 尝试提取 markdown 代码块中的 JSON
    const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      // 尝试直接提取 JSON 对象
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    // 验证和规范化数据
    return {
      name: parsed.name || undefined,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      location: parsed.location || undefined,
      experience: parsed.experience || '3-5年',
      currentPosition: parsed.currentPosition || undefined,
      currentCompany: parsed.currentCompany || undefined,
      education: parsed.education || '本科',
      major: parsed.major || undefined,
      school: parsed.school || undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter(Boolean) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.filter(Boolean) : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter(Boolean) : [],
      preferences: parsed.preferences || '暂无偏好信息',
      expectedSalary: parsed.expectedSalary || undefined,
      expectedLocation: parsed.expectedLocation || undefined,
      expectedPosition: parsed.expectedPosition || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    Logger.error('解析 AI 简历响应失败', { error: errorMessage, response: response.slice(0, 500) });
    throw new Error('无法解析 AI 返回的简历数据，请检查响应格式');
  }
}

/**
 * 基础简历解析（不使用 AI，作为降级方案）
 */
export function basicResumeParser(text: string): ParsedResume {
  Logger.warn('使用基础解析器（降级方案），建议配置 Claude 模型以获得更好的解析效果');

  // 简单的关键词匹配
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/1[3-9]\d{9}/);

  // 提取常见技能关键词
  const commonSkills = [
    'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'C++', 'C#', 'PHP', 'Ruby', 'Rust',
    'Spring', 'Spring Boot', 'Django', 'Flask', 'React', 'Vue', 'Angular', 'Node.js', 'Express',
    'MySQL', 'PostgreSQL', 'Redis', 'MongoDB', 'Elasticsearch', 'Oracle',
    'Docker', 'Kubernetes', 'K8s', 'Linux', 'Nginx', 'Jenkins',
    'Git', 'CI/CD', 'AWS', 'Azure', 'GCP', 'Kafka', 'RabbitMQ',
    'TensorFlow', 'PyTorch', '机器学习', '深度学习', '数据分析',
  ];

  const foundSkills = commonSkills.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  );

  return {
    email: emailMatch?.[0],
    phone: phoneMatch?.[0] ? phoneMatch[0].replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : undefined,
    experience: '3-5年',
    education: '本科',
    skills: foundSkills.slice(0, 12),
    projects: ['项目经验待补充（建议使用 Claude 模型获得完整解析）'],
    strengths: ['技术能力待评估（建议使用 Claude 模型获得完整解析）'],
    preferences: '求职偏好待完善（建议使用 Claude 模型获得完整解析）',
  };
}
