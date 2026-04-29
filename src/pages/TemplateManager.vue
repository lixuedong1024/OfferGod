<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGreetingTemplate, type GreetingTemplate } from '@/stores/greetingTemplate';
import { ElMessage, ElMessageBox } from 'element-plus';

const templateStore = useGreetingTemplate();

const showDialog = ref(false);
const editingTemplate = ref<GreetingTemplate | null>(null);
const formData = ref({
  name: '',
  content: '',
  category: '通用',
});

const selectedCategory = ref('all');

// 过滤后的模板
const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return templateStore.templates.value;
  }
  return templateStore.getTemplatesByCategory(selectedCategory.value);
});

// 所有分类
const categories = computed(() => {
  return ['all', ...templateStore.getCategories()];
});

// 打开添加对话框
function openAddDialog() {
  editingTemplate.value = null;
  formData.value = {
    name: '',
    content: '',
    category: '通用',
  };
  showDialog.value = true;
}

// 打开编辑对话框
function openEditDialog(template: GreetingTemplate) {
  editingTemplate.value = template;
  formData.value = {
    name: template.name,
    content: template.content,
    category: template.category,
  };
  showDialog.value = true;
}

// 保存模板
async function saveTemplate() {
  if (!formData.value.name.trim()) {
    ElMessage.error('请输入模板名称');
    return;
  }

  if (!formData.value.content.trim()) {
    ElMessage.error('请输入模板内容');
    return;
  }

  try {
    const variables = templateStore.extractVariables(formData.value.content);

    if (editingTemplate.value) {
      // 更新
      await templateStore.updateTemplate(editingTemplate.value.id, {
        name: formData.value.name,
        content: formData.value.content,
        category: formData.value.category,
        variables,
      });
      ElMessage.success('模板更新成功');
    } else {
      // 添加
      await templateStore.addTemplate({
        name: formData.value.name,
        content: formData.value.content,
        category: formData.value.category,
        variables,
      });
      ElMessage.success('模板添加成功');
    }

    showDialog.value = false;
  } catch (error) {
    ElMessage.error('保存失败: ' + error);
  }
}

// 删除模板
async function deleteTemplate(template: GreetingTemplate) {
  try {
    await ElMessageBox.confirm(`确定要删除模板"${template.name}"吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await templateStore.deleteTemplate(template.id);
    ElMessage.success('模板删除成功');
  } catch (error) {
    // 用户取消
  }
}

// 复制模板内容
function copyTemplate(template: GreetingTemplate) {
  navigator.clipboard.writeText(template.content);
  ElMessage.success('模板内容已复制到剪贴板');
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
  <div>
    <div class="page-h">
      <div>
        <h1>打招呼语模板</h1>
        <div class="sub">管理和使用打招呼语模板 · 支持变量替换</div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" @click="openAddDialog">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          新建模板
        </button>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="tabs">
      <button
        v-for="cat in categories"
        :key="cat"
        :class="['tab', { active: selectedCategory === cat }]"
        @click="selectedCategory = cat"
      >
        {{ getCategoryText(cat) }}
        <span v-if="cat !== 'all'" class="count">
          ({{ templateStore.getTemplatesByCategory(cat).length }})
        </span>
        <span v-else class="count">({{ templateStore.templates.value.length }})</span>
      </button>
    </div>

    <!-- 模板列表 -->
    <div v-if="templateStore.loading.value" class="empty">加载中...</div>
    <div v-else-if="filteredTemplates.length === 0" class="empty">
      暂无模板，点击"新建模板"开始创建
    </div>
    <div v-else class="template-grid">
      <div v-for="template in filteredTemplates" :key="template.id" class="template-card">
        <div class="template-header">
          <div class="template-title">{{ template.name }}</div>
          <div class="template-actions">
            <button class="btn-icon" @click="copyTemplate(template)" title="复制">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn-icon" @click="openEditDialog(template)" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon" @click="deleteTemplate(template)" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="template-category">{{ template.category }}</div>
        <div class="template-content">{{ template.content }}</div>
        <div v-if="template.variables.length > 0" class="template-variables">
          <span class="variable-label">变量:</span>
          <span v-for="variable in template.variables" :key="variable" class="variable-tag">
            {{ variable }}
          </span>
        </div>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="showDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ editingTemplate ? '编辑模板' : '新建模板' }}</h3>
          <button class="btn-close" @click="showDialog = false">✕</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>模板名称</label>
            <input v-model="formData.name" type="text" placeholder="例如：通用问候" />
          </div>
          <div class="form-group">
            <label>分类</label>
            <input v-model="formData.category" type="text" placeholder="例如：通用、技术、产品" />
          </div>
          <div class="form-group">
            <label>模板内容</label>
            <textarea
              v-model="formData.content"
              rows="6"
              placeholder="输入模板内容，使用 {变量名} 表示变量，例如：您好，我对{company}的{jobTitle}岗位很感兴趣..."
            ></textarea>
            <div class="form-hint">
              支持的变量：{jobTitle}、{company}、{experience}、{skills}、{field} 等
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-ghost" @click="showDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveTemplate">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.template-card {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.template-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.template-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--fg-0);
}

.template-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  padding: 4px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--fg-2);
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-2);
  color: var(--fg-0);
}

.template-category {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(20, 184, 166, 0.1);
  color: var(--primary);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 12px;
}

.template-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg-1);
  margin-bottom: 12px;
  word-break: break-word;
}

.template-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.variable-label {
  font-size: 11px;
  color: var(--fg-2);
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

.count {
  font-size: 11px;
  color: var(--fg-2);
  margin-left: 4px;
}

.dialog-overlay {
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

.dialog {
  width: 600px;
  max-width: 90vw;
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h3 {
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

.dialog-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-1);
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-0);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--fg-0);
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.form-hint {
  margin-top: 6px;
  font-size: 11px;
  color: var(--fg-2);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}
</style>
