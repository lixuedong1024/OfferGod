// main-world.ts - 注入到页面主世界的脚本
// 可以直接访问页面的 Vue 实例和数据

export default defineUnlistedScript(() => {
  interface JobData {
    // 基础信息
    encryptJobId: string;
    jobName: string;
    brandName: string;
    salaryDesc: string;
    cityName: string;
    experienceName: string;
    degreeName: string;
    jobLabels: string[];

    // Boss 信息
    bossName: string;
    bossTitle: string;
    activeTimeDesc: string;
    bossId?: string;
    encryptBossId?: string;
    bossAvatar?: string;

    // 扩展信息
    lid?: string;
    securityId?: string;
    encryptUserId?: string;
    brandIndustry?: string;
    brandScaleName?: string;
    welfareList?: string[];
  }

  interface UserInfo {
    uid: string;
    name: string;
    avatar?: string;
    token?: string;
  }

  let vueInstance: any = null;
  let pageChangeAction: any = null;

  // 获取用户信息（可选功能）
  function getUserInfo(): UserInfo | null {
    try {
      let userInfo: UserInfo | null = null;

      // 方法1: 从 window.__INITIAL_STATE__ 获取
      if ((window as any).__INITIAL_STATE__?.user) {
        const user = (window as any).__INITIAL_STATE__.user;
        const uid = user.uid || user.userId || user.id || '';
        const name = user.name || user.userName || user.nickname || '';

        if (uid && name) {
          userInfo = {
            uid,
            name,
            avatar: user.avatar || user.headImg || user.icon || '',
            token: user.token || '',
          };
        }
      }

      // 方法2: 从 localStorage 获取
      if (!userInfo) {
        const userStr = localStorage.getItem('user') || localStorage.getItem('userInfo');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            const uid = user.uid || user.userId || user.id || '';
            const name = user.name || user.userName || user.nickname || '';

            if (uid && name) {
              userInfo = {
                uid,
                name,
                avatar: user.avatar || user.headImg || user.icon || '',
                token: user.token || '',
              };
            }
          } catch (e) {
            // 解析失败，继续尝试其他方法
          }
        }
      }

      // 方法3: 从全局变量获取
      if (!userInfo && (window as any).g_user) {
        const user = (window as any).g_user;
        const uid = user.uid || user.userId || user.id || '';
        const name = user.name || user.userName || user.nickname || '';

        if (uid && name) {
          userInfo = {
            uid,
            name,
            avatar: user.avatar || user.headImg || user.icon || '',
            token: user.token || '',
          };
        }
      }

      return userInfo;
    } catch (error) {
      return null;
    }
  }

  // 等待 Vue 实例加载
  async function waitForVue(selector: string, timeout = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const element = document.querySelector(selector) as any;
        if (element && element.__vue__) {
          clearInterval(interval);
          resolve(element.__vue__);
        }
        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(new Error('Vue 实例加载超时'));
        }
      }, 100);
    });
  }

  // 初始化 Vue 实例
  async function initVueInstance() {
    if (vueInstance) return vueInstance;

    const selectors = [
      '.page-job-wrapper',
      '.job-recommend-main',
      '.page-jobs-main'
    ];

    for (const selector of selectors) {
      try {
        vueInstance = await waitForVue(selector, 3000);
        if (vueInstance) {
          console.log('✅ 找到 Vue 实例:', selector);

          // 获取翻页方法
          if (location.href.includes('/web/geek/job-recommend') || location.href.includes('/web/geek/jobs')) {
            pageChangeAction = vueInstance.searchJobAction || vueInstance.onSearch;
          } else {
            pageChangeAction = vueInstance.pageChangeAction;
          }

          if (pageChangeAction) {
            console.log('✅ 找到翻页方法');
          }

          return vueInstance;
        }
      } catch (e) {
        console.log('⏭️ 未找到:', selector);
      }
    }

    throw new Error('未找到 Vue 实例');
  }

  // 从页面 Vue 实例获取当前页岗位数据
  function getCurrentJobs(): JobData[] {
    if (!vueInstance) return [];

    const jobList = vueInstance.jobList;
    if (!jobList || !Array.isArray(jobList)) {
      return [];
    }

    return jobList.map((job: any) => ({
      // 基础信息
      encryptJobId: job.encryptJobId || job.encryptId || '',
      jobName: job.jobName || '',
      brandName: job.brandName || '',
      salaryDesc: job.salaryDesc || '',
      cityName: job.cityName || '',
      experienceName: job.experienceName || '',
      degreeName: job.degreeName || '',
      jobLabels: job.jobLabels || job.skills || [],

      // Boss 信息
      bossName: job.bossName || '',
      bossTitle: job.bossTitle || '',
      activeTimeDesc: job.activeTimeDesc || '',
      bossId: job.bossId || job.encryptUserId || '',
      encryptBossId: job.encryptBossId || job.securityId || '',
      bossAvatar: job.bossAvatar || job.bossIcon || '',

      // 扩展信息
      lid: job.lid || '',
      securityId: job.securityId || '',
      encryptUserId: job.encryptUserId || '',
      brandIndustry: job.brandIndustry || '',
      brandScaleName: job.brandScaleName || '',
      welfareList: job.welfareList || [],
    }));
  }

  // 翻页
  async function nextPage(): Promise<boolean> {
    if (!pageChangeAction || !vueInstance) return false;

    try {
      const currentPage = vueInstance.pageVo?.page || 1;
      console.log(`📄 翻到第 ${currentPage + 1} 页`);

      // 调用翻页方法
      await pageChangeAction(currentPage + 1);

      // 等待数据加载
      await new Promise(resolve => setTimeout(resolve, 800));

      return true;
    } catch (error) {
      console.error('翻页失败:', error);
      return false;
    }
  }

  // 批量抓取所有页面的岗位
  async function batchScrapeJobs(maxPages = 10): Promise<JobData[]> {
    try {
      console.log('🔍 开始批量抓取岗位数据...');

      await initVueInstance();

      const allJobs: JobData[] = [];
      const jobIds = new Set<string>();
      let oldLen = 0;
      let oldFirstJobId = '';
      let noChangeCount = 0;

      for (let i = 0; i < maxPages; i++) {
        // 获取当前页岗位
        const currentJobs = getCurrentJobs();

        if (currentJobs.length === 0) {
          console.log('⚠️ 当前页无岗位数据');
          break;
        }

        // 检测是否有变化
        const currentFirstJobId = currentJobs[0]?.encryptJobId || '';
        if (oldLen === currentJobs.length && oldFirstJobId === currentFirstJobId) {
          noChangeCount++;
          if (noChangeCount >= 2) {
            console.log('✅ 已到最后一页，停止抓取');
            break;
          }
        } else {
          noChangeCount = 0;
        }

        oldLen = currentJobs.length;
        oldFirstJobId = currentFirstJobId;

        // 去重添加
        let newCount = 0;
        for (const job of currentJobs) {
          if (!jobIds.has(job.encryptJobId)) {
            jobIds.add(job.encryptJobId);
            allJobs.push(job);
            newCount++;
          }
        }

        console.log(`✅ 第 ${i + 1} 页: 新增 ${newCount} 个岗位，累计 ${allJobs.length} 个`);

        // 如果不是最后一页，继续翻页
        if (i < maxPages - 1) {
          const hasNext = await nextPage();
          if (!hasNext) {
            console.log('⚠️ 无法继续翻页');
            break;
          }
        }
      }

      console.log(`✅ 批量抓取完成，共 ${allJobs.length} 个岗位`);
      return allJobs;
    } catch (error) {
      console.error('❌ 批量抓取失败:', error);
      return [];
    }
  }

  // 监听来自 content script 的消息
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'OFFERGOD_GET_JOBS') {
      console.log('📨 收到获取岗位请求');

      const maxPages = event.data.maxPages || 10;
      const jobs = await batchScrapeJobs(maxPages);

      // 发送结果回 content script
      window.postMessage({
        type: 'OFFERGOD_JOBS_RESULT',
        jobs: jobs,
      }, '*');
    } else if (event.data.type === 'OFFERGOD_GET_USER_INFO') {
      console.log('📨 收到获取用户信息请求');

      const userInfo = getUserInfo();

      // 发送结果回 content script
      window.postMessage({
        type: 'OFFERGOD_USER_INFO_RESULT',
        userInfo: userInfo,
      }, '*');
    }
  });

  console.log('✅ OfferGod main-world 脚本已加载');
});

