import { ref, computed } from 'vue';
import { Logger } from '@/utils/logger';
import { ChatMessage, decodeMessage, type MessageArgs } from './protobuf';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface WebSocketConfig {
  url: string;
  uid: string;
  token: string;
  heartbeatInterval?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null);
  const status = ref<ConnectionStatus>('disconnected');
  const reconnectAttempts = ref(0);
  const heartbeatTimer = ref<number | null>(null);
  const reconnectTimer = ref<number | null>(null);

  let config: WebSocketConfig | null = null;

  const isConnected = computed(() => status.value === 'connected');

  // 连接 WebSocket
  function connect(wsConfig: WebSocketConfig) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      Logger.warn('WebSocket 已连接，无需重复连接');
      return;
    }

    config = {
      heartbeatInterval: 30000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...wsConfig,
    };

    status.value = reconnectAttempts.value > 0 ? 'reconnecting' : 'connecting';
    Logger.info('正在连接 WebSocket', { url: config.url, uid: config.uid });

    try {
      const wsUrl = `${config.url}?uid=${config.uid}&token=${config.token}`;
      ws.value = new WebSocket(wsUrl);

      ws.value.binaryType = 'arraybuffer';

      ws.value.onopen = handleOpen;
      ws.value.onmessage = handleMessage;
      ws.value.onerror = handleError;
      ws.value.onclose = handleClose;
    } catch (error) {
      Logger.error('WebSocket 连接失败', { error: String(error) });
      status.value = 'disconnected';
      scheduleReconnect();
    }
  }

  // 连接成功
  function handleOpen() {
    Logger.info('WebSocket 连接成功');
    status.value = 'connected';
    reconnectAttempts.value = 0;
    startHeartbeat();
  }

  // 接收消息
  function handleMessage(event: MessageEvent) {
    try {
      const decoded = decodeMessage(event.data);
      if (decoded) {
        Logger.debug('收到 WebSocket 消息', { type: decoded.type, messageCount: decoded.messages?.length });

        // 触发消息接收事件
        if (decoded.messages && decoded.messages.length > 0) {
          window.dispatchEvent(new CustomEvent('offergod:chat:message', { detail: decoded.messages }));
        }
      }
    } catch (error) {
      Logger.error('处理 WebSocket 消息失败', { error: String(error) });
    }
  }

  // 连接错误
  function handleError(event: Event) {
    const errorDetail = {
      type: event.type,
      timestamp: Date.now(),
      readyState: ws.value?.readyState,
      url: config?.url,
    };
    Logger.error('WebSocket 连接错误', errorDetail);

    // 触发错误事件，让 UI 层可以显示友好提示
    window.dispatchEvent(new CustomEvent('offergod:websocket:error', {
      detail: {
        message: '网络连接出现问题，请检查网络设置',
        technical: errorDetail
      }
    }));
  }

  // 连接关闭
  function handleClose(event: CloseEvent) {
    const closeInfo = {
      code: event.code,
      reason: event.reason || '未知原因',
      wasClean: event.wasClean,
      timestamp: Date.now(),
    };

    Logger.warn('WebSocket 连接关闭', closeInfo);
    status.value = 'disconnected';
    stopHeartbeat();

    // 根据关闭码提供友好的错误信息
    let userMessage = '';
    if (event.code === 1000) {
      userMessage = '连接正常关闭';
    } else if (event.code === 1001) {
      userMessage = '服务器正在重启，将自动重连';
    } else if (event.code === 1006) {
      userMessage = '连接异常断开，可能是网络问题';
    } else if (event.code === 1008) {
      userMessage = '连接被服务器拒绝，请检查登录状态';
    } else if (event.code === 1011) {
      userMessage = '服务器遇到错误，将尝试重连';
    } else {
      userMessage = `连接关闭 (代码: ${event.code})`;
    }

    // 触发关闭事件
    window.dispatchEvent(new CustomEvent('offergod:websocket:close', {
      detail: {
        message: userMessage,
        ...closeInfo
      }
    }));

    // 非正常关闭，尝试重连
    if (event.code !== 1000) {
      scheduleReconnect();
    }
  }

  // 发送消息（带重试机制）
  async function sendMessage(args: MessageArgs, retryCount = 0, maxRetries = 3): Promise<{ success: boolean; error?: string }> {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      const error = 'WebSocket 未连接';
      Logger.error(error, { readyState: ws.value?.readyState });

      // 如果还有重试次数，等待后重试
      if (retryCount < maxRetries) {
        Logger.info(`准备重试发送消息 (${retryCount + 1}/${maxRetries})`, { to: args.toUid });
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 递增延迟
        return sendMessage(args, retryCount + 1, maxRetries);
      }

      return { success: false, error };
    }

    try {
      const message = new ChatMessage(args);
      ws.value.send(message.toArrayBuffer());
      Logger.info('发送消息成功', { to: args.toUid, content: args.content.substring(0, 50) });
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Logger.error('发送消息失败', { error: errorMsg, to: args.toUid, retryCount });

      // 如果还有重试次数，等待后重试
      if (retryCount < maxRetries) {
        Logger.info(`准备重试发送消息 (${retryCount + 1}/${maxRetries})`, { to: args.toUid });
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendMessage(args, retryCount + 1, maxRetries);
      }

      return { success: false, error: errorMsg };
    }
  }

  // 启动心跳
  function startHeartbeat() {
    if (!config) return;

    stopHeartbeat();
    heartbeatTimer.value = window.setInterval(() => {
      if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        try {
          // 发送心跳包（空消息）
          ws.value.send(new ArrayBuffer(0));
          Logger.debug('发送心跳包');
        } catch (error) {
          Logger.error('发送心跳包失败', { error: String(error) });
        }
      }
    }, config.heartbeatInterval);
  }

  // 停止心跳
  function stopHeartbeat() {
    if (heartbeatTimer.value) {
      clearInterval(heartbeatTimer.value);
      heartbeatTimer.value = null;
    }
  }

  // 安排重连
  function scheduleReconnect() {
    if (!config) return;

    if (reconnectAttempts.value >= config.maxReconnectAttempts!) {
      Logger.error('达到最大重连次数，停止重连', { attempts: reconnectAttempts.value });
      return;
    }

    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value);
    }

    reconnectAttempts.value++;
    Logger.info('安排重连', { attempt: reconnectAttempts.value, delay: config.reconnectInterval });

    reconnectTimer.value = window.setTimeout(() => {
      if (config) {
        connect(config);
      }
    }, config.reconnectInterval);
  }

  // 断开连接
  function disconnect() {
    stopHeartbeat();

    if (reconnectTimer.value) {
      clearTimeout(reconnectTimer.value);
      reconnectTimer.value = null;
    }

    if (ws.value) {
      ws.value.close(1000, '主动断开');
      ws.value = null;
    }

    status.value = 'disconnected';
    reconnectAttempts.value = 0;
    Logger.info('WebSocket 已断开');
  }

  return {
    status,
    isConnected,
    connect,
    disconnect,
    sendMessage,
  };
}
