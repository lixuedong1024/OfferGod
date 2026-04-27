// 岗位数据抓取工具
export interface JobData {
  encryptJobId: string;
  jobName: string;
  brandName: string;
  salaryDesc: string;
  cityName: string;
  experienceName: string;
  degreeName: string;
  jobLabels: string[];
  bossName: string;
  bossTitle: string;
  activeTimeDesc: string;
}

/**
 * 从 Boss 直聘页面获取岗位列表
 */
export async function getJobListFromPage(): Promise<JobData[]> {
  try {
    // 方法1: 尝试从 Vue 实例获取数据
    const wrap = document.querySelector('#wrap') as any;
    if (wrap && wrap.__vue__) {
      const vueInstance = wrap.__vue__;

      // 查找岗位列表数据
      const jobWrapper = document.querySelector('.page-job-wrapper, .job-recommend-main, .page-jobs-main') as any;
      if (jobWrapper && jobWrapper.__vue__) {
        const jobList = jobWrapper.__vue__.jobList;
        if (jobList && Array.isArray(jobList)) {
          console.log('从 Vue 实例获取到岗位数据:', jobList.length);
          return jobList.map(formatJobData);
        }
      }
    }

    // 方法2: 从 DOM 解析岗位数据
    const jobs = await parseJobsFromDOM();
    if (jobs.length > 0) {
      console.log('从 DOM 解析到岗位数据:', jobs.length);
      return jobs;
    }

    console.warn('未能获取到岗位数据');
    return [];
  } catch (error) {
    console.error('获取岗位列表失败:', error);
    return [];
  }
}

/**
 * 格式化岗位数据
 */
function formatJobData(job: any): JobData {
  return {
    encryptJobId: job.encryptJobId || job.encryptId || '',
    jobName: job.jobName || '',
    brandName: job.brandName || '',
    salaryDesc: job.salaryDesc || '',
    cityName: job.cityName || '',
    experienceName: job.experienceName || '',
    degreeName: job.degreeName || '',
    jobLabels: job.jobLabels || job.skills || [],
    bossName: job.bossName || '',
    bossTitle: job.bossTitle || '',
    activeTimeDesc: job.activeTimeDesc || '',
  };
}

/**
 * 从 DOM 解析岗位数据（备用方案）
 */
async function parseJobsFromDOM(): Promise<JobData[]> {
  const jobs: JobData[] = [];

  // 查找所有岗位卡片
  const jobCards = document.querySelectorAll('.job-card-wrapper, .job-card-box');

  jobCards.forEach((card) => {
    try {
      const jobName = card.querySelector('.job-name, .job-title')?.textContent?.trim() || '';
      const brandName = card.querySelector('.company-name')?.textContent?.trim() || '';
      const salaryDesc = card.querySelector('.salary')?.textContent?.trim() || '';
      const cityName = card.querySelector('.job-area')?.textContent?.trim() || '';
      const experienceName = card.querySelector('.tag-list .tag:nth-child(1)')?.textContent?.trim() || '';
      const degreeName = card.querySelector('.tag-list .tag:nth-child(2)')?.textContent?.trim() || '';

      const labels: string[] = [];
      card.querySelectorAll('.tag-list .tag').forEach((tag) => {
        const text = tag.textContent?.trim();
        if (text) labels.push(text);
      });

      const bossName = card.querySelector('.boss-name')?.textContent?.trim() || '';
      const bossTitle = card.querySelector('.boss-title')?.textContent?.trim() || '';
      const activeTimeDesc = card.querySelector('.boss-active-time')?.textContent?.trim() || '';

      // 尝试从 data 属性获取 ID
      const encryptJobId = (card as HTMLElement).dataset.jobId ||
                          (card as HTMLElement).dataset.lid ||
                          `job_${Date.now()}_${Math.random()}`;

      if (jobName && brandName) {
        jobs.push({
          encryptJobId,
          jobName,
          brandName,
          salaryDesc,
          cityName,
          experienceName,
          degreeName,
          jobLabels: labels,
          bossName,
          bossTitle,
          activeTimeDesc,
        });
      }
    } catch (error) {
      console.error('解析岗位卡片失败:', error);
    }
  });

  return jobs;
}

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(timeout = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      const jobCards = document.querySelectorAll('.job-card-wrapper, .job-card-box');

      if (jobCards.length > 0) {
        clearInterval(checkInterval);
        resolve(true);
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 500);
  });
}

/**
 * 保存岗位数据到 storage
 */
export async function saveJobsToStorage(jobs: JobData[]): Promise<void> {
  try {
    await chrome.storage.local.set({ jobs });
    console.log('岗位数据已保存:', jobs.length);
  } catch (error) {
    console.error('保存岗位数据失败:', error);
  }
}

/**
 * 从 storage 加载岗位数据
 */
export async function loadJobsFromStorage(): Promise<JobData[]> {
  try {
    const data = await chrome.storage.local.get('jobs');
    return data.jobs || [];
  } catch (error) {
    console.error('加载岗位数据失败:', error);
    return [];
  }
}
