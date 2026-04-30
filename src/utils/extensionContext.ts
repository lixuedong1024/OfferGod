/**
 * 扩展上下文管理工具
 * 用于检测和处理扩展上下文失效的情况
 */

import { Logger } from './logger';

/**
 * 检查扩展上下文是否有效
 */
export function isExtensionContextValid(): boolean {
  try {
    // 尝试访问 chrome.runtime.id
    // 如果扩展上下文失效，这会抛出错误
    return !!chrome?.runtime?.id;
  } catch (error) {
    return false;
  }
}

/**
 * 检查错误是否是扩展上下文失效错误
 */
export function isContextInvalidatedError(error: any): boolean {
  if (!error) return false;

  const message = error.message || String(error);
  return message.includes('Extension context invalidated') ||
         message.includes('Extension context was invalidated') ||
         message.includes('Cannot access a chrome:// URL');
}

/**
 * 处理扩展上下文失效
 */
export function handleContextInvalidated(): void {
  Logger.warn('扩展上下文已失效，页面需要刷新');

  // 显示提示信息
  showReloadNotification();
}

/**
 * 显示重新加载提示
 */
function showReloadNotification(): void {
  // 创建一个简单的提示框
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1e293b;
    color: #f1f5f9;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    max-width: 320px;
    animation: slideIn 0.3s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <div style="flex: 1;">
        <div style="font-weight: 600; margin-bottom: 4px;">扩展已更新</div>
        <div style="font-size: 12px; color: #cbd5e1;">请刷新页面以使用最新版本</div>
      </div>
      <button id="offergod-reload-btn" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      ">刷新</button>
    </div>
  `;

  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // 绑定刷新按钮
  const reloadBtn = document.getElementById('offergod-reload-btn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // 5秒后自动刷新
  setTimeout(() => {
    window.location.reload();
  }, 5000);
}

/**
 * 包装 chrome API 调用，自动处理上下文失效
 * 支持重试机制
 */
export async function safeChromeCaller<T>(
  fn: () => Promise<T>,
  fallback?: T,
  retries = 2
): Promise<T | undefined> {
  try {
    if (!isExtensionContextValid()) {
      handleContextInvalidated();
      return fallback;
    }
    return await fn();
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      handleContextInvalidated();
      return fallback;
    }

    // 其他错误，尝试重试
    if (retries > 0) {
      Logger.warn(`Chrome API 调用失败，重试中 (剩余: ${retries})`, { error });
      await new Promise(resolve => setTimeout(resolve, 500));
      return safeChromeCaller(fn, fallback, retries - 1);
    }

    throw error;
  }
}

/**
 * 同步版本的安全调用包装器
 */
export function safeChromeCallerSync<T>(
  fn: () => T,
  fallback?: T
): T | undefined {
  try {
    if (!isExtensionContextValid()) {
      handleContextInvalidated();
      return fallback;
    }
    return fn();
  } catch (error) {
    if (isContextInvalidatedError(error)) {
      handleContextInvalidated();
      return fallback;
    }
    throw error;
  }
}

/**
 * 监听扩展上下文失效
 */
export function watchExtensionContext(): void {
  // 定期检查扩展上下文
  const checkInterval = setInterval(() => {
    if (!isExtensionContextValid()) {
      clearInterval(checkInterval);
      handleContextInvalidated();
    }
  }, 5000);

  // 监听 chrome.runtime 错误
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 这个监听器主要用于保持连接活跃
      return false;
    });
  }
}
