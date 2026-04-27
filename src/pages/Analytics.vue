<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStatisticsStore } from '../stores/statistics';

const stats = useStatisticsStore();
const selectedPeriod = ref<7 | 14 | 30>(14);

onMounted(() => {
  stats.loadFromStorage();
});

// 获取选定周期的数据
const periodData = computed(() => {
  return stats.getRecentDays(selectedPeriod.value);
});

// 计算周期内的统计
const periodStats = computed(() => {
  return periodData.value.reduce((acc, day) => ({
    sent: acc.sent + day.sent,
    replied: acc.replied + day.replied,
    interview: acc.interview + day.interview,
    scanned: acc.scanned + day.scanned,
  }), { sent: 0, replied: 0, interview: 0, scanned: 0 });
});

const periodReplyRate = computed(() => {
  const total = periodStats.value.sent;
  return total > 0 ? ((periodStats.value.replied / total) * 100).toFixed(1) : '0.0';
});

const periodInterviewRate = computed(() => {
  const total = periodStats.value.sent;
  return total > 0 ? ((periodStats.value.interview / total) * 100).toFixed(1) : '0.0';
});

// 图表数据
const maxSent = computed(() => {
  return Math.max(...periodData.value.map(d => d.sent), 1);
});

// 漏斗数据
const funnelData = computed(() => {
  const scanned = periodStats.value.scanned || 1;
  return [
    { label: '扫描岗位', value: periodStats.value.scanned, percent: 100 },
    { label: '通过筛选', value: periodStats.value.sent + periodStats.value.replied, percent: ((periodStats.value.sent + periodStats.value.replied) / scanned * 100).toFixed(1) },
    { label: '已投递', value: periodStats.value.sent, percent: (periodStats.value.sent / scanned * 100).toFixed(1) },
    { label: '收到回复', value: periodStats.value.replied, percent: (periodStats.value.replied / scanned * 100).toFixed(1) },
    { label: '约面试', value: periodStats.value.interview, percent: (periodStats.value.interview / scanned * 100).toFixed(1) },
  ];
});

// Top行业数据
const topIndustries = computed(() => {
  return [...stats.industryStats]
    .sort((a, b) => b.replyRate - a.replyRate)
    .slice(0, 5);
});

// 时段数据（9-20点）
const timeSlotData = computed(() => {
  const slots = [];
  for (let hour = 9; hour <= 20; hour++) {
    const slot = stats.timeSlotStats.find(t => t.hour === hour);
    slots.push({
      hour,
      replyRate: slot?.replyRate || 0,
    });
  }
  return slots;
});

const maxTimeSlotRate = computed(() => {
  return Math.max(...timeSlotData.value.map(t => t.replyRate), 1);
});

