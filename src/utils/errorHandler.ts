/**
 * 全局错误处理工具
 */

import { Logger } from './logger';

export enum ErrorType {
  NETWORK = 'network',
  BUSINESS = 'business',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  detail?: string;
  stack?: string;
  timestamp: number;
}

class ErrorHandler {
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize = 50;
  private notificationCallback?: (error: ErrorInfo, onRetry?: () => void) => void;

  /**
   * 设置通知回调
   */
  setNotificationCallback(callback: (error: ErrorInfo, onRetry?: () => void) => void): void {
    this.notificationCallback = callback;
  }

  /**
   * 处理错误
   */
  handle(error: Error | string, type: ErrorType = ErrorType.UNKNOWN, onRetry?: () => void): void {
    const errorInfo: ErrorInfo = {
      type,
      message: typeof error === 'string' ? error : error.message,
      detail: typeof error === 'object' ? error.stack : undefined,
      stack: typeof error === 'object' ? error.stack : undefined,
      timestamp: Date.now(),
    };

    // 添加到错误队列
    this.errorQueue.push(errorInfo);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // 记录日志
    Logger.error(`[${type}] ${errorInfo.message}`, {
      detail: errorInfo.detail,
      stack: errorInfo.stack,
    });

    // 显示用户提示
    this.showUserMessage(errorInfo, onRetry);
  }

  /**
   * 显示用户提示
   */
  private showUserMessage(error: ErrorInfo, onRetry?: () => void): void {
    if (this.notificationCallback) {
      this.notificationCallback(error, onRetry);
    }
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(error: Error): void {
    this.handle(error, ErrorType.NETWORK);
  }

  /**
   * 处理业务错误
   */
  handleBusinessError(message: string): void {
    this.handle(message, ErrorType.BUSINESS);
  }

  /**
   * 处理系统错误
   */
  handleSystemError(error: Error): void {
    this.handle(error, ErrorType.SYSTEM);
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  /**
   * 清空错误历史
   */
  clearErrorHistory(): void {
    this.errorQueue = [];
  }
}

export const errorHandler = new ErrorHandler();
