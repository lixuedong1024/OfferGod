/**
 * Vue Hook 工具
 * 参考 boss-helper 的实现，劫持页面 Vue 实例的数据
 */

/**
 * 等待并获取 Vue 组件实例
 */
export async function waitForVueComponent(
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
export function hookVueData<T = any>(
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

  Object.defineProperty(vueInstance, key, {
    get() {
      return vueInstance[`_${key}`];
    },
    set(newValue: T) {
      // 调用原始 setter
      if (originalSetter) {
        originalSetter.call(this, newValue);
      } else {
        vueInstance[`_${key}`] = newValue;
      }

      // 触发回调
      callback(newValue);
    },
    configurable: true,
    enumerable: true,
  });

  // 返回清理函数
  return () => {
    if (originalSetter) {
      Object.defineProperty(vueInstance, key, {
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
export function hookVueMethod(
  vueInstance: any,
  methodName: string
): (...args: any[]) => any {
  const method = vueInstance[methodName];

  if (typeof method !== 'function') {
    throw new Error(`${methodName} 不是一个函数`);
  }

  return method.bind(vueInstance);
}

/**
 * 获取岗位详情的 Vue Hook
 */
export class JobDetailVueHook {
  private vueInstance: any = null;
  private jobDetailData: any = null;
  private clickJobCardAction: any = null;
  private cleanupFn: (() => void) | null = null;

  async init() {
    // 查找 Vue 组件
    const selectors = [
      '#wrap .page-job-wrapper',
      '.job-recommend-main',
      '.page-jobs-main',
    ];

    for (const selector of selectors) {
      try {
        this.vueInstance = await waitForVueComponent(selector, 5000);
        console.log('✅ 找到 Vue 实例:', selector);
        break;
      } catch (e) {
        console.log('⏭️ 未找到:', selector);
      }
    }

    if (!this.vueInstance) {
      throw new Error('未找到 Vue 实例');
    }

    // Hook jobDetail 数据
    this.cleanupFn = hookVueData(
      this.vueInstance,
      'jobDetail',
      (value) => {
        console.log('📦 jobDetail 数据更新:', value?.jobInfo?.jobName);
        this.jobDetailData = value;
      }
    );

    // 获取点击岗位卡片的方法
    try {
      this.clickJobCardAction = hookVueMethod(
        this.vueInstance,
        'clickJobCardAction'
      );
      console.log('✅ 获取到 clickJobCardAction 方法');
    } catch (e) {
      console.warn('⚠️ 未找到 clickJobCardAction 方法');
    }

    console.log('✅ JobDetailVueHook 初始化完成');
  }

  /**
   * 获取岗位详情
   */
  async getJobDetail(jobItem: any, timeout = 60000): Promise<any> {
    if (!this.vueInstance) {
      throw new Error('Vue 实例未初始化');
    }

    // 触发点击事件
    if (this.clickJobCardAction) {
      await this.clickJobCardAction(jobItem);
    }

    // 等待 jobDetail 数据更新
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('获取岗位详情超时'));
      }, timeout);

      const checkInterval = setInterval(() => {
        if (
          this.jobDetailData &&
          this.jobDetailData.lid === jobItem.lid
        ) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve(this.jobDetailData);
        }
      }, 100);
    });
  }

  /**
   * 获取当前的 jobDetail 数据
   */
  getCurrentJobDetail(): any {
    return this.jobDetailData;
  }

  /**
   * 清理
   */
  cleanup() {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
  }
}
