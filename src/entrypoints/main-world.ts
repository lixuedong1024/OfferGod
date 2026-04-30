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

    // 详情信息
    postDescription?: string;
  }

  interface UserInfo {
    uid: string;
    name: string;
    avatar?: string;
    token?: string;
  }

  let vueInstance: any = null;
  let pageChangeAction: any = null;
  let jobDetailData: any = null;
  let clickJobCardAction: any = null;

  // ==================== Vue Hook 工具函数 ====================

  /**
   * 等待并获取 Vue 组件实例
   */
  async function waitForVueComponent(
    selector: string,
    timeout = 20000
  ): Promise<any> {
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
          reject(new Error(`未找到 Vue 组件: ${selector}`));
        }
      }, 100);
    });
  }

  /**
   * Hook Vue 数据，监听数据变化
   */
  function hookVueData<T = any>(
    vueInstance: any,
    key: string,
    callback: (value: T) => void
  ): () => void {
    // 获取初始值
    const initialValue = vueInstance[key];
    if (initialValue !== undefined) {
      callback(initialValue);
    }

    // 劫持 setter
    const originalSetter = vueInstance.__lookupSetter__(key);
    const originalGetter = vueInstance.__lookupGetter__(key);

    Object.defineProperty(vueInstance, key, {
      get() {
        if (originalGetter) {
          return originalGetter.call(this);
        }
        return this[`__offergod_${key}`];
      },
      set(newValue: T) {
        // 调用原始 setter
        if (originalSetter) {
          originalSetter.call(this, newValue);
        } else {
          this[`__offergod_${key}`] = newValue;
        }

        // 触发回调
        callback(newValue);
      },
      configurable: true,
      enumerable: true,
    });

    // 返回清理函数
    return () => {
      if (originalSetter || originalGetter) {
        Object.defineProperty(vueInstance, key, {
          get: originalGetter,
          set: originalSetter,
          configurable: true,
          enumerable: true,
        });
      }
    };
  }

  /**
   * Hook Vue 方法
   */
  function hookVueMethod(
    vueInstance: any,
    methodName: string
  ): (...args: any[]) => any {
    const method = vueInstance[methodName];

    if (typeof method !== 'function') {
      throw new Error(`${methodName} 不是一个函数`);
    }

    return method.bind(vueInstance);
  }

  // ==================== 初始化 Vue Hook ====================

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

  /**
   * Hook Vue 数据，监听数据变化
   */
  function hookVueData<T = any>(
    vueInstance: any,
    key: string,
    callback: (value: T) => void
  ): () => void {
    // 获取初始值
    const initialValue = vueInstance[key];
    if (initialValue !== undefined) {
      callback(initialValue);
    }

    // 劫持 setter
    const originalSetter = vueInstance.__lookupSetter__(key);
    const originalGetter = vueInstance.__lookupGetter__(key);

    Object.defineProperty(vueInstance, key, {
      get() {
        if (originalGetter) {
          return originalGetter.call(this);
        }
        return this[`__offergod_${key}`];
      },
      set(newValue: T) {
        // 调用原始 setter
        if (originalSetter) {
          originalSetter.call(this, newValue);
        } else {
          this[`__offergod_${key}`] = newValue;
        }

        // 触发回调
        callback(newValue);
      },
      configurable: true,
      enumerable: true,
    });

    // 返回清理函数
    return () => {
      if (originalSetter || originalGetter) {
        Object.defineProperty(vueInstance, key, {
          get: originalGetter,
          set: originalSetter,
          configurable: true,
          enumerable: true,
        });
      }
    };
  }

  /**
   * Hook Vue 方法
   */
  function hookVueMethod(
    vueInstance: any,
    methodName: string
  ): (...args: any[]) => any {
    const method = vueInstance[methodName];

    if (typeof method !== 'function') {
      throw new Error(`${methodName} 不是一个函数`);
    }

    return method.bind(vueInstance);
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

          // Hook jobDetail 数据变化
          try {
            hookVueData(vueInstance, 'jobDetail', (value) => {
              console.log('📦 jobDetail 数据更新:', value?.jobInfo?.jobName);
              jobDetailData = value;

              // 自动发送到 content script
              if (value && value.jobInfo) {
                window.postMessage({
                  type: 'OFFERGOD_JOB_DETAIL_RESULT',
                  jobId: value.jobInfo.encryptId || value.lid,
                  description: value.jobInfo.postDescription || '',
                  jobDetail: value,
                }, '*');
              }
            });
            console.log('✅ 已 Hook jobDetail 数据');
          } catch (e) {
            console.warn('⚠️ Hook jobDetail 失败:', e);
          }

          // 获取点击岗位卡片的方法
          try {
            clickJobCardAction = hookVueMethod(vueInstance, 'clickJobCardAction');
            console.log('✅ 获取到 clickJobCardAction 方法');
          } catch (e) {
            console.warn('⚠️ 未找到 clickJobCardAction 方法');
          }

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

      // 岗位描述（如果有的话）
      postDescription: job.postDescription || job.jobDescription || '',
    }));
  }

  // 获取当前岗位详情页的描述信息
  function getJobDetailDescription(): string {
    try {
      console.log('🔍 开始获取岗位描述...');

      // 方法0: 从 Hook 的 jobDetailData 获取（最优先）
      if (jobDetailData && jobDetailData.jobInfo) {
        const description = jobDetailData.jobInfo.postDescription || '';
        if (description) {
          console.log('✅ 从 Hook 的 jobDetailData 获取到描述，长度:', description.length);
          return description;
        }
      }

      // 方法1: 从 __INITIAL_STATE__ 获取
      if ((window as any).__INITIAL_STATE__?.jobDetail) {
        const jobDetail = (window as any).__INITIAL_STATE__.jobDetail;
        const description = jobDetail.jobInfo?.postDescription || jobDetail.postDescription || jobDetail.jobDescription || '';
        if (description) {
          console.log('✅ 从 __INITIAL_STATE__ 获取到描述，长度:', description.length);
          return description;
        }
      }

      // 方法2: 从 Vue 实例获取
      const vueSelectors = [
        '.job-detail-section',
        '.job-detail',
        '.detail-content',
        '.job-primary',
        '[class*="job-detail"]',
        '[class*="detail-primary"]'
      ];

      for (const selector of vueSelectors) {
        const element = document.querySelector(selector) as any;
        if (element && element.__vue__) {
          const vue = element.__vue__;
          const description = vue.jobDetail?.jobInfo?.postDescription ||
                            vue.jobDetail?.postDescription ||
                            vue.jobInfo?.postDescription ||
                            vue.postDescription ||
                            vue.$data?.jobDetail?.jobInfo?.postDescription ||
                            vue.$data?.jobDetail?.postDescription ||
                            vue.$data?.postDescription || '';
          if (description) {
            console.log(`✅ 从 Vue 实例 (${selector}) 获取到描述，长度:`, description.length);
            return description;
          }
        }
      }

      // 方法3: 从 DOM 获取
      const descSelectors = [
        '.job-sec-text',
        '.text-description',
        '.job-detail-text',
        '.detail-content .text',
        '.job-detail-section .text',
        '[class*="job-description"]',
        '[class*="post-description"]',
        '[class*="detail-text"]'
      ];

      for (const selector of descSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          const text = element.textContent.trim();
          if (text.length > 50) { // 确保不是空内容
            console.log(`✅ 从 DOM (${selector}) 获取到描述，长度:`, text.length);
            return text;
          }
        }
      }

      // 方法4: 从全局变量获取
      if ((window as any).jobDetailData) {
        const description = (window as any).jobDetailData.postDescription || '';
        if (description) {
          console.log('✅ 从全局变量 jobDetailData 获取到描述，长度:', description.length);
          return description;
        }
      }

      console.warn('⚠️ 未能获取到岗位描述');
      return '';
    } catch (error) {
      console.error('❌ 获取岗位描述失败:', error);
      return '';
    }
  }

  // 等待并获取岗位描述（带重试）
  async function waitForJobDescription(maxRetries = 5, interval = 500): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const description = getJobDetailDescription();
      if (description) {
        return description;
      }
      console.log(`⏳ 第 ${i + 1} 次尝试未获取到描述，${interval}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    console.warn('⚠️ 重试 ' + maxRetries + ' 次后仍未获取到描述');
    return '';
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
    } else if (event.data.type === 'OFFERGOD_GET_JOB_DETAIL') {
      console.log('📨 收到获取岗位详情请求');

      // 使用带重试的获取方法
      const description = await waitForJobDescription();

      // 发送结果回 content script
      window.postMessage({
        type: 'OFFERGOD_JOB_DETAIL_RESULT',
        jobId: event.data.jobId,
        description: description,
      }, '*');
    }
  });

  // 监听 URL 变化，自动获取岗位详情
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // 如果进入岗位详情页
      if (currentUrl.includes('/job_detail/')) {
        console.log('🔍 检测到进入岗位详情页');

        // 等待页面加载后获取描述（使用重试机制）
        setTimeout(async () => {
          const description = await waitForJobDescription();
          if (description) {
            // 从 URL 提取 jobId
            const match = currentUrl.match(/job_detail\/([^/?]+)/);
            const jobId = match ? match[1] : '';

            if (jobId) {
              console.log('✅ 自动获取到岗位描述，长度:', description.length);

              // 发送到 content script
              window.postMessage({
                type: 'OFFERGOD_JOB_DETAIL_RESULT',
                jobId: jobId,
                description: description,
              }, '*');
            }
          } else {
            console.warn('⚠️ 自动获取岗位描述失败');
          }
        }, 1000); // 减少初始等待时间，因为 waitForJobDescription 内部有重试
      }
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('✅ OfferGod main-world 脚本已加载');
});

