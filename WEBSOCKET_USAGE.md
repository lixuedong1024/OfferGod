# WebSocket 聊天功能使用说明

## 概述

已实现 Boss 直聘的 WebSocket 实时聊天功能，包括：
- Protobuf 消息编码/解码
- WebSocket 连接管理（心跳、重连）
- 聊天消息存储和管理
- 实时消息接收和发送

## 文件结构

```
src/
├── assets/
│   └── chat.proto                          # Protobuf 协议定义
├── composables/
│   └── useWebSocket/
│       ├── index.ts                        # WebSocket 连接管理
│       └── protobuf.ts                     # Protobuf 消息处理
├── stores/
│   └── chat.ts                             # 聊天消息 Store
├── pages/
│   └── Inbox.vue                           # 沟通页面（已更新）
└── components/
    └── ChatWindow.vue                      # 聊天窗口（已更新）
```

## 使用方法

### 1. 连接 WebSocket

在需要使用聊天功能的地方：

```typescript
import { useWebSocket } from '@/composables/useWebSocket';

const wsClient = useWebSocket();

// 连接到 Boss 直聘 WebSocket 服务器
wsClient.connect({
  url: 'wss://chat.zhipin.com/wss',
  uid: 'YOUR_USER_ID',        // 需要从用户信息中获取
  token: 'YOUR_AUTH_TOKEN',   // 需要从用户信息中获取
});

// 检查连接状态
console.log(wsClient.isConnected.value);  // true/false
console.log(wsClient.status.value);       // 'connected' | 'connecting' | 'disconnected' | 'reconnecting'
```

### 2. 发送消息

```typescript
const success = wsClient.sendMessage({
  fromUid: 'YOUR_USER_ID',
  toUid: 'BOSS_USER_ID',
  toName: 'BOSS_ENCRYPT_UID',  // Boss 的加密 UID
  content: '你好，我对这个岗位很感兴趣',
});

if (success) {
  console.log('消息发送成功');
} else {
  console.error('消息发送失败');
}
```

### 3. 接收消息

WebSocket 接收到的消息会通过自定义事件 `offergod:chat:message` 广播：

```typescript
// 监听消息事件
window.addEventListener('offergod:chat:message', (event: CustomEvent) => {
  const messages = event.detail;
  
  messages.forEach((msg: any) => {
    console.log('收到消息:', {
      from: msg.from.uid,
      to: msg.to.uid,
      content: msg.body.text,
      time: msg.time,
    });
  });
});
```

### 4. 使用聊天 Store

```typescript
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();

// 加载会话列表
await chatStore.loadSessions();

// 创建或获取会话
const session = chatStore.getOrCreateSession({
  jobId: 'JOB_ID',
  bossUid: 'BOSS_UID',
  bossEncryptUid: 'BOSS_ENCRYPT_UID',
  bossName: 'HR 张三',
  bossAvatar: 'https://...',
  companyName: '某科技公司',
  jobTitle: '高级前端工程师',
});

// 发送消息（仅保存到本地）
await chatStore.sendMessage(session.id, '你好');

// 添加接收到的消息
await chatStore.addMessage(session.id, {
  role: 'boss',
  content: 'HR 的回复',
  time: Date.now(),
  status: 'read',
});

// 标记会话为已读
await chatStore.markSessionAsRead(session.id);

// 获取未读消息总数
console.log(chatStore.totalUnreadCount);
```

### 5. 断开连接

```typescript
wsClient.disconnect();
```

## 待完成的工作

### 1. 获取用户信息

需要从 Boss 直聘页面获取当前用户的信息：

```typescript
// 需要在 main-world.ts 中添加
const userInfo = {
  uid: window.__INITIAL_STATE__.user.uid,
  token: window.__INITIAL_STATE__.user.token,
  // ... 其他用户信息
};

// 通过 postMessage 发送到 content script
window.postMessage({ type: 'OFFERGOD_USER_INFO', userInfo }, '*');
```

### 2. 在 content.ts 中监听用户信息

```typescript
window.addEventListener('message', async (event) => {
  if (event.data.type === 'OFFERGOD_USER_INFO') {
    const userInfo = event.data.userInfo;
    
    // 保存用户信息
    await chrome.storage.local.set({ userInfo });
    
    // 自动连接 WebSocket
    const wsClient = useWebSocket();
    wsClient.connect({
      url: 'wss://chat.zhipin.com/wss',
      uid: userInfo.uid,
      token: userInfo.token,
    });
  }
});
```

### 3. 在 ChatWindow.vue 中使用真实的用户 UID

```typescript
// 替换 'USER_UID' 为真实的用户 UID
const userInfo = await chrome.storage.local.get('userInfo');
const fromUid = userInfo.userInfo?.uid || 'USER_UID';

wsClient.sendMessage({
  fromUid,
  toUid: session.value.bossUid,
  toName: session.value.bossEncryptUid,
  content,
});
```

### 4. 从岗位详情页创建会话

在 JobDetail.vue 或投递岗位时：

```typescript
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();

// 投递岗位后创建会话
const session = chatStore.getOrCreateSession({
  jobId: job.encryptJobId,
  bossUid: job.bossId,
  bossEncryptUid: job.encryptBossId,
  bossName: job.bossName,
  bossAvatar: job.bossAvatar,
  companyName: job.brandName,
  jobTitle: job.jobName,
});

// 发送打招呼语
await chatStore.sendMessage(session.id, greetingMessage);

// 通过 WebSocket 发送
wsClient.sendMessage({
  fromUid: userInfo.uid,
  toUid: job.bossId,
  toName: job.encryptBossId,
  content: greetingMessage,
});
```

## 注意事项

1. **WebSocket URL**: 确认 Boss 直聘的 WebSocket 地址是否为 `wss://chat.zhipin.com/wss`
2. **认证参数**: 需要正确的 `uid` 和 `token` 才能连接成功
3. **消息格式**: Protobuf 消息格式必须与 Boss 直聘的协议一致
4. **心跳机制**: 默认每 30 秒发送一次心跳包，保持连接活跃
5. **重连机制**: 连接断开后会自动重连，最多尝试 10 次
6. **消息持久化**: 所有消息都会保存到 Chrome Storage，刷新页面后不会丢失

## 调试

使用 Logger 查看 WebSocket 相关日志：

```typescript
import { Logger } from '@/utils/logger';

// 在调试日志页面查看
// App.vue -> 调试日志
```

关键日志：
- `正在连接 WebSocket`
- `WebSocket 连接成功`
- `收到 WebSocket 消息`
- `发送消息成功`
- `WebSocket 连接关闭`

## 测试

1. 打开 Boss 直聘网站
2. 打开 OfferGod 扩展
3. 进入"沟通"页面
4. 点击任意会话（如果有）
5. 发送测试消息
6. 查看调试日志确认消息是否发送成功

## 下一步

1. 实现用户信息获取
2. 实现自动连接 WebSocket
3. 实现从岗位详情页发送打招呼语
4. 实现消息已读状态同步
5. 实现消息撤回功能
6. 实现图片消息支持
