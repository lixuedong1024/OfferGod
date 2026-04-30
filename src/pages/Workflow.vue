<script setup lang="ts">
import { ref, computed } from 'vue';

interface WorkflowNode {
  id: number;
  x: number;
  y: number;
  title: string;
  type: 'trigger' | 'filter' | 'action' | 'condition';
  status: 'active' | 'idle' | 'error';
  config?: any;
  description?: string;
}

interface WorkflowLink {
  from: number;
  to: number;
  condition?: string;
}

// 工作流节点
const nodes = ref<WorkflowNode[]>([
  {
    id: 1,
    x: 50,
    y: 100,
    title: '新岗位触发',
    type: 'trigger',
    status: 'active',
    description: '监听 Boss 直聘新岗位'
  },
  {
    id: 2,
    x: 300,
    y: 100,
    title: 'AI 岗位筛选',
    type: 'filter',
    status: 'active',
    description: '根据简历画像匹配岗位'
  },
  {
    id: 3,
    x: 550,
    y: 50,
    title: '自动投递',
    type: 'action',
    status: 'idle',
    description: '发送简历和打招呼'
  },
  {
    id: 4,
    x: 550,
    y: 180,
    title: '跳过岗位',
    type: 'action',
    status: 'idle',
    description: '不匹配则跳过'
  },
]);

// 工作流连接
const links = ref<WorkflowLink[]>([
  { from: 1, to: 2 },
  { from: 2, to: 3, condition: '匹配度 ≥ 70%' },
  { from: 2, to: 4, condition: '匹配度 < 70%' },
]);

// 选中的节点
const selectedNode = ref<WorkflowNode | null>(null);

// 工作流状态
const workflowStatus = ref<'idle' | 'running' | 'paused'>('idle');

// 执行统计
const stats = ref({
  totalJobs: 0,
  filtered: 0,
  applied: 0,
  skipped: 0,
});

// 可用的节点类型
const nodeTypes = [
  { type: 'trigger', label: '触发器', icon: '⚡', color: '#10b981' },
  { type: 'filter', label: '筛选器', icon: '🔍', color: '#3b82f6' },
  { type: 'condition', label: '条件判断', icon: '🔀', color: '#f59e0b' },
  { type: 'action', label: '执行动作', icon: '⚙️', color: '#8b5cf6' },
];

// 计算连接路径
const computedLinks = computed(() => {
  return links.value.map(link => {
    const fromNode = nodes.value.find(n => n.id === link.from);
    const toNode = nodes.value.find(n => n.id === link.to);

    if (!fromNode || !toNode) return null;

    const x1 = fromNode.x + 220;
    const y1 = fromNode.y + 50;
    const x2 = toNode.x;
    const y2 = toNode.y + 50;

    const midX = (x1 + x2) / 2;

    return {
      path: `M ${x1} ${y1} Q ${midX} ${y1}, ${midX} ${(y1 + y2) / 2} T ${x2} ${y2}`,
      condition: link.condition,
      active: fromNode.status === 'active' && toNode.status === 'active',
      labelX: midX,
      labelY: (y1 + y2) / 2,
    };
  }).filter(Boolean);
});

// 选择节点
const selectNode = (node: WorkflowNode) => {
  selectedNode.value = node;
};

// 添加节点
const addNode = (type: string) => {
  const newNode: WorkflowNode = {
    id: Date.now(),
    x: 100 + nodes.value.length * 50,
    y: 100 + nodes.value.length * 30,
    title: `新${nodeTypes.find(t => t.type === type)?.label || '节点'}`,
    type: type as any,
    status: 'idle',
    description: '点击配置节点',
  };
  nodes.value.push(newNode);
};

// 删除节点
const deleteNode = (nodeId: number) => {
  nodes.value = nodes.value.filter(n => n.id !== nodeId);
  links.value = links.value.filter(l => l.from !== nodeId && l.to !== nodeId);
  if (selectedNode.value?.id === nodeId) {
    selectedNode.value = null;
  }
};

// 启动/暂停工作流
const toggleWorkflow = () => {
  if (workflowStatus.value === 'running') {
    workflowStatus.value = 'paused';
  } else {
    workflowStatus.value = 'running';
    // 这里可以添加实际的工作流执行逻辑
  }
};

// 停止工作流
const stopWorkflow = () => {
  workflowStatus.value = 'idle';
};

