import { ref } from 'vue';
import { Logger } from '@/utils/logger';

export interface GreetingTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'greeting_templates';

const templates = ref<GreetingTemplate[]>([]);
const loading = ref(false);

// 默认模板
const DEFAULT_TEMPLATES: Omit<GreetingTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '通用问候',
    content: '您好，我对贵公司的{jobTitle}岗位很感兴趣，我有{experience}年相关工作经验，期待能有机会详细沟通。',
    category: '通用',
    variables: ['jobTitle', 'experience'],
  },
  {
    name: '技术岗位',
    content: '您好，我是一名{jobTitle}，有{experience}年开发经验，熟悉{skills}等技术栈。看到贵公司在{company}的招聘信息，非常感兴趣，希望能进一步了解岗位详情。',
    category: '技术',
    variables: ['jobTitle', 'experience', 'skills', 'company'],
  },
  {
    name: '产品岗位',
    content: '您好，我是一名产品经理，有{experience}年产品设计和管理经验。对{company}的{jobTitle}岗位很感兴趣，希望能有机会详细交流。',
    category: '产品',
    variables: ['experience', 'company', 'jobTitle'],
  },
  {
    name: '运营岗位',
    content: '您好，我在{field}领域有{experience}年运营经验，看到{company}的{jobTitle}岗位，觉得很匹配我的背景，期待能进一步沟通。',
    category: '运营',
    variables: ['field', 'experience', 'company', 'jobTitle'],
  },
  {
    name: '简短问候',
    content: '您好，对{jobTitle}岗位很感兴趣，方便详细了解一下吗？',
    category: '通用',
    variables: ['jobTitle'],
  },
];

export function useGreetingTemplate() {
  // 加载模板
  async function loadTemplates() {
    loading.value = true;
    try {
      const data = await chrome.storage.local.get(STORAGE_KEY);

      if (data[STORAGE_KEY] && Array.isArray(data[STORAGE_KEY])) {
        templates.value = data[STORAGE_KEY];
      } else {
        // 初始化默认模板
        templates.value = DEFAULT_TEMPLATES.map(tpl => ({
          ...tpl,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));
        await saveTemplates();
      }

      Logger.info('模板加载成功', { count: templates.value.length });
    } catch (error) {
      Logger.error('加载模板失败', error);
      templates.value = [];
    } finally {
      loading.value = false;
    }
  }

  // 保存模板
  async function saveTemplates() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: templates.value });
      Logger.info('模板保存成功');
    } catch (error) {
      Logger.error('保存模板失败', error);
      throw error;
    }
  }

  // 添加模板
  async function addTemplate(template: Omit<GreetingTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = Date.now();
    const newTemplate: GreetingTemplate = {
      ...template,
      id: `template_${now}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    templates.value.push(newTemplate);
    await saveTemplates();

    Logger.info('添加模板成功', { id: newTemplate.id });
    return newTemplate;
  }

  // 更新模板
  async function updateTemplate(id: string, updates: Partial<GreetingTemplate>) {
    const index = templates.value.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('模板不存在');
    }

    templates.value[index] = {
      ...templates.value[index],
      ...updates,
      updatedAt: Date.now(),
    };

    await saveTemplates();
    Logger.info('更新模板成功', { id });
  }

  // 删除模板
  async function deleteTemplate(id: string) {
    const index = templates.value.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('模板不存在');
    }

    templates.value.splice(index, 1);
    await saveTemplates();

    Logger.info('删除模板成功', { id });
  }

  // 获取单个模板
  function getTemplate(id: string): GreetingTemplate | undefined {
    return templates.value.find(t => t.id === id);
  }

  // 按分类获取模板
  function getTemplatesByCategory(category: string): GreetingTemplate[] {
    return templates.value.filter(t => t.category === category);
  }

  // 获取所有分类
  function getCategories(): string[] {
    const categories = new Set(templates.value.map(t => t.category));
    return Array.from(categories).sort();
  }

  // 应用模板（替换变量）
  function applyTemplate(template: GreetingTemplate, variables: Record<string, string>): string {
    let content = template.content;

    // 替换所有变量
    template.variables.forEach(variable => {
      const value = variables[variable] || `{${variable}}`;
      const regex = new RegExp(`\\{${variable}\\}`, 'g');
      content = content.replace(regex, value);
    });

    return content;
  }

  // 提取模板中的变量
  function extractVariables(content: string): string[] {
    const regex = /\{(\w+)\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  return {
    templates,
    loading,
    loadTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    getTemplatesByCategory,
    getCategories,
    applyTemplate,
    extractVariables,
  };
}
