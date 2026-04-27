// 简化版 Logger - 用于 main-world 环境（无法访问 chrome.storage API）
// 通过 postMessage 将日志发送到 content script
export class SimpleLogger {
  private static sendLog(level: string, message: string, data?: any) {
    // 发送到 content script
    window.postMessage({
      type: 'OFFERGOD_LOG',
      log: {
        timestamp: Date.now(),
        level,
        message,
        data,
      }
    }, '*');

    // 尝试输出到控制台
    try {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[OfferGod] ${message}`, data || '');
    } catch (e) {
      // Boss 直聘可能会阻止控制台输出
    }
  }

  static info(message: string, data?: any) {
    this.sendLog('info', message, data);
  }

  static warn(message: string, data?: any) {
    this.sendLog('warn', message, data);
  }

  static error(message: string, data?: any) {
    this.sendLog('error', message, data);
  }

  static debug(message: string, data?: any) {
    this.sendLog('debug', message, data);
  }
}

// 全局导出
if (typeof window !== 'undefined') {
  (window as any).OfferGodSimpleLogger = SimpleLogger;
}