// 重置统计
const resetStats = () => {
  stats.value = {
    totalJobs: 0,
    filtered: 0,
    applied: 0,
    skipped: 0,
  };
};

// 保存工作流
const saveWorkflow = () => {
  const workflow = {
    nodes: nodes.value,
    links: links.value,
    stats: stats.value,
  };

  localStorage.setItem('offergod_workflow', JSON.stringify(workflow));
  alert('工作流已保存');
};

// 加载工作流
const loadWorkflow = () => {
  const saved = localStorage.getItem('offergod_workflow');
  if (saved) {
    const workflow = JSON.parse(saved);
    nodes.value = workflow.nodes || nodes.value;
    links.value = workflow.links || links.value;
    stats.value = workflow.stats || stats.value;
  }
};

// 导入模板
const importTemplate = () => {
  // 默认模板
  nodes.value = [
    { id: 1, x: 50, y: 100, title: '新岗位触发', type: 'trigger', status: 'idle', description: '监听 Boss 直聘新岗位' },
    { id: 2, x: 300, y: 100, title: 'AI 岗位筛选', type: 'filter', status: 'idle', description: '根据简历画像匹配岗位' },
    { id: 3, x: 550, y: 50, title: '自动投递', type: 'action', status: 'idle', description: '发送简历和打招呼' },
    { id: 4, x: 550, y: 180, title: '跳过岗位', type: 'action', status: 'idle', description: '不匹配则跳过' },
  ];

  links.value = [
    { from: 1, to: 2 },
    { from: 2, to: 3, condition: '匹配度 ≥ 70%' },
    { from: 2, to: 4, condition: '匹配度 < 70%' },
  ];

  alert('已导入默认模板');
};

