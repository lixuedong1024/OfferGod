<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGreetingTemplate, type GreetingTemplate } from '@/stores/greetingTemplate';

interface Props {
  variables?: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  select: [content: string];
}>();

const templateStore = useGreetingTemplate();

const showSelector = ref(false);
const selectedCategory = ref('all');
const searchKeyword = ref('');

// 过滤后的模板
const filteredTemplates = computed(() => {
  let result = templateStore.templates.value;

  // 按分类过滤
  if (selectedCategory.value !== 'all') {
    result = result.filter(t => t.category === selectedCategory.value);
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(t =>
      t.name.toLowerCase().includes(keyword) ||
      t.content.toLowerCase().includes(keyword)
    );
  }

  return result;
});

// 所有分类
const categories = computed(() => {
  return ['all', ...templateStore.getCategories()];
});

// 选择模板
function selectTemplate(template: GreetingTemplate) {
  let content = template.content;

  // 如果提供了变量，自动替换
  if (props.variables) {
    content = templateStore.applyTemplate(template, props.variables);
  }

  emit('select', content);
  showSelector.value = false;
}

// 获取分类文本
function getCategoryText(category: string): string {
  return category === 'all' ? '全部' : category;
}

onMounted(() => {
  templateStore.loadTemplates();
});
</script>

<template>
  <div class="template-selector">
    <button class="btn btn-sm" @click="showSelector = !showSelector">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      选择模板
    </button>

    <!-- 模板选择器弹窗 -->
    <div v-if="showSelector" class="selector-overlay" @click.self="showSelector = false">
      <div class="selector-panel">
        <div class="selector-header">
          <h3>选择打招呼语模板</h3>
          <button class="btn-close" @click="showSelector = false">✕</button>
        </div>

        <!-- 搜索和筛选 -->
        <div class="selector-filters">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索模板..."
            class="search-input"
          />
          <div class="category-tabs">
            <button
              v-for="cat in categories"
              :key="cat"
              :class="['category-tab', { active: selectedCategory === cat }]"
              @click="selectedCategory = cat"
            >
              {{ getCategoryText(cat) }}
            </button>
          </div>
        </div>

        <!-- 模板列表 -->
        <div class="selector-body">
          <div v-if="templateStore.loading.value" class="empty">加载中...</div>
          <div v-else-if="filteredTemplates.length === 0" class="empty">
            未找到匹配的模板
          </div>
          <div v-else class="template-list">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-item"
              @click="selectTemplate(template)"
            >
              <div class="template-item-header">
                <span class="template-item-name">{{ template.name }}</span>
                <span class="template-item-category">{{ template.category }}</span>
              </div>
              <div class="template-item-content">{{ template.content }}</div>
              <div v-if="template.variables.length > 0" class="template-item-variables">
                <span v-for="variable in template.variables" :key="variable" class="variable-tag">
                  {{ variable }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-selector {
  position: relative;
}

.selector-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.selector-panel {
  width: 700px;
  max-width: 90vw;
  max-height: 80vh;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.selector-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--fg-0);
}

.btn-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--fg-2);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-2);
  color: var(--fg-0);
}

.selector-filters {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--fg-0);
  margin-bottom: 12px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-tab {
  padding: 6px 12px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--fg-1);
  cursor: pointer;
  transition: all 0.2s;
}

.category-tab:hover {
  background: var(--bg-3);
}

.category-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.selector-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-item {
  padding: 14px;
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.template-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.template-item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg-0);
}

.template-item-category {
  padding: 2px 8px;
  background: rgba(20, 184, 166, 0.1);
  color: var(--primary);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.template-item-content {
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg-1);
  margin-bottom: 8px;
}

.template-item-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.variable-tag {
  padding: 2px 6px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  color: var(--fg-1);
}

.empty {
  text-align: center;
  padding: 40px;
  color: var(--fg-2);
  font-size: 13px;
}
</style>
