/**
 * 岗位详情获取工具
 * 参考 boss-helper 的实现方式
 */

import { Logger } from './logger';

export interface JobDetailData {
  encryptJobId: string;
  jobName: string;
  postDescription: string;
  salaryDesc: string;
  experienceName: string;
  degreeName: string;
  jobLabels: string[];
  brandName: string;
  bossName: string;
  bossTitle: string;
  // ... 其他字段
}

/**
 * 通过 API 获取岗位详情
 */
export async function fetchJobDetailByAPI(
  securityId: string,
  lid: string,
  retries = 3
): Promise<JobDetailData | null> {
  if (retries === 0) {
    Logger.error('获取岗位详情失败：重试次数用尽');
    return null;
  }

  try {
    // 获取 token
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('bst='))
      ?.split('=')[1];

    if (!token) {
      Logger.warn('未找到 bst token');
      return null;
    }

    const response = await fetch(
      `https://www.zhipin.com/wapi/zpgeek/job/detail.json?securityId=${securityId}&lid=${lid}&_=${Date.now()}`,
      {
        method: 'GET',
        headers: {
          'Zp_token': token,
          'Accept': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(data.message || '获取失败');
    }

    const zpData = data.zpData;

    // 转换为统一格式
    return {
      encryptJobId: zpData.jobInfo.encryptId,
      jobName: zpData.jobInfo.jobName,
      postDescription: zpData.jobInfo.postDescription,
      salaryDesc: zpData.jobInfo.salaryDesc,
      experienceName: zpData.jobInfo.experienceName,
      degreeName: zpData.jobInfo.degreeName,
      jobLabels: zpData.jobInfo.showSkills || [],
      brandName: zpData.brandComInfo.brandName,
      bossName: zpData.bossInfo.name,
      bossTitle: zpData.bossInfo.title,
    };

  } catch (error) {
    Logger.warn(`获取岗位详情失败 (剩余重试: ${retries - 1})`, { error });

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, 1000));
    return fetchJobDetailByAPI(securityId, lid, retries - 1);
  }
}

/**
 * 通过页面 DOM 获取岗位详情
 */
export function fetchJobDetailFromDOM(jobId: string): JobDetailData | null {
  try {
    // 尝试从页面 DOM 中提取数据
    const descElement = document.querySelector('.job-detail-section .text');
    const postDescription = descElement?.textContent?.trim() || '';

    if (!postDescription) {
      Logger.warn('未从 DOM 中找到岗位描述');
      return null;
    }

    // 提取其他信息
    const jobName = document.querySelector('.job-title')?.textContent?.trim() || '';
    const salary = document.querySelector('.salary')?.textContent?.trim() || '';
    const tags = Array.from(document.querySelectorAll('.tag-list .tag'))
      .map(el => el.textContent?.trim() || '');

    return {
      encryptJobId: jobId,
      jobName,
      postDescription,
      salaryDesc: salary,
      experienceName: '',
      degreeName: '',
      jobLabels: tags,
      brandName: '',
      bossName: '',
      bossTitle: '',
    };

  } catch (error) {
    Logger.error('从 DOM 提取岗位详情失败', { error });
    return null;
  }
}

/**
 * 智能获取岗位详情（优先 API，降级到 DOM）
 */
export async function getJobDetail(
  jobId: string,
  securityId?: string,
  lid?: string
): Promise<JobDetailData | null> {
  // 方式1：通过 API 获取（推荐）
  if (securityId && lid) {
    Logger.info('尝试通过 API 获取岗位详情');
    const apiData = await fetchJobDetailByAPI(securityId, lid);
    if (apiData) {
      Logger.info('API 获取成功');
      return apiData;
    }
  }

  // 方式2：从 DOM 提取（降级方案）
  Logger.info('尝试从 DOM 提取岗位详情');
  const domData = fetchJobDetailFromDOM(jobId);
  if (domData) {
    Logger.info('DOM 提取成功');
    return domData;
  }

  Logger.error('所有方式均失败');
  return null;
}
