# OfferGod 项目实现计划

## ⚠️ 重要提示：Boss 直聘反调试机制

**Boss 直聘有严格的反调试保护**：
- ❌ 无法打开 F12 开发者工具
- ❌ 无法使用右键检查元素
- ❌ 一旦检测到调试工具，会自动关闭网页
- ❌ 控制台日志无法直接查看

**调试策略**：
1. ✅ 使用 `chrome.storage.local` 存储日志
2. ✅ 在扩展的 popup 或 options 页面查看日志
3. ✅ 使用 `chrome://extensions` 的背景页查看日志
4. ✅ 创建专门的日志查看页面 `DebugLogs.vue`
5. ✅ 使用 Logger 工具类统一管理日志
6. ✅ 在非 Boss 直聘页面测试核心逻辑

**推荐调试方案**：
```typescript
import { Logger } from '@/utils/logger';

// 使用 Logger 记录日志
Logger.info('岗位数据已保存', { count: jobs.length });
Logger.warn('数据可能不完整', { missing: ['logo', 'description'] });
Logger.error('保存失败', { error: e.message });
Logger.debug('调试信息', { state: currentState });
```

**查看日志的方法**：
1. 访问扩展内的日志页面：`chrome-extension://<id>/src/pages/DebugLogs.vue`
2. 在 App.vue 中添加"调试日志"导航链接
3. 或者在 `chrome://extensions` → OfferGod → 背景页 → Console

---

## 📋 当前问题分析

### 1. **岗位抓取问题**
- ✅ 已实现：main-world.ts 中的批量抓取逻辑
- ✅ 已实现：content.ts 中的自动抓取和消息监听
- ❌ 问题：抓取的数据没有正确保存或显示
- ❌ 问题：Jobs.vue 页面刷新后数据丢失

### 2. **沟通功能问题**
- ❌ 当前使用假数据（硬编码的模拟消息）
- ❌ 没有实现真实的 WebSocket 连接
- ❌ 没有实现 Boss 直聘聊天协议（Protobuf）
- ❌ 没有实现消息的实时同步

---

## 🎯 实现计划

### 阶段一：修复岗位抓取和持久化（优先级：🔴 高）

#### 1.1 修复岗位数据保存
**目标**：确保抓取的岗位数据正确保存到 Chrome Storage

**任务**：
- [ ] 检查 content.ts 中的数据保存逻辑
- [ ] 添加数据保存成功的日志和错误处理
- [ ] 实现数据版本控制（避免旧数据覆盖新数据）
- [ ] 添加数据去重逻辑（基于 encryptJobId）

**文件**：
- `offergod/src/entrypoints/content.ts`
- `offergod/src/entrypoints/main-world.ts`

#### 1.2 优化岗位数据加载
**目标**：Jobs 页面能正确加载和显示保存的岗位

**任务**：
- [ ] 修复 Jobs.vue 的 loadJobs 方法
- [ ] 添加加载状态指示器
- [ ] 实现数据刷新机制
- [ ] 添加数据为空时的友好提示

**文件**：
- `offergod/src/pages/Jobs.vue`

#### 1.3 增强岗位详情数据
**目标**：抓取更完整的岗位信息

**任务**：
- [ ] 扩展 JobData 接口，添加更多字段：
  - `brandLogo`: 公司 Logo
  - `brandIndustry`: 行业
  - `brandScaleName`: 公司规模
  - `postDescription`: 岗位描述
  - `skills`: 技能标签
  - `welfareList`: 福利待遇
  - `bossAvatar`: HR 头像
  - `activeTime`: 活跃时间戳
- [ ] 修改 main-world.ts 抓取逻辑，获取完整数据
- [ ] 实现岗位详情的懒加载（点击时获取完整信息）

**文件**：
- `offergod/src/utils/jobScraper.ts`
- `offergod/src/entrypoints/main-world.ts`
- `offergod/src/pages/JobDetail.vue`

---

### 阶段二：实现真实的沟通功能（优先级：🟡 中）

#### 2.1 实现 WebSocket 连接
**目标**：连接 Boss 直聘的 WebSocket 服务器

**参考**：`boss-helper-main/src/composables/useWebSocket/`

**任务**：
- [ ] 创建 `useWebSocket` composable
- [ ] 实现 WebSocket 连接逻辑
- [ ] 处理连接状态（连接中、已连接、断开、重连）
- [ ] 实现心跳机制（保持连接活跃）
- [ ] 实现断线重连逻辑

**技术要点**：
```typescript
// Boss 直聘 WebSocket 地址
const WS_URL = 'wss://chat.zhipin.com/wss';

// 连接参数
const params = {
  uid: userInfo.uid,
  token: userInfo.token,
  // ... 其他参数
};
```