function exportData() {
  const data = {
    dailyStats: stats.dailyStats,
    totalStats: stats.totalStats,
    industryStats: stats.industryStats,
    timeSlotStats: stats.timeSlotStats,
    exportTime: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offergod-stats-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>数据看板</h1>
        <div class="sub">最近 {{ selectedPeriod }} 天 · 投递 / 回复 / 面试 漏斗</div>
      </div>
      <div class="actions">
        <div class="toggle">
          <button :class="{ on: selectedPeriod === 7 }" @click="selectedPeriod = 7">7 天</button>
          <button :class="{ on: selectedPeriod === 14 }" @click="selectedPeriod = 14">14 天</button>
          <button :class="{ on: selectedPeriod === 30 }" @click="selectedPeriod = 30">30 天</button>
        </div>
        <button class="btn" @click="exportData">
          <span style="margin-right: 4px">📊</span>导出
        </button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">累计投递</div>
        <div class="kpi-value">{{ stats.totalStats.sent }}</div>
        <div class="kpi-delta">+{{ periodStats.sent }} 本周期</div>
        <div class="kpi-spark">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <polyline
              :points="periodData.map((d, i) => `${(i / (periodData.length - 1)) * 100},${20 - (d.sent / maxSent) * 18}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>

      <div class="kpi">
        <div class="kpi-label">收到回复</div>
        <div class="kpi-value">{{ stats.totalStats.replied }}</div>
        <div class="kpi-delta">回复率 {{ periodReplyRate }}%</div>
        <div class="kpi-spark">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <polyline
              :points="periodData.map((d, i) => `${(i / (periodData.length - 1)) * 100},${20 - (d.replied / Math.max(...periodData.map(x => x.replied), 1)) * 18}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>

      <div class="kpi">
        <div class="kpi-label">约面试</div>
        <div class="kpi-value">{{ stats.totalStats.interview }}</div>
        <div class="kpi-delta">约面率 {{ periodInterviewRate }}%</div>
        <div class="kpi-spark">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <polyline
              :points="periodData.map((d, i) => `${(i / (periodData.length - 1)) * 100},${20 - (d.interview / Math.max(...periodData.map(x => x.interview), 1)) * 18}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>

      <div class="kpi">
        <div class="kpi-label">平均响应</div>
        <div class="kpi-value">2.4h</div>
        <div class="kpi-delta">-12% vs 上周</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px">
      <div class="card">
        <div class="card-h">
          <h3>📈 每日投递量</h3>
          <span class="meta">投递 · 回复 · 面试</span>
        </div>
        <div class="card-body">
          <div class="bars" style="height: 160px">
            <div
              v-for="(day, i) in periodData"
              :key="i"
              class="bar"
              :style="{ height: `${(day.sent / maxSent) * 100}%` }"
              :data-value="day.sent"
            >
              <div
                class="fill"
                :style="{
                  height: day.sent > 0 ? `${(day.replied / day.sent) * 100}%` : '0%',
                  background: 'var(--accent)'
                }"
              ></div>
            </div>
          </div>
          <div class="bars-x">
            <span v-for="day in periodData" :key="day.date">
              {{ day.date.split('-')[2] }}
            </span>
          </div>
          <div class="row-flex" style="gap: 18px; margin-top: 14px; font-size: 11.5px">
            <span class="row-flex">
              <span style="width: 10px; height: 10px; background: var(--accent-dim); border-radius: 2px"></span>
              已投递
            </span>
            <span class="row-flex">
              <span style="width: 10px; height: 10px; background: var(--accent); border-radius: 2px"></span>
              已回复
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h">
          <h3>转化漏斗</h3>
          <span class="meta">本周期</span>
        </div>
        <div class="card-body">
          <div class="funnel">
            <div v-for="(item, i) in funnelData" :key="i" class="funnel-row">
              <span class="lab">{{ item.label }}</span>
              <div class="bar">
                <div class="fill" :style="{ width: `${item.percent}%` }"></div>
              </div>
              <span class="v">{{ item.value }}</span>
              <span class="pct">{{ item.percent }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style="height: 14px"></div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
      <div class="card">
        <div class="card-h">
          <h3>回复率 · Top 公司类型</h3>
          <span class="meta">按行业</span>
        </div>
        <div class="card-body">
          <div class="funnel">
            <div v-for="item in topIndustries" :key="item.industry" class="funnel-row">
              <span class="lab">{{ item.industry }}</span>
              <div class="bar">
                <div class="fill" :style="{ width: `${item.replyRate}%` }"></div>
              </div>
              <span class="v">{{ item.replyRate }}%</span>
              <span class="pct">回复</span>
            </div>
            <div v-if="topIndustries.length === 0" style="padding: 20px; text-align: center; color: var(--fg-2); font-size: 12px">
              暂无数据
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-h">
          <h3>最佳投递时段</h3>
          <span class="meta">基于已回复数据</span>
        </div>
        <div class="card-body">
          <div class="bars" style="height: 130px">
            <div
              v-for="slot in timeSlotData"
              :key="slot.hour"
              class="bar"
              :style="{ height: `${(slot.replyRate / maxTimeSlotRate) * 100}%` }"
            >
              <div class="fill" style="height: 100%"></div>
            </div>
          </div>
          <div class="bars-x">
            <span v-for="slot in timeSlotData" :key="slot.hour">{{ slot.hour }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-h {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-h h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.page-h .sub {
  font-size: 13px;
  color: var(--fg-2);
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.toggle button {
  padding: 6px 14px;
  font-size: 12px;
  border: none;
  background: transparent;
  color: var(--fg-2);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle button:not(:last-child) {
  border-right: 1px solid var(--line);
}

.toggle button.on {
  background: var(--accent);
  color: white;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.kpi {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px;
}

.kpi-label {
  font-size: 12px;
  color: var(--fg-2);
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 4px;
}

.kpi-delta {
  font-size: 11px;
  color: var(--accent);
  margin-bottom: 12px;
}

.kpi-spark {
  height: 20px;
  color: var(--accent-dim);
}

.card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.card-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.card-h h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.card-h .meta {
  font-size: 11px;
  color: var(--fg-2);
}

.card-body {
  padding: 16px;
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  margin-bottom: 8px;
}

.bar {
  flex: 1;
  background: var(--accent-dim);
  border-radius: 3px 3px 0 0;
  position: relative;
  min-height: 2px;
  transition: opacity 0.2s;
}

.bar:hover {
  opacity: 0.8;
}

.bar .fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  border-radius: 3px 3px 0 0;
}

.bars-x {
  display: flex;
  justify-content: space-around;
  font-size: 10px;
  color: var(--fg-3);
}

.row-flex {
  display: flex;
  align-items: center;
  gap: 6px;
}

.funnel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.funnel-row {
  display: grid;
  grid-template-columns: 80px 1fr 40px 50px;
  gap: 10px;
  align-items: center;
  font-size: 12px;
}

.funnel-row .lab {
  color: var(--fg-1);
}

.funnel-row .bar {
  height: 20px;
  background: var(--bg-2);
  border-radius: 4px;
  overflow: hidden;
}

.funnel-row .bar .fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.3s;
}

.funnel-row .v {
  text-align: right;
  font-weight: 600;
}

.funnel-row .pct {
  color: var(--fg-2);
  font-size: 11px;
}
</style>
