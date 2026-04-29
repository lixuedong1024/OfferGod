<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStatisticsStore } from '../stores/statistics';
import { syncConversations, fullSync } from '../composables/useChatSync';
import { ElMessage } from 'element-plus';

const stats = useStatisticsStore();
const isSyncing = ref(false);

// 计算最近7天的趋势数据
const recentDays = computed(() => stats.getRecentDays(7));

// 安全访问 activities，确保始终返回数组
const recentActivities = computed(() => {
  return Array.isArray(stats.activities) ? stats.activities.slice(0, 10) : [];
});

// 初始化欢迎信息
function initWelcomeActivities() {
  if (stats.activities.length === 0) {
    stats.addActivity({ kind: 'ok', msg: 'OfferGod 已启动，准备就绪！' });
    stats.addActivity({ kind: 'log', msg: '请先在设置中配置 AI 模型' });
    stats.addActivity({ kind: 'log', msg: '然后开始使用自动化投递功能' });
  }
}

// 同步聊天列表
async function handleSyncChats() {
  if (isSyncing.value) return;

  isSyncing.value = true;
  try {
    ElMessage.info('开始同步聊天记录...');
    stats.addActivity({ kind: 'log', msg: '开始同步 Boss 直聘聊天记录...' });

    await syncConversations();

    ElMessage.success('聊天列表同步成功！');
    stats.addActivity({ kind: 'ok', msg: '聊天列表同步完成' });
  } catch (error: any) {
    console.error('同步失败:', error);
    ElMessage.error(`同步失败: ${error.message}`);
    stats.addActivity({ kind: 'error', msg: `同步失败: ${error.message}` });
  } finally {
    isSyncing.value = false;
  }
}

// 完整同步（包括历史消息）
async function handleFullSync() {
  if (isSyncing.value) return;

  isSyncing.value = true;
  try {
    ElMessage.info('开始完整同步，这可能需要一些时间...');
    stats.addActivity({ kind: 'log', msg: '开始完整同步聊天记录和历史消息...' });

    await fullSync(20); // 每个会话同步最近 20 条消息

    ElMessage.success('完整同步成功！');
    stats.addActivity({ kind: 'ok', msg: '完整同步完成' });
  } catch (error: any) {
    console.error('完整同步失败:', error);
    ElMessage.error(`完整同步失败: ${error.message}`);
    stats.addActivity({ kind: 'error', msg: `完整同步失败: ${error.message}` });
  } finally {
    isSyncing.value = false;
  }
}

onMounted(async () => {
  await stats.loadFromStorage();
  initWelcomeActivities();
});
</script>