**文件**：
- `offergod/src/composables/useWebSocket/index.ts`
- `offergod/src/composables/useWebSocket/handler.ts`

#### 2.2 实现 Protobuf 消息协议
**目标**：解析和构造 Boss 直聘的聊天消息

**参考**：`boss-helper-main/src/composables/useWebSocket/protobuf.ts`

**任务**：
- [ ] 复制 `chat.proto` 文件到项目
- [ ] 创建 `ChatProtobufHandler` 类
- [ ] 实现消息编码（发送消息）
- [ ] 实现消息解码（接收消息）
- [ ] 支持文本消息、图片消息等类型

**技术要点**：
```typescript
// 消息类型
enum MessageType {
  TEXT = 1,      // 文本消息
  IMAGE = 3,     // 图片消息
  VOICE = 4,     // 语音消息
  // ... 其他类型
}

// 创建文本消息
const message = handler.createTextMessage({
  tempID: Date.now(),
  from: { uid, name, avatar },
  to: { uid: bossUid, encryptUid: bossEncryptUid },
  body: { type: 1, text: '你好' },
  // ...
});
```

**文件**：
- `offergod/src/composables/useWebSocket/protobuf.ts`
- `offergod/src/assets/chat.proto`

#### 2.3 实现聊天消息管理
**目标**：管理聊天消息的存储和同步

**任务**：
- [ ] 创建 `useChatStore` Pinia store
- [ ] 实现消息列表管理（按会话分组）
- [ ] 实现消息持久化（Chrome Storage）
- [ ] 实现未读消息计数
- [ ] 实现消息状态管理（发送中、已发送、已读）

**数据结构**：
```typescript
interface ChatSession {
  jobId: string;
  bossUid: string;
  bossName: string;
  bossAvatar: string;
  companyName: string;
  jobTitle: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'boss';
  content: string;
  time: number;
  status: 'sending' | 'sent' | 'read' | 'failed';
}
```

**文件**：
- `offergod/src/stores/chat.ts`

#### 2.4 更新 Inbox 和 ChatWindow 组件
**目标**：使用真实数据替换假数据

**任务**：
- [ ] 修改 Inbox.vue，从 chatStore 加载真实消息
- [ ] 修改 ChatWindow.vue，实现真实的消息发送
- [ ] 实现消息实时接收和显示
- [ ] 添加消息发送失败重试机制
- [ ] 实现消息已读状态同步

**文件**：
- `offergod/src/pages/Inbox.vue`
- `offergod/src/components/ChatWindow.vue`

---

### 阶段三：实现 AI 功能（优先级：🟢 中低）

#### 3.1 AI 打招呼语生成
**目标**：使用 AI 模型生成个性化的打招呼语

**任务**：
- [ ] 集成现有的 AI 模型系统（useModel）
- [ ] 实现打招呼语生成 prompt 模板
- [ ] 支持多种语气风格（正式、友好、极简）
- [ ] 实现风险词检测
- [ ] 添加生成历史记录

**Prompt 模板**：
```typescript
const prompt = `
你是一个求职助手，帮助求职者生成专业的打招呼语。

岗位信息：
- 岗位名称：${job.title}
- 公司名称：${job.company}
- HR 姓名：${job.hr.name}
- 技能要求：${job.skills.join('、')}

求职者信息：
- 工作经验：${resume.experience}
- 技能特长：${resume.skills.join('、')}

要求：
1. 语气${tone === 'professional' ? '正式专业' : tone === 'friendly' ? '友好亲切' : '简洁直接'}
2. 字数控制在 100 字以内
3. 突出匹配度和优势
4. 避免使用"保证"、"一定"等绝对化词汇

请生成一条打招呼语：
`;
```

**文件**：
- `offergod/src/pages/JobDetail.vue`
- `offergod/src/composables/useAIGreeting.ts`

#### 3.2 AI 岗位匹配分析
**目标**：分析岗位与简历的匹配度

**任务**：
- [ ] 实现简历信息管理
- [ ] 实现岗位匹配度计算
- [ ] 生成匹配项和需补充项
- [ ] 生成投递建议

**文件**：
- `offergod/src/composables/useAIMatch.ts`
- `offergod/src/pages/JobDetail.vue`

---

### 阶段四：实现自动投递功能（优先级：🟢 低）

#### 4.1 投递流程管理
**目标**：实现自动化的岗位投递

**参考**：`boss-helper-main/src/composables/useApplying/`

**任务**：
- [ ] 创建投递管道（Pipeline）系统
- [ ] 实现投递前的筛选规则
- [ ] 实现投递限流（避免被封号）
- [ ] 实现投递状态跟踪
- [ ] 实现投递失败重试

**筛选规则**：
- 薪资范围筛选
- 公司规模筛选
- 工作地点筛选
- 已沟通过滤
- 相同公司/HR 过滤
- 猎头过滤

