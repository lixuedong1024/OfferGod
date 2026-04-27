// 日志收集器 - 用于在 Boss 直聘反调试环境下收集日志
export class Logger {
  private static logs: Array<{
    timestamp: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    data?: any;
  }> = [];

  private static readonly MAX_LOGS = 1000;
  private static readonly STORAGE_KEY = 'offergod_debug_logs';

  /**
   * 记录日志
   */
  static async log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    this.logs.push(logEntry);

    // 保存到 storage
    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY);
      const existingLogs = stored[this.STORAGE_KEY] || [];
      const allLogs = [...existingLogs, logEntry].slice(-this.MAX_LOGS);

      await chrome.storage.local.set({
        [this.STORAGE_KEY]: allLogs,
      });
    } catch (error) {
      // 静默失败
    }

    // 尝试输出到控制台（如果可用）
    try {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[OfferGod] ${message}`, data || '');
    } catch (e) {
      // Boss 直聘可能会阻止控制台输出，忽略错误
    }
  }

  /**
   * 便捷方法
   */
  static info(message: string, data?: any) {
    return this.log('info', message, data);
  }

  static warn(message: string, data?: any) {
    return this.log('warn', message, data);
  }

  static error(message: string, data?: any) {
    return this.log('error', message, data);
  }

  static debug(message: string, data?: any) {
    return this.log('debug', message, data);
  }

  /**
   * 获取所有日志
   */
  static async getLogs() {
    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY);
      return stored[this.STORAGE_KEY] || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 清空日志
   */
  static async clearLogs() {
    try {
      await chrome.storage.local.remove(this.STORAGE_KEY);
      this.logs = [];
    } catch (error) {
      // 静默失败
    }
  }

  /**
   * 导出日志为文本
   */
  static async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return logs
      .map((log: any) => {
        const time = new Date(log.timestamp).toLocaleString('zh-CN');
        const dataStr = log.data ? `\n  数据: ${JSON.stringify(log.data, null, 2)}` : '';
        return `[${time}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`;
      })
      .join('\n\n');
  }

  /**
   * 下载日志文件
   */
  static async downloadLogs() {
    const content = await this.exportLogs();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offergod-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 全局导出
if (typeof window !== 'undefined') {
  (window as any).OfferGodLogger = Logger;
}
