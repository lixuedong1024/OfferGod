import { ref } from 'vue';
import { Logger } from '@/utils/logger';
import { useDeliveryConfig } from '@/stores/deliveryConfig';
import { useDeliveryQueue, type DeliveryTask } from './useDeliveryQueue';
import { useJobAnalysis } from './useJobAnalysis';
import { useResumeStore } from '@/stores/resume';
import { notificationManager } from '@/utils/notification';

/**
 * 自动投递管理器
 */
export function useAutoDelivery() {
  const configStore = useDeliveryConfig();
  const queueManager = useDeliveryQueue();
  const jobAnalysis = useJobAnalysis();
  const resumeStore = useResumeStore();

  const isInitialized = ref(false);

  /**
   * 初始化
   */
  async function initialize() {
    if (isInitialized.value) return;

    await configStore.loadConfig();
    await queueManager.loadStats();
    await resumeStore.loadResume();

    isInitialized.value = true;
    Logger.info('自动投递系统初始化完成');
  }

  /**
   * 开始自动投递
   */
  async function startAutoDelivery(jobs: any[]) {
    if (!isInitialized.value) {
      await initialize();
    }

    if (queueManager.isRunning.value) {
      Logger.warn('投递任务正在运行中');
      return;
    }

    if (jobs.length === 0) {
      Logger.warn('没有可投递的岗位');
      await notificationManager.notify('system', {
        title: '自动投递',
        message: '没有可投递的岗位',
      });
      return;
    }

    Logger.info('开始自动投递', { jobCount: jobs.length });
    queueManager.isRunning.value = true;

    try {
      // 1. 筛选和分析岗位
      const filteredJobs = await filterAndAnalyzeJobs(jobs);

      if (filteredJobs.length === 0) {
        Logger.warn('没有符合条件的岗位');
        await notificationManager.notify('system', {
          title: '自动投递',
          message: '没有符合投递条件的岗位',
        });
        return;
      }

      // 2. 添加到队列
      queueManager.addTasks(filteredJobs.map(item => item.job));

      // 3. 开始处理队列
      await processQueue(filteredJobs);

      // 4. 保存历史和统计
      await queueManager.saveHistory();
      await queueManager.saveStats();

      // 5. 显示完成通知
      await notificationManager.notify('system', {
        title: '自动投递完成',
        message: `成功: ${queueManager.stats.value.success}, 失败: ${queueManager.stats.value.failed}, 跳过: ${queueManager.stats.value.skipped}`,
      });

      Logger.info('自动投递完成', queueManager.stats.value);
    } catch (error) {
      Logger.error('自动投递失败', { error: String(error) });
      await notificationManager.notify('system', {
        title: '自动投递失败',
        message: String(error),
      });
    } finally {
      queueManager.isRunning.value = false;
    }
  }

  /**
   * 筛选和分析岗位
   */
  async function filterAndAnalyzeJobs(jobs: any[]): Promise<Array<{ job: any; analysis: any }>> {
    const results: Array<{ job: any; analysis: any }> = [];

    Logger.info('开始筛选和分析岗位', { total: jobs.length });

    for (const job of jobs) {
      try {
        // 1. AI 分析岗位匹配度
        let analysis = null;
        if (configStore.config.strategy.useAI && resumeStore.resume) {
          analysis = await jobAnalysis.analyzeJobMatch(job, resumeStore.resume);
        }

        // 2. 检查是否符合投递规则
        const checkResult = configStore.checkJobMatchesRule(job, analysis);

        if (checkResult.passed) {
          results.push({ job, analysis });
          Logger.debug('岗位通过筛选', {
            jobName: job.jobName,
            company: job.brandName,
            score: analysis?.score,
          });
        } else {
          Logger.debug('岗位未通过筛选', {
            jobName: job.jobName,
            company: job.brandName,
            reason: checkResult.reason,
          });
        }
      } catch (error) {
        Logger.error('分析岗位失败', {
          jobName: job.jobName,
          error: String(error),
        });
      }
    }

    // 3. 按匹配分数排序（如果启用优先投递高分岗位）
    if (configStore.config.strategy.prioritizeHighScore) {
      results.sort((a, b) => (b.analysis?.score || 0) - (a.analysis?.score || 0));
    }

    Logger.info('岗位筛选完成', {
      total: jobs.length,
      passed: results.length,
      filtered: jobs.length - results.length,
    });

    return results;
  }

  /**
   * 处理投递队列
   */
  async function processQueue(jobsWithAnalysis: Array<{ job: any; analysis: any }>) {
    Logger.info('开始处理投递队列', { count: jobsWithAnalysis.length });

    for (let i = 0; i < jobsWithAnalysis.length; i++) {
      // 检查是否暂停
      while (queueManager.isPaused.value) {
        await sleep(1000);
      }

      // 检查是否停止
      if (!queueManager.isRunning.value) {
        Logger.info('投递已停止');
        break;
      }

      const { job, analysis } = jobsWithAnalysis[i];
      const task = queueManager.queue.value.find(t => t.jobId === job.encryptJobId);

      if (!task) continue;

      try {
        // 1. 检查频率限制
        const canDeliverResult = queueManager.canDeliver();
        if (!canDeliverResult.allowed) {
          Logger.warn('达到投递限制', { reason: canDeliverResult.reason });
          queueManager.updateTaskStatus(task.id, 'skipped', canDeliverResult.reason || '达到投递限制');

          // 如果是每日限制，停止投递
          if (canDeliverResult.reason?.includes('每日')) {
            await notificationManager.notify('system', {
              title: '投递已停止',
              message: canDeliverResult.reason,
            });
            break;
          }

          continue;
        }

        // 2. 更新任务状态为运行中
        queueManager.currentTask.value = task;
        queueManager.updateTaskStatus(task.id, 'running', '正在投递...');

        // 3. 生成打招呼语
        let greeting = '';
        if (configStore.config.strategy.autoGenGreeting) {
          if (configStore.config.strategy.useAI && resumeStore.resume) {
            greeting = await jobAnalysis.generateGreeting(job, resumeStore.resume);
          } else {
            greeting = generateGreetingFromTemplate(job);
          }
        }

        // 4. 执行投递
        await deliverJob(job, greeting);

        // 5. 更新任务状态为成功
        queueManager.updateTaskStatus(task.id, 'success', '投递成功');

        Logger.info('投递成功', {
          jobName: job.jobName,
          company: job.brandName,
          greeting: greeting.substring(0, 50),
        });

        // 6. 计算延迟时间
        if (i < jobsWithAnalysis.length - 1) {
          const delay = queueManager.calculateDelay();
          Logger.debug('等待下次投递', { delay });
          await sleep(delay * 1000);
        }
      } catch (error) {
        const errorMsg = String(error);
        Logger.error('投递失败', {
          jobName: job.jobName,
          error: errorMsg,
        });

        // 更新任务状态
        task.retryCount++;
        if (task.retryCount < configStore.config.safety.maxRetries) {
          queueManager.updateTaskStatus(task.id, 'failed', `投递失败，将重试 (${task.retryCount}/${configStore.config.safety.maxRetries})`, errorMsg);
        } else {
          queueManager.updateTaskStatus(task.id, 'failed', '投递失败，已达最大重试次数', errorMsg);
        }

        // 如果配置了遇到错误停止
        if (configStore.config.safety.stopOnError) {
          Logger.warn('遇到错误，停止投递');
          await notificationManager.notify('system', {
            title: '投递已停止',
            message: '遇到错误，已停止投递',
          });
          break;
        }
      }
    }

    queueManager.currentTask.value = null;
    Logger.info('投递队列处理完成');
  }

  /**
   * 执行投递操作
   */
  async function deliverJob(job: any, greeting: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 发送消息到 content script 执行投递
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) {
            reject(new Error('未找到活动标签页'));
            return;
          }

          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              type: 'DELIVER_JOB',
              payload: {
                jobId: job.encryptJobId,
                bossId: job.encryptBossId || job.bossId,
                greeting,
              },
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }

              if (response?.success) {
                resolve();
              } else {
                reject(new Error(response?.error || '投递失败'));
              }
            }
          );
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 从模板生成打招呼语
   */
  function generateGreetingFromTemplate(job: any): string {
    const template = configStore.config.strategy.greetingTemplate;
    const resume = resumeStore.resume;

    return template
      .replace('{jobTitle}', job.jobName)
      .replace('{company}', job.brandName)
      .replace('{experience}', resume?.workExperience?.[0]?.duration || '多年')
      .replace('{skills}', resume?.skills?.slice(0, 3).join('、') || '相关技能');
  }

  /**
   * 停止自动投递
   */
  function stopAutoDelivery() {
    queueManager.stop();
    Logger.info('停止自动投递');
  }

  /**
   * 暂停自动投递
   */
  function pauseAutoDelivery() {
    queueManager.pause();
    Logger.info('暂停自动投递');
  }

  /**
   * 恢复自动投递
   */
  function resumeAutoDelivery() {
    queueManager.resume();
    Logger.info('恢复自动投递');
  }

  return {
    isRunning: queueManager.isRunning,
    isPaused: queueManager.isPaused,
    queue: queueManager.queue,
    currentTask: queueManager.currentTask,
    stats: queueManager.stats,
    progress: queueManager.progress,
    initialize,
    startAutoDelivery,
    stopAutoDelivery,
    pauseAutoDelivery,
    resumeAutoDelivery,
  };
}

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
