import { ElMessage } from 'element-plus';
import { defineStore } from 'pinia';
import { computed, ref, toRaw } from 'vue';

import type { claudeLLMConf } from './claude';
import { claude } from './claude';
import type { openaiLLMConf } from './openai';
import { openai } from './openai';
import type { llm, prompt } from './type';

export const confModelKey = 'conf-model';

// 注册所有支持的 LLM
export const llms = [openai.info, claude.info];

export const llmIcon = llms.reduce(
  (acc, cur) => {
    if (cur.mode.icon != null) acc[cur.mode.mode] = cur.mode.icon;
    return acc;
  },
  {} as Record<string, string>
);

export interface modelData {
  key: string;
  name: string;
  color?: string;
  data?: openaiLLMConf | claudeLLMConf;
}

export const useModel = defineStore('model', () => {
  const _modelData = ref<modelData[]>([]);

  const modelData = computed({
    get() {
      return _modelData.value;
    },
    set(value: modelData[]) {
      _modelData.value = value;
    },
  });

  async function init() {
    // 从 storage 加载配置
    const data = await chrome.storage.local.get(confModelKey);
    const models = data[confModelKey] || [];
    console.log('加载 AI 模型配置:', models);
    modelData.value.push(...models);
  }

  function getModel(
    model: modelData | undefined,
    template: string | prompt
  ): llm {
    if (!model?.data) {
      throw new Error('模型配置不存在');
    }

    if (Array.isArray(template)) {
      template = JSON.parse(JSON.stringify(template));
    }

    try {
      const mode = model.data.mode;

      if (mode === 'openai') {
        return new openai.Gpt(model.data as openaiLLMConf, template);
      } else if (mode === 'claude') {
        return new claude.Gpt(model.data as claudeLLMConf, template);
      }

      throw new Error(`不支持的模型类型: ${mode}`);
    } catch (e: any) {
      throw new Error(`模型初始化失败: ${e.message}`);
    }
  }

  async function save() {
    await chrome.storage.local.set({
      [confModelKey]: toRaw(modelData.value),
    });
    ElMessage.success('保存成功');
  }

  return {
    initModel: init,
    modelData,
    saveModel: save,
    getModel,
    llmIcon,
  };
});
