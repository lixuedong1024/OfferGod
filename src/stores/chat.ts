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

  // 获取会话
  function getSession(bossId: string): ChatSession | undefined {
    return sessions.value.find(s => s.bossUid === bossId);
  }

  // 创建会话
  function createSession(params: {
    bossId: string;
    bossName: string;
    bossAvatar: string;
    jobTitle?: string;
    companyName?: string;
  }): ChatSession {
    const sessionId = `${params.bossId}_${Date.now()}`;
    const session: ChatSession = {
      id: sessionId,
      jobId: '',
      bossUid: params.bossId,
      bossEncryptUid: '',
      bossName: params.bossName,
      bossAvatar: params.bossAvatar,
      companyName: params.companyName || '',
      jobTitle: params.jobTitle || '',
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      messages: [],
    };
    sessions.value.unshift(session);
    Logger.info('创建新会话', { sessionId, bossName: params.bossName });
    return session;
  }

  // 接收消息（用于同步历史消息）
  async function receiveMessage(params: {
    id: string;
    sessionId: string;
    content: string;
    senderId: string;
    receiverId: string;
    timestamp: number;
    type: number;
    status: ChatMessage['status'];
  }) {
    const session = sessions.value.find(s => s.bossUid === params.sessionId);
    if (!session) {
      Logger.warn('会话不存在，无法接收消息', { sessionId: params.sessionId });
      return;
    }

    // 检查消息是否已存在
    const exists = session.messages.some(m => m.id === params.id);
    if (exists) {
      Logger.debug('消息已存在，跳过', { messageId: params.id });
      return;
    }

    // 获取用户信息判断消息角色
    const data = await chrome.storage.local.get('userInfo');
    const userInfo = data.userInfo;
    const role = params.senderId === userInfo?.uid ? 'user' : 'boss';

    const message: ChatMessage = {
      id: params.id,
      sessionId: session.id,
      role,
      content: params.content,
      time: params.timestamp,
      status: params.status,
    };

    session.messages.push(message);
    session.lastMessage = params.content;
    session.lastMessageTime = params.timestamp;

    // 如果是 boss 发来的消息且不是当前会话，增加未读计数
    if (role === 'boss' && currentSessionId.value !== session.id) {
      session.unreadCount++;
    }

    await saveSessions();
    Logger.debug('接收消息', { messageId: params.id, role, content: params.content });
  }
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
    getSession,
    createSession,
    getOrCreateSession,
    addMessage,
    sendMessage,
    receiveMessage,
    updateMessageStatus,
    markSessionAsRead,
    setCurrentSession,
    deleteSession,
    clearAllSessions,
  };
});
