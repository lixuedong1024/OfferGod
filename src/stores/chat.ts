import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Logger } from '@/utils/logger';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'boss';
  content: string;
  time: number;
  status: 'sending' | 'sent' | 'read' | 'failed';
}

export interface ChatSession {
  id: string;
  jobId: string;
  bossUid: string;
  bossEncryptUid: string;
  bossName: string;
  bossAvatar: string;
  companyName: string;
  jobTitle: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  messages: ChatMessage[];
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<string | null>(null);

  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || null;
  });

  const totalUnreadCount = computed(() => {
    return sessions.value.reduce((sum, s) => sum + s.unreadCount, 0);
  });

  // 加载会话列表
  async function loadSessions() {
    try {
      const data = await chrome.storage.local.get('chatSessions');
      if (data.chatSessions) {
        sessions.value = data.chatSessions;
        Logger.info('加载聊天会话', { count: sessions.value.length });
      }
    } catch (error) {
      Logger.error('加载聊天会话失败', { error: String(error) });
    }
  }

  // 保存会话列表
  async function saveSessions() {
    try {
      await chrome.storage.local.set({ chatSessions: sessions.value });
      Logger.debug('保存聊天会话', { count: sessions.value.length });
    } catch (error) {
      Logger.error('保存聊天会话失败', { error: String(error) });
    }
  }

  // 获取或创建会话
  function getOrCreateSession(params: {
    jobId: string;
    bossUid: string;
    bossEncryptUid: string;
    bossName: string;
    bossAvatar: string;
    companyName: string;
    jobTitle: string;
  }): ChatSession {
    const sessionId = `${params.jobId}_${params.bossUid}`;
    let session = sessions.value.find(s => s.id === sessionId);

    if (!session) {
      session = {
        id: sessionId,
        jobId: params.jobId,
        bossUid: params.bossUid,
        bossEncryptUid: params.bossEncryptUid,
        bossName: params.bossName,
        bossAvatar: params.bossAvatar,
        companyName: params.companyName,
        jobTitle: params.jobTitle,
        lastMessage: '',
        lastMessageTime: 0,
        unreadCount: 0,
        messages: [],
      };
      sessions.value.unshift(session);
      Logger.info('创建新会话', { sessionId, jobTitle: params.jobTitle });
    }

    return session;
  }

  // 添加消息
  async function addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'sessionId'>) {
    const session = sessions.value.find(s => s.id === sessionId);
    if (!session) {
      Logger.error('会话不存在', { sessionId });
      return;
    }

    const newMessage: ChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      ...message,
    };

    session.messages.push(newMessage);
    session.lastMessage = message.content;
    session.lastMessageTime = message.time;

    // 如果是 boss 发来的消息，增加未读计数
    if (message.role === 'boss' && currentSessionId.value !== sessionId) {
      session.unreadCount++;
    }

    // 将会话移到最前面
    const index = sessions.value.findIndex(s => s.id === sessionId);
    if (index > 0) {
      const [movedSession] = sessions.value.splice(index, 1);
      sessions.value.unshift(movedSession);
    }

    await saveSessions();
    Logger.debug('添加消息', { sessionId, role: message.role, content: message.content });
  }

  // 发送消息
  async function sendMessage(sessionId: string, content: string) {
    const message: Omit<ChatMessage, 'id' | 'sessionId'> = {
      role: 'user',
      content,
      time: Date.now(),
      status: 'sending',
    };

    await addMessage(sessionId, message);

    // 这里应该通过 WebSocket 发送消息
    // 实际发送逻辑在组件中处理
    return message;
  }

  // 更新消息状态
  async function updateMessageStatus(messageId: string, status: ChatMessage['status']) {
    for (const session of sessions.value) {
      const message = session.messages.find(m => m.id === messageId);
      if (message) {
        message.status = status;
        await saveSessions();
        Logger.debug('更新消息状态', { messageId, status });
        return;
      }
    }
  }

  // 标记会话为已读
  async function markSessionAsRead(sessionId: string) {
    const session = sessions.value.find(s => s.id === sessionId);
    if (session) {
      session.unreadCount = 0;
      await saveSessions();
      Logger.debug('标记会话已读', { sessionId });
    }
  }

  // 设置当前会话
  function setCurrentSession(sessionId: string | null) {
    currentSessionId.value = sessionId;
    if (sessionId) {
      markSessionAsRead(sessionId);
    }
  }

  // 删除会话
  async function deleteSession(sessionId: string) {
    const index = sessions.value.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      sessions.value.splice(index, 1);
      await saveSessions();
      Logger.info('删除会话', { sessionId });
    }
  }

  // 清空所有会话
  async function clearAllSessions() {
    sessions.value = [];
    currentSessionId.value = null;
    await chrome.storage.local.remove('chatSessions');
    Logger.info('清空所有会话');
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    totalUnreadCount,
    loadSessions,
    saveSessions,
    getOrCreateSession,
    addMessage,
    sendMessage,
    updateMessageStatus,
    markSessionAsRead,
    setCurrentSession,
    deleteSession,
    clearAllSessions,
  };
});