<template>
  <div>
    <div class="page-h">
      <div>
        <h1>工作台</h1>
        <div class="sub">AI 自动化求职 · 今日已运行 6 小时 14 分</div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" @click="handleSyncChats" :disabled="isSyncing">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          {{ isSyncing ? '同步中...' : '同步聊天' }}
        </button>
        <button class="btn" @click="handleFullSync" :disabled="isSyncing">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          {{ isSyncing ? '同步中...' : '完整同步' }}
        </button>
        <button class="btn btn-primary">查看工作流</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">今日投递</div>
        <div class="kpi-value">{{ stats.todayStats.sent }}</div>
        <div class="kpi-delta" v-if="stats.todayStats.sent > 0">+{{ stats.todayStats.sent }} 今日</div>
        <div class="kpi-delta" v-else style="color: var(--fg-3)">尚未开始</div>
        <div class="kpi-spark" v-if="recentDays.length > 0">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <polyline
              :points="recentDays.map((d, i) => `${(i / (recentDays.length - 1)) * 100},${20 - (d.sent / Math.max(...recentDays.map(x => x.sent), 1)) * 18}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">累计投递</div>
        <div class="kpi-value">{{ stats.totalStats.sent }}</div>
        <div class="kpi-delta" v-if="stats.totalStats.sent > 0">本周 +{{ stats.getRecentDays(7).reduce((sum, d) => sum + d.sent, 0) }}</div>
        <div class="kpi-delta" v-else style="color: var(--fg-3)">尚未开始</div>
        <div class="kpi-spark" v-if="recentDays.length > 0">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <polyline
              :points="recentDays.map((d, i) => `${(i / (recentDays.length - 1)) * 100},${20 - (d.sent / Math.max(...recentDays.map(x => x.sent), 1)) * 18}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">回复率</div>
        <div class="kpi-value">{{ stats.replyRate }}%</div>
        <div class="kpi-delta" v-if="stats.replyRate > 0">+{{ stats.replyRate }}%</div>
        <div class="kpi-delta" v-else style="color: var(--fg-3)">等待数据</div>
        <div class="kpi-spark" v-if="recentDays.length > 0">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <polyline
              :points="recentDays.map((d, i) => `${(i / (recentDays.length - 1)) * 100},${20 - (d.replied / Math.max(...recentDays.map(x => x.replied), 1)) * 18}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">面试率</div>
        <div class="kpi-value">{{ stats.interviewRate }}%</div>
        <div class="kpi-delta" v-if="stats.interviewRate > 0">+{{ stats.interviewRate }}%</div>
        <div class="kpi-delta" v-else style="color: var(--fg-3)">等待数据</div>
        <div class="kpi-spark" v-if="recentDays.length > 0">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none">
            <polyline
              :points="recentDays.map((d, i) => `${(i / (recentDays.length - 1)) * 100},${20 - (d.interview / Math.max(...recentDays.map(x => x.interview), 1)) * 18}`).join(' ')"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px">
      <div class="card">
        <div class="card-h">
          <h3>实时活动</h3>
          <div class="row-flex" style="gap: 12px">
            <span class="pill accent">
              <span class="dot"></span>
              LIVE
            </span>
            <span class="meta">最近 1 小时</span>
          </div>
        </div>
        <div class="card-body">
          <div class="log">
            <div
              v-for="(activity, i) in recentActivities"
              :key="i"
              :class="['log-row', activity.kind]"
            >
              <span class="log-time">{{ activity.time }}</span>
              <span class="ico">●</span>
              <span class="msg">{{ activity.msg }}</span>
            </div>
            <div v-if="recentActivities.length === 0" style="padding: 20px; text-align: center; color: var(--fg-2); font-size: 12px;">
              暂无活动记录
            </div>
          </div>
        </div>
      </div>

      <div class="col-flex" style="gap: 14px">
        <div class="card">
          <div class="card-h">
            <h3>风控状态</h3>
            <span class="pill accent">
              <span class="dot"></span>
              安全
            </span>
          </div>
          <div class="card-body">
            <div class="risk" style="margin-bottom: 12px">
              <div class="risk-meter">
                <div class="risk-meter-fill"></div>
                <div class="risk-meter-marker" style="left: 28%"></div>
              </div>
              <span class="mono" style="font-size: 11px; color: var(--accent)">低风险</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11.5px">
              <div>
                <div class="muted mono" style="font-size: 10px">今日操作</div>
                <div style="font-weight: 600; margin-top: 2px">{{ stats.todayStats.sent }} / 120</div>
              </div>
              <div>
                <div class="muted mono" style="font-size: 10px">平均间隔</div>
                <div style="font-weight: 600; margin-top: 2px">3 分 24 秒</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-h">
            <h3>AI 模型</h3>
            <span class="meta">Claude & GPT</span>
          </div>
          <div class="card-body">
            <div style="font-size: 12px; color: var(--fg-1)">
              <div style="margin-bottom: 8px">
                <span style="color: var(--accent)">✓</span> Claude 3.5 Sonnet
              </div>
              <div style="margin-bottom: 8px">
                <span style="color: var(--accent)">✓</span> GPT-4o
              </div>
              <div class="muted" style="font-size: 11px; margin-top: 12px">
                支持自定义 API 端点和多模型切换
              </div>
            </div>
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
}

.btn {
  padding: 8px 16px;
  font-size: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg-1);
  color: var(--fg-1);
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--bg-2);
}

.btn-ghost {
  background: transparent;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
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
}

.card-body {
  padding: 16px;
}

.log {
  max-height: 300px;
  overflow-y: auto;
}

.log-row {
  display: grid;
  grid-template-columns: 40px 16px 1fr;
  gap: 8px;
  padding: 8px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--line-soft);
}

.log-row:last-child {
  border-bottom: none;
}

.log-time {
  color: var(--fg-3);
  font-size: 11px;
}

.log-row.ok .ico {
  color: var(--accent);
}

.log-row.warn .ico {
  color: #f59e0b;
}

.log-row.error .ico {
  color: #ef4444;
}

.log-row.log .ico {
  color: var(--fg-3);
}

.msg {
  color: var(--fg-1);
}

.col-flex {
  display: flex;
  flex-direction: column;
}

.row-flex {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.pill.accent {
  background: var(--accent-dim);
  color: var(--accent);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.meta {
  font-size: 11px;
  color: var(--fg-2);
}

.muted {
  color: var(--fg-2);
}

.mono {
  font-family: 'SF Mono', 'Consolas', monospace;
}

.risk {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-meter {
  height: 8px;
  background: var(--bg-2);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.risk-meter-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 28%;
  background: linear-gradient(90deg, var(--accent), var(--accent-dim));
  border-radius: 4px;
}

.risk-meter-marker {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--accent);
  border-radius: 1px;
}
</style>
