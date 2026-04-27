/**
 * 聊天记录同步功能
 * 从 Boss 直聘服务器同步历史聊天记录
 */

import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { Logger } from '@/utils/logger'

interface BossConversation {
  bossId: string
  bossName: string
  bossAvatar: string
  lastMessage: string
  lastMessageTime: number
  unreadCount: number
  jobTitle?: string
  companyName?: string
}

interface BossMessage {
  id: string
  from: string
  to: string
  content: string
  timestamp: number
  type: number
}

/**
 * 从 Boss 直聘同步聊天列表
 */
export async function syncConversations(): Promise<void> {
  const userStore = useUserStore()
  const chatStore = useChatStore()

  if (!userStore.userInfo?.uid) {
    Logger.error('用户未登录，无法同步聊天记录')
    throw new Error('用户未登录')
  }

  try {
    Logger.info('开始同步聊天列表...')

    // Boss 直聘的聊天列表 API
    const response = await fetch('https://www.zhipin.com/wapi/zpchat/geek/list', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 0) {
      throw new Error(data.message || '获取聊天列表失败')
    }

    const conversations: BossConversation[] = data.zpData?.conversations || []
    Logger.info(`获取到 ${conversations.length} 个会话`)

    // 同步每个会话
    for (const conv of conversations) {
      // 创建或更新会话
      const session = chatStore.getSession(conv.bossId) || chatStore.createSession({
        bossId: conv.bossId,
        bossName: conv.bossName,
        bossAvatar: conv.bossAvatar,
        jobTitle: conv.jobTitle,
        companyName: conv.companyName,
      })

      // 更新未读消息数
      if (conv.unreadCount > 0) {
        session.unreadCount = conv.unreadCount
      }

      Logger.info(`同步会话: ${conv.bossName} (${conv.bossId})`)
    }

    await chatStore.saveSessions()
    Logger.info('聊天列表同步完成')
  } catch (error) {
    Logger.error('同步聊天列表失败', { error: String(error) })
    throw error
  }
}

/**
 * 从 Boss 直聘同步指定会话的历史消息
 */
export async function syncMessages(bossId: string, limit = 50): Promise<void> {
  const userStore = useUserStore()
  const chatStore = useChatStore()

  if (!userStore.userInfo?.uid) {
    Logger.error('用户未登录，无法同步消息')
    throw new Error('用户未登录')
  }

  try {
    Logger.info(`开始同步会话 ${bossId} 的历史消息...`)

    // Boss 直聘的消息历史 API
    const response = await fetch(
      `https://www.zhipin.com/wapi/zpchat/geek/historyMsg?bossId=${bossId}&limit=${limit}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 0) {
      throw new Error(data.message || '获取历史消息失败')
    }

    const messages: BossMessage[] = data.zpData?.messages || []
    Logger.info(`获取到 ${messages.length} 条历史消息`)

    // 将消息添加到 Store（按时间顺序）
    for (const msg of messages.reverse()) {
      await chatStore.receiveMessage({
        id: msg.id,
        sessionId: bossId,
        content: msg.content,
        senderId: msg.from,
        receiverId: msg.to,
        timestamp: msg.timestamp,
        type: msg.type,
        status: 'sent',
      })
    }

    Logger.info(`会话 ${bossId} 的历史消息同步完成`)
  } catch (error) {
    Logger.error(`同步会话 ${bossId} 的历史消息失败`, { error: String(error) })
    throw error
  }
}

/**
 * 完整同步：先同步会话列表，再同步每个会话的消息
 */
export async function fullSync(messageLimit = 20): Promise<void> {
  try {
    Logger.info('开始完整同步...')

    // 1. 同步会话列表
    await syncConversations()

    // 2. 获取所有会话
    const chatStore = useChatStore()
    const sessions = chatStore.sessions

    // 3. 同步每个会话的消息（限制并发数）
    const concurrency = 3 // 同时最多同步 3 个会话
    for (let i = 0; i < sessions.length; i += concurrency) {
      const batch = sessions.slice(i, i + concurrency)
      await Promise.all(
        batch.map(session => syncMessages(session.bossUid, messageLimit))
      )
    }

    Logger.info('完整同步完成')
  } catch (error) {
    Logger.error('完整同步失败', { error: String(error) })
    throw error
  }
}