// 组件挂载时加载工作流
loadWorkflow();
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>工作流编排</h1>
        <div class="sub">可视化配置自动化投递流程</div>
      </div>
      <div class="actions">
        <button class="btn" @click="importTemplate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          导入模板
        </button>
        <button class="btn btn-primary" @click="saveWorkflow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          保存工作流
        </button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid" style="margin-bottom: 20px">
      <div class="stat-card">
        <div class="stat-label">工作流状态</div>
        <div class="stat-value" :style="{ color: workflowStatus === 'running' ? '#10b981' : '#64748b' }">
          {{ workflowStatus === 'running' ? '运行中' : workflowStatus === 'paused' ? '已暂停' : '空闲' }}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">处理岗位</div>
        <div class="stat-value">{{ stats.totalJobs }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已投递</div>
        <div class="stat-value" style="color: #10b981">{{ stats.applied }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已跳过</div>
        <div class="stat-value" style="color: #f59e0b">{{ stats.skipped }}</div>
      </div>
    </div>

    <div class="wf-wrap">
      <!-- 工具栏 -->
      <div class="wf-toolbar">
        <div class="toolbar-group">
          <button
            v-for="nodeType in nodeTypes"
            :key="nodeType.type"
            class="icon-btn"
            :title="`添加${nodeType.label}`"
            @click="addNode(nodeType.type)"
          >
            {{ nodeType.icon }}
          </button>
        </div>
        <div class="toolbar-group">
          <button
            class="icon-btn"
            :class="{ active: workflowStatus === 'running' }"
            :title="workflowStatus === 'running' ? '暂停' : '启动'"
            @click="toggleWorkflow"
          >
            {{ workflowStatus === 'running' ? '⏸' : '▶' }}
          </button>
          <button
            class="icon-btn"
            title="停止"
            :disabled="workflowStatus === 'idle'"
            @click="stopWorkflow"
          >
            ⏹
          </button>
          <button class="icon-btn" title="重置统计" @click="resetStats">⟲</button>
        </div>
      </div>

      <!-- 画布 -->
      <div class="wf-canvas-inner">
        <div class="wf-canvas">
          <svg class="wf-svg">
            <!-- 连接线 -->
            <g v-for="(link, idx) in computedLinks" :key="idx">
              <path
                class="wf-link"
                :class="{ live: link.active }"
                :d="link.path"
              />
              <!-- 条件标签 -->
              <text
                v-if="link.condition"
                :x="link.labelX"
                :y="link.labelY"
                class="wf-link-label"
                text-anchor="middle"
              >
                {{ link.condition }}
              </text>
            </g>
          </svg>

          <!-- 节点 -->
          <div
            v-for="node in nodes"
            :key="node.id"
            class="wf-node"
            :class="{
              active: node.status === 'active',
              selected: selectedNode?.id === node.id,
              error: node.status === 'error'
            }"
            :style="{ left: node.x + 'px', top: node.y + 'px' }"
            @click="selectNode(node)"
          >
            <div class="wf-port in"></div>
            <div class="wf-port out"></div>
            <div class="wf-node-h">
              <span class="ti">{{ node.title }}</span>
              <button class="node-delete" @click.stop="deleteNode(node.id)" title="删除节点">×</button>
            </div>
            <div class="wf-node-b">
              <div class="node-type">
                <span class="pill" :class="node.type">
                  {{ nodeTypes.find(t => t.type === node.type)?.label }}
                </span>
              </div>
              <div class="node-desc">{{ node.description }}</div>
              <div class="row">
                <span>状态</span>
                <span class="v" :class="node.status">
                  {{ node.status === 'active' ? '运行中' : node.status === 'error' ? '错误' : '空闲' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部信息栏 -->
      <div class="wf-mini">
        <span>节点: {{ nodes.value.length }}</span>
        <span>连接: {{ links.length }}</span>
        <span>缩放: 100%</span>
      </div>
    </div>

    <!-- 节点配置面板 -->
    <div v-if="selectedNode" class="config-panel">
      <div class="panel-header">
        <h3>节点配置</h3>
        <button class="icon-btn" @click="selectedNode = null">×</button>
      </div>
      <div class="panel-body">
        <div class="form-group">
          <label>节点名称</label>
          <input v-model="selectedNode.title" type="text" class="input" />
        </div>
        <div class="form-group">
          <label>节点类型</label>
          <select v-model="selectedNode.type" class="input">
            <option v-for="type in nodeTypes" :key="type.type" :value="type.type">
              {{ type.label }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="selectedNode.description" class="input" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>状态</label>
          <select v-model="selectedNode.status" class="input">
            <option value="idle">空闲</option>
            <option value="active">运行中</option>
            <option value="error">错误</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-h h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.page-h .sub {
  font-size: 14px;
  color: #64748b;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover {
  background: #2563eb;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #0f172a;
}

.wf-wrap {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.wf-toolbar {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn.active {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.wf-canvas-inner {
  position: relative;
  height: 500px;
  overflow: auto;
  background: #f8fafc;
}

.wf-canvas {
  position: relative;
  width: 1200px;
  height: 800px;
  background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
  background-size: 20px 20px;
}

.wf-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.wf-link {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 2;
  transition: stroke 0.3s;
}

.wf-link.live {
  stroke: #3b82f6;
  stroke-dasharray: 5, 5;
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

.wf-link-label {
  fill: #64748b;
  font-size: 12px;
}

.wf-node {
  position: absolute;
  width: 220px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.wf-node:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.wf-node.active {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.wf-node.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.wf-node.error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.wf-port {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  transition: all 0.2s;
}

.wf-port.in {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.wf-port.out {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
}

.wf-node:hover .wf-port {
  border-color: #3b82f6;
  background: #3b82f6;
}

.wf-node-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.wf-node-h .ti {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.node-delete {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: color 0.2s;
}

.node-delete:hover {
  color: #ef4444;
}

.wf-node-b {
  padding: 12px;
}

.node-type {
  margin-bottom: 8px;
}

.node-desc {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
  line-height: 1.4;
}

.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.pill.trigger {
  background: #d1fae5;
  color: #065f46;
}

.pill.filter {
  background: #dbeafe;
  color: #1e40af;
}

.pill.condition {
  background: #fef3c7;
  color: #92400e;
}

.pill.action {
  background: #ede9fe;
  color: #5b21b6;
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
  margin-top: 6px;
}

.row .v {
  font-weight: 500;
  color: #0f172a;
}

.row .v.active {
  color: #10b981;
}

.row .v.idle {
  color: #64748b;
}

.row .v.error {
  color: #ef4444;
}

.wf-mini {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 12px;
  color: #64748b;
}

.config-panel {
  position: fixed;
  right: 20px;
  top: 80px;
  width: 320px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-body {
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  margin-bottom: 6px;
}

.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
}

textarea.input {
  resize: vertical;
  font-family: inherit;
}
</style>
