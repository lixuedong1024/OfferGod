/**
 * 统计功能集成示例
 * 展示如何在投递流程中使用统计功能
 */

import { useStatisticsStore } from '@/stores/statistics';
import {
  recordJobScanned,
  recordJobSent,
  recordJobReplied,
  recordJobInterview,
  recordJobSkipped,
  recordAIGreeting,
  recordJobEvaluation,
  recordJobSearch,
  recordError,
  recordLog,
} from '@/utils/statsHelper';

/**
 * 示例1: 完整的投递流程
 */
async function deliverJobExample() {
  try {
    // 1. 搜索岗位
    const jobs = await searchJobs('机器人运维工程师');
    recordJobSearch(jobs.length, '机器人运维工程师');

    for (const job of jobs) {
      // 2. 扫描岗位
      recordJobScanned();

      // 3. 评估岗位
      recordJobEvaluation(job.title, job.companyName);

      // 4. 检查是否符合条件
      const score = await evaluateJob(job);

      if (score < 60) {
        // 不符合条件，跳过
        recordJobSkipped();
        continue;
      }

      // 5. AI生成打招呼语
      const greeting = await generateGreeting(job);
      recordAIGreeting(score);

      // 6. 投递
      await sendApplication(job, greeting);
      recordJobSent(job.title, job.companyName, job.industry);

      // 等待一段时间
      await delay(3000);
    }
  } catch (error) {
    recordError(`投递失败: ${error.message}`);
  }
}

/**
 * 示例2: 监听回复
 */
async function monitorRepliesExample() {
  // 监听新消息
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'NEW_REPLY') {
      const { jobTitle, companyName, industry } = message.data;
      recordJobReplied(jobTitle, companyName, industry);
    }

    if (message.type === 'INTERVIEW_SCHEDULED') {
      const { jobTitle, companyName } = message.data;
      recordJobInterview(jobTitle, companyName);
    }
  });
}

/**
 * 示例3: 在content script中使用
 */
async function contentScriptExample() {
  const stats = useStatisticsStore();
  await stats.loadFromStorage();

  // 监听页面上的岗位卡片
  const jobCards = document.querySelectorAll('.job-card');

  jobCards.forEach((card) => {
    // 记录扫描
    recordJobScanned();

    // 获取岗位信息
    const title = card.querySelector('.job-title')?.textContent || '';
    const company = card.querySelector('.company-name')?.textContent || '';

    // 点击投递按钮时
    const applyBtn = card.querySelector('.apply-btn');
    applyBtn?.addEventListener('click', () => {
      recordJobSent(title, company);
    });
  });
}

/**
 * 示例4: 在background script中使用
 */
async function backgroundScriptExample() {
  const stats = useStatisticsStore();
  await stats.loadFromStorage();

  // 定时检查今日投递数
  setInterval(async () => {
    const todayStats = stats.todayStats;

    if (todayStats.sent >= 120) {
      recordLog('今日投递已达上限，暂停投递');
      // 暂停投递引擎
      await pauseEngine();
    }
  }, 60000); // 每分钟检查一次
}

/**
 * 示例5: 导出统计报告
 */
async function exportReportExample() {
  const stats = useStatisticsStore();
  await stats.loadFromStorage();

  const report = {
    summary: {
      totalSent: stats.totalStats.sent,
      totalReplied: stats.totalStats.replied,
      totalInterview: stats.totalStats.interview,
      replyRate: stats.replyRate,
      interviewRate: stats.interviewRate,
    },
    daily: stats.getRecentDays(30),
    topIndustries: stats.industryStats
      .sort((a, b) => b.replyRate - a.replyRate)
      .slice(0, 10),
    bestTimeSlots: stats.timeSlotStats
      .sort((a, b) => b.replyRate - a.replyRate)
      .slice(0, 5),
    recentActivities: stats.activities.slice(0, 50),
  };

  // 下载报告
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offergod-report-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 示例6: 智能投递策略
 */
async function smartDeliveryExample() {
  const stats = useStatisticsStore();
  await stats.loadFromStorage();

  // 分析最佳投递时段
  const bestHours = stats.timeSlotStats
    .filter(t => t.count >= 5) // 至少有5次投递
    .sort((a, b) => b.replyRate - a.replyRate)
    .slice(0, 3)
    .map(t => t.hour);

  const currentHour = new Date().getHours();

  if (bestHours.includes(currentHour)) {
    recordLog(`当前时段(${currentHour}点)是最佳投递时段，加速投递`);
    // 缩短投递间隔
    return 2000; // 2秒
  } else {
    recordLog(`当前时段(${currentHour}点)非最佳投递时段，保持正常节奏`);
    return 5000; // 5秒
  }
}

/**
 * 示例7: 行业分析
 */
async function industryAnalysisExample() {
  const stats = useStatisticsStore();
  await stats.loadFromStorage();

  // 找出回复率最高的行业
  const topIndustries = stats.industryStats
    .filter(i => i.count >= 3) // 至少投递3次
    .sort((a, b) => b.replyRate - a.replyRate)
    .slice(0, 5);

  console.log('回复率最高的行业:');
  topIndustries.forEach((industry, index) => {
    console.log(`${index + 1}. ${industry.industry}: ${industry.replyRate}% (${industry.count}次投递)`);
  });

  // 建议优先投递这些行业
  return topIndustries.map(i => i.industry);
}

/**
 * 示例8: 实时监控
 */
function realtimeMonitorExample() {
  const stats = useStatisticsStore();

  // 监听统计数据变化
  watch(() => stats.todayStats.sent, (newValue, oldValue) => {
    if (newValue > oldValue) {
      console.log(`今日投递: ${newValue}`);

      // 每投递10次提醒一次
      if (newValue % 10 === 0) {
        recordLog(`已投递 ${newValue} 份，继续加油！`);
      }
    }
  });

  watch(() => stats.todayStats.replied, (newValue, oldValue) => {
    if (newValue > oldValue) {
      console.log(`收到新回复！总回复数: ${newValue}`);
      recordLog(`🎉 收到新回复！当前回复率: ${stats.replyRate}%`);
    }
  });
}

/**
 * 辅助函数
 */
async function searchJobs(keyword: string) {
  // 模拟搜索
  return [];
}

async function evaluateJob(job: any) {
  // 模拟评估
  return Math.random() * 100;
}

async function generateGreeting(job: any) {
  // 模拟生成打招呼语
  return '您好，我对这个岗位很感兴趣...';
}

async function sendApplication(job: any, greeting: string) {
  // 模拟投递
  await delay(1000);
}

async function pauseEngine() {
  // 暂停投递引擎
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export {
  deliverJobExample,
  monitorRepliesExample,
  contentScriptExample,
  backgroundScriptExample,
  exportReportExample,
  smartDeliveryExample,
  industryAnalysisExample,
  realtimeMonitorExample,
};