**文件**：
- `offergod/src/composables/useApplying/index.ts`
- `offergod/src/composables/useApplying/handlers.ts`

#### 4.2 投递策略配置
**目标**：让用户配置投递策略

**任务**：
- [ ] 实现投递时机选择（立即/定时/智能）
- [ ] 实现每日投递上限
- [ ] 实现投递间隔控制（拟人化）
- [ ] 实现 HR 在线状态检测

**文件**：
- `offergod/src/pages/Settings.vue`
- `offergod/src/stores/config.ts`

---

### 阶段五：数据统计和可视化（优先级：🟢 低）

#### 5.1 统计数据收集
**目标**：收集投递和沟通数据

**任务**：
- [ ] 实现投递统计（总数、成功率、回复率）
- [ ] 实现沟通统计（消息数、响应时间）
- [ ] 实现时间序列数据（按日期统计）
- [ ] 实现公司/行业分布统计

**文件**：
- `offergod/src/stores/statistics.ts`
- `offergod/src/utils/statsHelper.ts`

#### 5.2 数据可视化
**目标**：在 Analytics 页面展示统计数据

**任务**：
- [ ] 实现投递漏斗图
- [ ] 实现时间趋势图
- [ ] 实现回复率分析
- [ ] 实现热力图（投递时间分布）

**文件**：
- `offergod/src/pages/Analytics.vue`

---

## 🔧 技术要点

### 1. Chrome Extension 架构
```
┌─────────────────┐
│   Popup (UI)    │ ← 用户交互入口
└────────┬────────┘
         │
┌────────▼────────┐
│  Background     │ ← 后台服务（消息中转）
└────────┬────────┘
         │
┌────────▼────────┐
│  Content Script │ ← 注入到页面，访问 DOM
└────────┬────────┘
         │
┌────────▼────────┐
│  Main World     │ ← 访问页面 Vue 实例
└─────────────────┘
```

### 2. 数据流
```
Boss 直聘页面
    ↓ (抓取)
Main World Script
    ↓ (postMessage)
Content Script
    ↓ (chrome.storage)
Chrome Storage
    ↓ (读取)
Vue App (Jobs.vue)
```

### 3. WebSocket 消息流
```
Boss 直聘 WebSocket 服务器
    ↓↑ (Protobuf)
WebSocket Handler
    ↓↑ (解码/编码)
Chat Store
    ↓↑ (读写)
ChatWindow.vue
```

---

## 📅 实施时间线

### Week 1: 修复核心功能
- Day 1-2: 修复岗位抓取和保存
- Day 3-4: 优化岗位数据加载和显示
- Day 5: 增强岗位详情数据

### Week 2: 实现沟通功能
- Day 1-2: 实现 WebSocket 连接
- Day 3-4: 实现 Protobuf 消息协议
- Day 5: 实现聊天消息管理

### Week 3: 完善功能
- Day 1-2: 更新 Inbox 和 ChatWindow
- Day 3-4: 实现 AI 功能
- Day 5: 测试和优化

### Week 4: 高级功能
- Day 1-3: 实现自动投递
- Day 4-5: 实现数据统计和可视化

---

## 🎯 立即行动项（本次会话）

### 优先级 1：修复岗位抓取保存
1. ✅ 检查 content.ts 的数据保存逻辑
2. ✅ 添加详细的日志输出
3. ✅ 测试数据是否正确保存到 Chrome Storage

### 优先级 2：修复 Jobs 页面加载
1. ✅ 修复 loadJobs 方法
2. ✅ 添加数据刷新按钮
3. ✅ 测试页面刷新后数据是否保留

### 优先级 3：准备沟通功能基础
1. 创建 useWebSocket composable 骨架
2. 创建 useChatStore
3. 准备 Protobuf 相关文件

---

## 📝 注意事项

1. **数据安全**：
   - 不要在代码中硬编码敏感信息
   - 使用 Chrome Storage 加密存储用户凭证
   - 实现数据导出/导入功能

2. **性能优化**：
   - 使用虚拟滚动处理大量岗位数据
   - 实现岗位详情的懒加载
   - 使用 IndexedDB 存储大量聊天记录

3. **用户体验**：
   - 添加加载状态指示器
   - 实现友好的错误提示
   - 提供操作撤销功能

4. **合规性**：
   - 遵守 Boss 直聘的使用条款
   - 实现合理的请求频率限制
   - 添加用户协议和隐私政策

---

## 🔗 参考资源

- **Boss Helper 开源项目**：`boss-helper-main/`
- **设计原型**：`design/`
- **配色方案标准**：`配色方案标准文档.md`
- **Chrome Extension 文档**：https://developer.chrome.com/docs/extensions/
- **Protobuf.js 文档**：https://github.com/protobufjs/protobuf.js

---

*最后更新：2026-04-28*
