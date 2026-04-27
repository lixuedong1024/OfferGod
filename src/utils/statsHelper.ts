/**
 * 统计数据辅助函数
 * 用于在投递流程中记录统计数据
 */

import { useStatisticsStore } from '../stores/statistics';

/**
 * 记录岗位扫描
 */
export function recordJobScanned() {
  const stats = useStatisticsStore();
  stats.incrementTodayStats('scanned');
}

/**
 * 记录岗位被过滤
 */
export function recordJobFiltered() {
  const stats = useStatisticsStore();
  stats.incrementTodayStats('filtered');
}

/**
 * 记录岗位被跳过
 */
export function recordJobSkipped() {
  const stats = useStatisticsStore();
  stats.incrementTodayStats('skipped');
  stats.addActivity({
    kind: 'warn',
    msg: '已跳过岗位（不符合筛选条件）',
  });
}

/**
 * 记录投递成功
 */
export function recordJobSent(jobTitle: string, companyName: string, industry?: string) {
  const stats = useStatisticsStore();
  stats.incrementTodayStats('sent');
  stats.addActivity({
    kind: 'ok',
    msg: `匹配并投递 — ${companyName} · ${jobTitle}`,
    companyName,
  });

  // 记录行业统计（投递时还不知道是否会回复，所以传false）
  if (industry) {
    stats.updateIndustryStats(industry, false);
  }

  // 记录投递时段
  const hour = new Date().getHours();
  stats.updateTimeSlotStats(hour, false);
}

/**
 * 记录收到回复
 */
export function recordJobReplied(jobTitle: string, companyName: string, industry?: string) {
  const stats = useStatisticsStore();
  stats.incrementTodayStats('replied');
  stats.addActivity({
    kind: 'ok',
    msg: `收到回复 — ${companyName} · ${jobTitle}`,
    companyName,
  });

  // 更新行业统计
  if (industry) {
    stats.updateIndustryStats(industry, true);
  }

  // 更新时段统计
  const hour = new Date().getHours();
  stats.updateTimeSlotStats(hour, true);
}

/**
 * 记录约面试
 */
export function recordJobInterview(jobTitle: string, companyName: string) {
  const stats = useStatisticsStore();
  stats.incrementTodayStats('interview');
  stats.addActivity({
    kind: 'ok',
    msg: `约面试 — ${companyName} · ${jobTitle}`,
    companyName,
  });
}

/**
 * 记录AI生成打招呼语
 */
export function recordAIGreeting(score: number) {
  const stats = useStatisticsStore();
  stats.addActivity({
    kind: 'log',
    msg: `生成打招呼语 (匹配度 ${score})`,
  });
}

/**
 * 记录岗位评估
 */
export function recordJobEvaluation(jobTitle: string, companyName: string) {
  const stats = useStatisticsStore();
  stats.addActivity({
    kind: 'log',
    msg: `评估岗位中... ${companyName} · ${jobTitle}`,
  });
}

/**
 * 记录搜索新岗位
 */
export function recordJobSearch(count: number, keyword: string) {
  const stats = useStatisticsStore();
  stats.addActivity({
    kind: 'log',
    msg: `搜索 ${count} 个新岗位（关键词：${keyword}）`,
  });
}

/**
 * 记录错误
 */
export function recordError(message: string) {
  const stats = useStatisticsStore();
  stats.addActivity({
    kind: 'error',
    msg: message,
  });
}

/**
 * 记录警告
 */
export function recordWarning(message: string) {
  const stats = useStatisticsStore();
  stats.addActivity({
    kind: 'warn',
    msg: message,
  });
}

/**
 * 记录普通日志
 */
export function recordLog(message: string) {
  const stats = useStatisticsStore();
  stats.addActivity({
    kind: 'log',
    msg: message,
  });
}
