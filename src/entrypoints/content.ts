import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from '../App.vue';
import { Logger } from '../utils/logger';
import { useWebSocket } from '../composables/useWebSocket';

export default defineContentScript({
  matches: ['*://*.zhipin.com/*'],
  main() {
    let app: any = null;
    let container: HTMLElement | null = null;
    let wsClient: ReturnType<typeof useWebSocket> | null = null;
    let userInfo: any = null;

    // 注入 main-world 脚本
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('main-world.js');
    script.onload = () => {
      Logger.info('main-world 脚本已注入');

      // 请求获取用户信息
      setTimeout(() => {
        window.postMessage({ type: 'OFFERGOD_GET_USER_INFO' }, '*');
      }, 1000);
    };
    (document.head || document.documentElement).appendChild(script);

    // 监听来自 main-world 的消息
    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;

      // 处理岗位数据
      if (event.data.type === 'OFFERGOD_JOBS_RESULT') {
        const jobs = event.data.jobs;
        Logger.info('收到岗位数据', { count: jobs.length });

        try {
          // 读取现有数据
          const existingData = await chrome.storage.local.get(['jobs']);
          const existingJobs = existingData.jobs || [];

          // 合并去重（基于 encryptJobId）
          const jobMap = new Map();

          // 先添加现有岗位
          existingJobs.forEach((job: any) => {
            jobMap.set(job.encryptJobId, job);
          });

          // 添加新岗位（会覆盖重复的）
          jobs.forEach((job: any) => {
            jobMap.set(job.encryptJobId, job);
          });

          const mergedJobs = Array.from(jobMap.values());

          Logger.info('保存岗位数据', {
            新抓取: jobs.length,
            原有: existingJobs.length,
            合并后: mergedJobs.length
          });

          // 保存到 storage
          await chrome.storage.local.set({
            jobs: mergedJobs,
            lastUpdate: Date.now()
          });

          // 更新统计数据
          await chrome.storage.local.set({
            totalCount: mergedJobs.length,
          });

          // 添加活动日志
          const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const existingActivities = (await chrome.storage.local.get('activities')).activities || [];
          const activities = [
            { time: now, kind: 'ok', msg: `成功抓取 ${jobs.length} 个岗位，累计 ${mergedJobs.length} 个` },
            ...existingActivities.slice(0, 9) // 保留最近10条
          ];
          await chrome.storage.local.set({ activities });

          Logger.info('岗位数据保存成功');

          // 验证保存
          const saved = await chrome.storage.local.get('jobs');
          Logger.debug('验证保存的数据', { savedCount: saved.jobs?.length });
        } catch (error) {
          Logger.error('保存岗位数据失败', { error: String(error) });
        }
      }

      // 处理用户信息
      if (event.data.type === 'OFFERGOD_USER_INFO_RESULT') {
        userInfo = event.data.userInfo;

        if (userInfo && userInfo.uid) {
          Logger.info('收到用户信息', { uid: userInfo.uid, name: userInfo.name });

          // 保存用户信息
          await chrome.storage.local.set({ userInfo });

          // 自动连接 WebSocket
          connectWebSocket();
        } else {
          Logger.warn('用户信息不完整', { userInfo });
        }
      }
    });

    // 连接 WebSocket
    function connectWebSocket() {
      if (!userInfo || !userInfo.uid) {
        Logger.warn('用户信息不存在，无法连接 WebSocket');
        return;
      }

      if (wsClient && wsClient.isConnected.value) {
        Logger.info('WebSocket 已连接，无需重复连接');
        return;
      }

      try {
        // 创建 WebSocket 客户端
        if (!wsClient) {
          wsClient = useWebSocket();
        }

        // 连接到 Boss 直聘 WebSocket 服务器
        wsClient.connect({
          url: 'wss://chat.zhipin.com/wss',
          uid: userInfo.uid,
          token: userInfo.token || '',
        });

        Logger.info('WebSocket 连接已启动');
      } catch (error) {
        Logger.error('WebSocket 连接失败', { error: String(error) });
      }
    }

    // 自动抓取岗位数据
    async function autoScrapeJobs() {
      Logger.info('开始自动抓取岗位');

      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 发送消息到 main-world 脚本，抓取前3页
      window.postMessage({ type: 'OFFERGOD_GET_JOBS', maxPages: 3 }, '*');
    }

    // 页面加载后自动抓取
    setTimeout(autoScrapeJobs, 3000);

    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'openDashboard' || request.action === 'openSettings') {
        // 如果已经存在，先移除
        if (container) {
          container.remove();
          if (app) {
            app.unmount();
          }
        }

        // 创建容器
        container = document.createElement('div');
        container.id = 'offergod-app';
        container.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 999999;
          background: rgba(0, 0, 0, 0.5);
        `;
        document.body.appendChild(container);

        // 创建应用
        app = createApp(App);
        const pinia = createPinia();

        app.use(pinia);
        app.use(ElementPlus);
        app.mount(container);

        sendResponse({ success: true });
      } else if (request.action === 'scrapeJobs') {
        // 手动触发抓取
        window.postMessage({ type: 'OFFERGOD_GET_JOBS' }, '*');
        sendResponse({ success: true });
      } else if (request.action === 'connectWebSocket') {
        // 手动触发 WebSocket 连接
        connectWebSocket();
        sendResponse({ success: true });
      } else if (request.type === 'DELIVER_JOB') {
        // 处理投递请求
        handleDeliverJob(request.payload)
          .then(() => sendResponse({ success: true }))
          .catch((error) => sendResponse({ success: false, error: String(error) }));
        return true; // 保持消息通道开启
      }

      return true;
    });

    // 处理投递操作
    async function handleDeliverJob(payload: { jobId: string; bossId: string; greeting: string }) {
      Logger.info('开始投递岗位', payload);

      if (!userInfo || !userInfo.uid) {
        throw new Error('用户信息不存在');
      }

      if (!wsClient || !wsClient.isConnected.value) {
        throw new Error('WebSocket 未连接');
      }

      try {
        // 通过 WebSocket 发送消息
        const result = await wsClient.sendMessage({
          fromUid: userInfo.uid,
          toUid: payload.bossId,
          toName: payload.bossId,
          content: payload.greeting,
        });

        if (!result.success) {
          throw new Error(result.error || '发送消息失败');
        }

        // 更新岗位状态
        const data = await chrome.storage.local.get('jobs');
        const jobs = data.jobs || [];
        const updatedJobs = jobs.map((job: any) => {
          if (job.encryptJobId === payload.jobId) {
            return {
              ...job,
              status: 'applied',
              appliedAt: Date.now(),
            };
          }
          return job;
        });

        await chrome.storage.local.set({ jobs: updatedJobs });

        Logger.info('投递成功', { jobId: payload.jobId });
      } catch (error) {
        Logger.error('投递失败', { error: String(error), jobId: payload.jobId });
        throw error;
      }
    }

    Logger.info('OfferGod content script 已加载');
  },
});
