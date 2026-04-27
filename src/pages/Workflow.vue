<script setup lang="ts">
import { ref } from 'vue';

const nodes = [
  { id: 1, x: 50, y: 100, title: '触发器', type: 'trigger', status: 'active' },
  { id: 2, x: 300, y: 100, title: 'AI 筛选', type: 'filter', status: 'active' },
  { id: 3, x: 550, y: 80, title: '投递简历', type: 'action', status: 'idle' },
  { id: 4, x: 550, y: 180, title: '跳过', type: 'action', status: 'idle' },
];
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>工作流编排</h1>
        <div class="sub">可视化配置自动化流程</div>
      </div>
      <div class="actions">
        <button class="btn">导入模板</button>
        <button class="btn btn-primary">保存工作流</button>
      </div>
    </div>

    <div class="wf-wrap">
      <div class="wf-toolbar">
        <button class="icon-btn">+</button>
        <button class="icon-btn">⟲</button>
        <button class="icon-btn">▶</button>
      </div>

      <div class="wf-canvas-inner">
        <div class="wf-canvas">
          <svg class="wf-svg">
            <path
              class="wf-link live"
              d="M 270 115 Q 285 115, 300 115"
            />
            <path
              class="wf-link"
              d="M 520 115 Q 535 100, 550 95"
            />
            <path
              class="wf-link"
              d="M 520 115 Q 535 150, 550 185"
            />
          </svg>

          <div
            v-for="node in nodes"
            :key="node.id"
            class="wf-node"
            :class="{ active: node.status === 'active' }"
            :style="{ left: node.x + 'px', top: node.y + 'px' }"
          >
            <div class="wf-port in"></div>
            <div class="wf-port out"></div>
            <div class="wf-node-h">
              <span class="ti">{{ node.title }}</span>
              <span :class="['pill', node.status === 'active' ? 'accent' : '']">
                {{ node.type }}
              </span>
            </div>
            <div class="wf-node-b">
              <div class="row">
                <span>状态</span>
                <span class="v">{{ node.status === 'active' ? '运行中' : '空闲' }}</span>
              </div>
              <div class="row">
                <span>执行</span>
                <span class="v">{{ node.status === 'active' ? '16' : '0' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="wf-mini">
        <span>缩放: 100%</span>
        <span>节点: {{ nodes.length }}</span>
      </div>
    </div>
  </div>
</template>
