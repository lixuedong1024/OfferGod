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
export async function syncConversations(): Promise<{ success: boolean; error?: string; count?: number }> {
  const userStore = useUserStore()
  const chatStore = useChatStore()

  if (!userStore.userInfo?.uid) {
    const error = '用户未登录，无法同步聊天记录'
    Logger.error(error)
    return { success: false, error }
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
      const error = `网络请求失败 (HTTP ${response.status})`
      Logger.error(error, { status: response.status, statusText: response.statusText })
      return { success: false, error }
    }

    const data = await response.json()

    if (data.code !== 0) {
      const error = data.message || '获取聊天列表失败'
      Logger.error(error, { code: data.code })
      return { success: false, error }
    }

    const conversations: BossConversation[] = data.zpData?.conversations || []
    Logger.info(`获取到 ${conversations.length} 个会话`)

    // 同步每个会话
    for (const conv of conversations) {
      try {
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

        Logger.debug(`同步会话: ${conv.bossName} (${conv.bossId})`)
      } catch (error) {
        Logger.error(`同步会话失败: ${conv.bossName}`, { error: String(error) })
        // 继续处理其他会话
      }
    }

    await chatStore.saveSessions()
    Logger.info('聊天列表同步完成')
    return { success: true, count: conversations.length }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    Logger.error('同步聊天列表失败', { error: errorMsg })

    // 判断错误类型，提供更友好的提示
    let userError = '同步失败'
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      userError = '网络连接失败，请检查网络设置'
    } else if (errorMsg.includes('timeout')) {
      userError = '请求超时，请稍后重试'
    } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
      userError = '登录已过期，请重新登录 Boss 直聘'
    }

    return { success: false, error: userError }
  }
}

/**
 * 从 Boss 直聘同步指定会话的历史消息
 */
export async function syncMessages(bossId: string, limit = 50): Promise<{ success: boolean; error?: string; count?: number }> {
  const userStore = useUserStore()
  const chatStore = useChatStore()

  if (!userStore.userInfo?.uid) {
    const error = '用户未登录，无法同步消息'
    Logger.error(error)
    return { success: false, error }
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
      const error = `网络请求失败 (HTTP ${response.status})`
      Logger.error(error, { status: response.status, bossId })
      return { success: false, error }
    }

    const data = await response.json()

    if (data.code !== 0) {
      const error = data.message || '获取历史消息失败'
      Logger.error(error, { code: data.code, bossId })
      return { success: false, error }
    }

    const messages: BossMessage[] = data.zpData?.messages || []
    Logger.info(`获取到 ${messages.length} 条历史消息`)

    // 将消息添加到 Store（按时间顺序）
    let successCount = 0
    for (const msg of messages.reverse()) {
      try {
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
        successCount++
      } catch (error) {
        Logger.error(`添加消息失败: ${msg.id}`, { error: String(error) })
        // 继续处理其他消息
      }
    }

    Logger.info(`会话 ${bossId} 的历史消息同步完成`, { total: messages.length, success: successCount })
    return { success: true, count: successCount }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    Logger.error(`同步会话 ${bossId} 的历史消息失败`, { error: errorMsg })

    // 判断错误类型
    let userError = '同步消息失败'
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
      userError = '网络连接失败，请检查网络设置'
    } else if (errorMsg.includes('timeout')) {
      userError = '请求超时，请稍后重试'
    } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
      userError = '登录已过期，请重新登录 Boss 直聘'
    }

    return { success: false, error: userError }
  }
}

/**
 * 完整同步：先同步会话列表，再同步每个会话的消息
 */
export async function fullSync(messageLimit = 20): Promise<{ success: boolean; error?: string; stats?: { conversations: number; messages: number; failed: number } }> {
  try {
    Logger.info('开始完整同步...')

    // 1. 同步会话列表
    const convResult = await syncConversations()
    if (!convResult.success) {
      return { success: false, error: convResult.error }
    }

    // 2. 获取所有会话
    const chatStore = useChatStore()
    const sessions = chatStore.sessions

    if (sessions.length === 0) {
      Logger.info('没有会话需要同步')
      return { success: true, stats: { conversations: 0, messages: 0, failed: 0 } }
    }

    // 3. 同步每个会话的消息（限制并发数）
    const concurrency = 3 // 同时最多同步 3 个会话
    let totalMessages = 0
    let failedSessions = 0

    for (let i = 0; i < sessions.length; i += concurrency) {
      const batch = sessions.slice(i, i + concurrency)
      const results = await Promise.allSettled(
        batch.map(session => syncMessages(session.bossUid, messageLimit))
      )

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          totalMessages += result.value.count || 0
        } else {
          failedSessions++
          const session = batch[index]
          Logger.warn(`会话同步失败: ${session.bossName}`, {
            error: result.status === 'fulfilled' ? result.value.error : String(result.reason)
          })
        }
      })
    }

    const stats = {
      conversations: convResult.count || 0,
      messages: totalMessages,
      failed: failedSessions
    }

    Logger.info('完整同步完成', stats)
    return { success: true, stats }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    Logger.error('完整同步失败', { error: errorMsg })
    return { success: false, error: '同步过程中出现未知错误' }
  }
}
