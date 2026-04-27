<script setup lang="ts">
import { computed } from 'vue';
import { useConfig } from '@/composables/useConfig';
import { ElSlider } from 'element-plus';

const configStore = useConfig();
const aiScoreConfig = computed(() => configStore.config.aiScore);

const donutSize = 72;
const donutStroke = 6;
const radius = (donutSize - donutStroke) / 2;
const circumference = 2 * Math.PI * radius;
const progress = computed(() => (aiScoreConfig.value.threshold / 100) * circumference);
const dashOffset = computed(() => circumference - progress.value);
</script>

<template>
  <div class="card">
    <div class="card-h">
      <h3>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
        AI 评分阈值
      </h3>
    </div>
    <div class="card-body">
      <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px">
        <!-- Donut Chart -->
        <svg :width="donutSize" :height="donutSize" style="transform: rotate(-90deg)">
          <circle
            :cx="donutSize / 2"
            :cy="donutSize / 2"
            :r="radius"
            fill="none"
            stroke="var(--bg-3)"
            :stroke-width="donutStroke"
          />
          <circle
            :cx="donutSize / 2"
            :cy="donutSize / 2"
            :r="radius"
            fill="none"
            stroke="var(--accent)"
            :stroke-width="donutStroke"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
            stroke-linecap="round"
          />
          <text
            :x="donutSize / 2"
            :y="donutSize / 2"
            text-anchor="middle"
            dominant-baseline="middle"
            style="transform: rotate(90deg); transform-origin: center; font-size: 16px; font-weight: 600; fill: var(--accent)"
          >
            {{ aiScoreConfig.threshold }}
          </text>
        </svg>

        <div style="flex: 1; font-size: 12.5px">
          <div>
            匹配度
            <span class="mono" style="color: var(--accent); font-weight: 600">
              ≥ {{ aiScoreConfig.threshold }}
            </span>
            自动投递
          </div>
          <div class="muted" style="margin-top: 4px; line-height: 1.6">
            低于阈值的岗位不投递，但保留在「待确认」列表中等你手动复核。
          </div>
        </div>
      </div>

      <div>
        <label class="lbl" style="margin-bottom: 8px; display: block">调整阈值</label>
        <ElSlider
          v-model="aiScoreConfig.threshold"
          :min="0"
          :max="100"
          :step="5"
          :marks="{ 0: '0', 50: '50', 75: '75', 100: '100' }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--fg-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.muted {
  color: var(--fg-3);
  font-size: 11.5px;
}

.mono {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
}
</style>
