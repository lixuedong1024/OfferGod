import Anthropic from '@anthropic-ai/sdk';
import type { llmConf, llmInfo, messageReps, prompt } from './type';
import { llm } from './type';

export type claudeLLMConf = llmConf<
  'claude',
  {
    api_key: string;
    model: string;
    base_url?: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
  }
>;

const info: llmInfo<claudeLLMConf> = {
  mode: {
    mode: 'claude',
    label: 'Claude (Anthropic)',
    desc: `支持 Claude 4.x 和 3.x 系列模型，包括 Opus 4.7、Sonnet 4.6、Haiku 4.5 等。<br/>
    官方 API: https://api.anthropic.com<br/>
    支持自定义 base_url 用于代理服务`,
    icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#CC9B7A"/><path d="M8 6L12 18M12 18L16 6M12 18H6M12 18H18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  api_key: {
    type: 'input',
    required: true,
    label: 'API Key',
    desc: '从 Anthropic Console 获取: https://console.anthropic.com/',
    config: {
      placeholder: 'sk-ant-...',
      type: 'password',
    },
  },
  model: {
    type: 'select',
    required: true,
    label: '模型',
    value: 'claude-opus-4-7',
    config: {
      placeholder: '选择 Claude 模型',
      options: [
        { label: 'Claude Opus 4.7 (最强推理)', value: 'claude-opus-4-7' },
        { label: 'Claude Sonnet 4.6 (平衡)', value: 'claude-sonnet-4-6' },
        { label: 'Claude Haiku 4.5 (快速)', value: 'claude-haiku-4-5' },
        { label: 'Claude 3.5 Sonnet (旧版)', value: 'claude-3-5-sonnet-20241022' },
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20240620' },
        { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
        { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
        { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
      ],
      allowCreate: true,
      filterable: true,
    },
  },
  base_url: {
    type: 'input',
    label: 'Base URL (可选)',
    desc: '自定义 API 端点，留空使用官方地址',
    config: {
      placeholder: 'https://api.anthropic.com',
    },
  },
  max_tokens: {
    type: 'inputNumber',
    label: '最大 Token 数',
    value: 8192,
    config: {
      min: 1024,
      max: 200000,
      step: 1024,
    },
    desc: 'Claude 4.x 系列支持最高 200K tokens',
  },
  temperature: {
    type: 'slider',
    label: '温度 (Temperature)',
    value: 0.7,
    config: {
      min: 0,
      max: 1,
      step: 0.05,
    },
    desc: '控制输出随机性，较高值更随机，较低值更确定',
  },
  top_p: {
    type: 'slider',
    label: 'Top P',
    value: 1,
    config: {
      min: 0,
      max: 1,
      step: 0.05,
    },
    desc: '核采样参数，建议只调整 temperature 或 top_p 之一',
  },
  top_k: {
    type: 'inputNumber',
    label: 'Top K',
    value: 40,
    config: {
      min: 1,
      max: 500,
      step: 1,
    },
    desc: '限制采样的 token 数量',
  },
};

class ClaudeGpt extends llm<claudeLLMConf> {
  private client: Anthropic;

  constructor(conf: claudeLLMConf, template: string | prompt) {
    super(conf, template);

    this.client = new Anthropic({
      apiKey: conf.api_key,
      baseURL: conf.base_url || 'https://api.anthropic.com',
      dangerouslyAllowBrowser: true, // 浏览器扩展环境需要
    });
  }

  async chat(message: string): Promise<string> {
    const messages = this.buildPrompt(message);

    const response = await this.client.messages.create({
      model: this.conf.model,
      max_tokens: this.conf.max_tokens || 4096,
      temperature: this.conf.temperature,
      top_p: this.conf.top_p,
      top_k: this.conf.top_k,
      messages: messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  async message({
    data = {},
    onPrompt = (_s: string) => {},
    json = false
  }): Promise<messageReps> {
    const prompts = this.buildPrompt(data);
    const prompt = prompts[prompts.length - 1].content;
    onPrompt(prompt);

    const ans: messageReps = { prompt };

    try {
      // 分离 system 消息
      const systemMessages = prompts.filter(p => p.role === 'system');
      const userMessages = prompts.filter(p => p.role !== 'system');

      const response = await this.client.messages.create({
        model: this.conf.model,
        max_tokens: this.conf.max_tokens || 4096,
        temperature: this.conf.temperature,
        top_p: this.conf.top_p,
        top_k: this.conf.top_k,
        system: systemMessages.length > 0
          ? systemMessages.map(s => s.content).join('\n\n')
          : undefined,
        messages: userMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      });

      const content = response.content[0];
      ans.content = content.type === 'text' ? content.text : '';

      ans.usage = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      // 如果需要 JSON 格式，尝试解析
      if (json && ans.content) {
        try {
          const jsonMatch = ans.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            ans.content = jsonMatch[0];
          }
        } catch (e) {
          console.warn('JSON 解析失败，返回原始内容', e);
        }
      }
    } catch (error: any) {
      throw new Error(`Claude API 调用失败: ${error.message}`);
    }

    return ans;
  }
}

export const claude = {
  Gpt: ClaudeGpt,
  info,
};
