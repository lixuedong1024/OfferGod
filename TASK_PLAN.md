# OfferGod 开发任务计划

## 🎯 任务优先级说明

- 🔴 **P0 - 紧急**: 影响核心功能，需立即处理
- 🟠 **P1 - 高**: 重要功能，近期完成
- 🟡 **P2 - 中**: 增强功能，计划完成
- 🟢 **P3 - 低**: 优化项，有时间再做

---

## 📋 待完成任务列表

### 🔴 P0 - 紧急任务

#### 1. 数据安全增强
**预计时间**: 2-3 小时  
**描述**: 
- [ ] API Key 加密存储（使用 Web Crypto API）
- [ ] 敏感数据加密
- [ ] 添加数据备份功能
- [ ] 添加数据恢复功能

**技术方案**:
```typescript
// 使用 Web Crypto API 加密
async function encryptData(data: string, key: string): Promise<string> {
  // AES-GCM 加密实现
}

// 数据备份
async function backupData() {
  const data = {
    jobs: await chrome.storage.local.get('jobs'),
    chats: await chrome.storage.local.get('chatSessions'),
    config: await chrome.storage.local.get('deliveryConfig'),
    // ...
  };
  // 导出为 JSON 文件
}
```

**文件**:
- `src/utils/crypto.ts` (新建)
- `src/composables/useBackup.ts` (新建)
- `src/pages/Settings.vue` (修改)

---

### 🟠 P1 - 高优先级任务

#### 2. 历史记录功能
**预计时间**: 3-4 小时  
**描述**:
- [ ] 投递历史记录存储
- [ ] 历史记录查询界面
- [ ] 按时间/状态筛选
- [ ] 历史数据统计
- [ ] 历史记录导出

**技术方案**:
```typescript
interface DeliveryHistory {
  id: string;
  jobId: string;
  jobName: string;
  companyName: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  greeting: string;
  timestamp: number;
}

// 存储结构
{
  deliveryHistory: DeliveryHistory[]
}
```

**文件**:
- `src/stores/deliveryHistory.ts` (新建)
- `src/pages/DeliveryHistory.vue` (新建)
- `src/pages/AutoDelivery.vue` (修改)

---

#### 3. 面试日程功能
**预计时间**: 4-5 小时  
**描述**:
- [ ] 面试日程数据结构设计
- [ ] 日历视图组件
- [ ] 添加/编辑/删除面试
- [ ] 面试提醒（Chrome Notifications）
- [ ] 面试状态管理

**技术方案**:
```typescript
interface Interview {
  id: string;
  jobId: string;
  jobName: string;
  companyName: string;
  type: 'phone' | 'video' | 'onsite';
  datetime: number;
  location?: string;
  contact?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  reminder: boolean;
  reminderTime: number; // 提前多少分钟提醒
}
```

**文件**:
- `src/stores/interview.ts` (新建)
- `src/pages/Calendar.vue` (新建)
- `src/components/InterviewCard.vue` (新建)
- `src/App.vue` (修改路由)

---

#### 4. 性能优化 - 虚拟滚动
**预计时间**: 2-3 小时  
**描述**:
- [ ] 岗位列表虚拟滚动
- [ ] 聊天消息虚拟滚动
- [ ] 日志列表虚拟滚动

**技术方案**:
使用 `@vueuse/core` 的 `useVirtualList`

```typescript
import { useVirtualList } from '@vueuse/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  jobs,
  { itemHeight: 120 }
)
```

**文件**:
- `src/pages/Jobs.vue` (修改)
- `src/components/ChatWindow.vue` (修改)
- `src/pages/DebugLogs.vue` (修改)

---

### 🟡 P2 - 中优先级任务

#### 5. 批量操作功能
**预计时间**: 3-4 小时  
**描述**:
- [ ] 岗位批量选择
- [ ] 批量投递
- [ ] 批量标记状态
- [ ] 批量删除
- [ ] 批量导出

**技术方案**:
```typescript
// 添加选择状态
const selectedJobs = ref<Set<string>>(new Set());

// 批量操作
async function batchDeliver(jobIds: string[]) {
  for (const jobId of jobIds) {
    await deliverJob(jobId);
    await delay(randomDelay());
  }
}
```

**文件**:
- `src/pages/Jobs.vue` (修改)
- `src/composables/useBatchOperation.ts` (新建)

---

#### 6. 打招呼语模板管理
**预计时间**: 2-3 小时  
**描述**:
- [ ] 模板列表管理
- [ ] 添加/编辑/删除模板
- [ ] 模板变量支持（{jobTitle}, {company} 等）
- [ ] 模板分类
- [ ] 快速应用模板

**技术方案**:
```typescript
interface GreetingTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[]; // ['jobTitle', 'company', 'experience']
  createdAt: number;
}
```

**文件**:
- `src/stores/greetingTemplate.ts` (新建)
- `src/pages/TemplateManager.vue` (新建)
- `src/components/TemplateSelector.vue` (新建)

---

#### 7. 公司/岗位黑名单
**预计时间**: 2 小时  
**描述**:
- [ ] 黑名单数据结构
- [ ] 添加到黑名单
- [ ] 黑名单管理界面
- [ ] 自动过滤黑名单岗位

**技术方案**:
```typescript
interface Blacklist {
  companies: string[]; // 公司名称
  keywords: string[];  // 岗位关键词
  jobIds: string[];    // 具体岗位 ID
}

// 过滤逻辑
function filterBlacklist(jobs: Job[], blacklist: Blacklist): Job[] {
  return jobs.filter(job => {
    if (blacklist.companies.includes(job.companyName)) return false;
    if (blacklist.jobIds.includes(job.encryptJobId)) return false;
    if (blacklist.keywords.some(kw => job.jobName.includes(kw))) return false;
    return true;
  });
}
```

**文件**:
- `src/stores/blacklist.ts` (新建)
- `src/pages/Settings.vue` (修改)
- `src/composables/useJobFilter.ts` (修改)

---

#### 8. 简历偏好编辑
**预计时间**: 2 小时  
**描述**:
- [ ] 期望薪资编辑
- [ ] 期望地点编辑
- [ ] 期望职位编辑
- [ ] 求职状态设置

**文件**:
- `src/components/ResumeProfileCard.vue` (修改)
- `src/pages/ResumeEditor.vue` (新建)

---

### 🟢 P3 - 低优先级任务

#### 9. 工作流编排功能完善
**预计时间**: 8-10 小时  
**描述**:
- [ ] 节点拖拽功能
- [ ] 节点连接逻辑
- [ ] 工作流保存/加载
- [ ] 工作流执行引擎
- [ ] 预设模板

**技术方案**:
使用 `@vue-flow/core` 或自己实现简单的流程图编辑器

**文件**:
- `src/pages/Workflow.vue` (重构)
- `src/composables/useWorkflow.ts` (新建)
- `src/utils/workflowEngine.ts` (新建)

---

#### 10. OpenAI Stream 输出支持
**预计时间**: 2 小时  
**描述**:
- [ ] 实现流式输出
- [ ] 实时显示生成内容
- [ ] 停止生成功能

**文件**:
- `src/composables/useModel/openai.ts` (修改)

---

#### 11. 沟通页面筛选功能
**预计时间**: 1 小时  
**描述**:
- [ ] 实现筛选逻辑
- [ ] 按状态筛选会话

**文件**:
- `src/pages/Inbox.vue` (修改)

---

#### 12. 导出求职报告
**预计时间**: 3-4 小时  
**描述**:
- [ ] 生成 PDF 报告
- [ ] 生成 Excel 报告
- [ ] 报告内容设计（统计数据、图表等）

**技术方案**:
使用 `jspdf` 和 `xlsx` 库

**文件**:
- `src/composables/useReportExport.ts` (新建)
- `src/pages/Analytics.vue` (修改)

---

#### 13. 单元测试
**预计时间**: 10+ 小时  
**描述**:
- [ ] 配置测试环境（Vitest）
- [ ] 工具函数测试
- [ ] Composables 测试
- [ ] Store 测试
- [ ] 组件测试

**文件**:
- `vitest.config.ts` (新建)
- `tests/` (新建目录)

---

#### 14. 图片懒加载
**预计时间**: 1 小时  
**描述**:
- [ ] 公司 logo 懒加载
- [ ] 用户头像懒加载

**技术方案**:
使用 `@vueuse/core` 的 `useIntersectionObserver`

**文件**:
- `src/components/JobCard.vue` (修改)

---

#### 15. 快捷键支持
**预计时间**: 2 小时  
**描述**:
- [ ] 定义快捷键映射
- [ ] 实现快捷键监听
- [ ] 快捷键帮助文档

**快捷键设计**:
- `Ctrl/Cmd + K`: 快速搜索
- `Ctrl/Cmd + N`: 新建/刷新
- `Ctrl/Cmd + S`: 保存
- `Esc`: 关闭弹窗

**文件**:
- `src/composables/useKeyboard.ts` (新建)
- `src/App.vue` (修改)

---

## 📅 开发时间线

### 第一周
- [x] 用户信息问题修复
- [ ] 数据安全增强 (P0-1)
- [ ] 历史记录功能 (P1-2)

### 第二周
- [ ] 面试日程功能 (P1-3)
- [ ] 性能优化 - 虚拟滚动 (P1-4)
- [ ] 批量操作功能 (P2-5)

### 第三周
- [ ] 打招呼语模板管理 (P2-6)
- [ ] 公司/岗位黑名单 (P2-7)
- [ ] 简历偏好编辑 (P2-8)

### 第四周
- [ ] 沟通页面筛选 (P3-11)
- [ ] 图片懒加载 (P3-14)
- [ ] 快捷键支持 (P3-15)
- [ ] OpenAI Stream 输出 (P3-10)

### 后续计划
- [ ] 工作流编排完善 (P3-9)
- [ ] 导出求职报告 (P3-12)
- [ ] 单元测试 (P3-13)

---

## 🎯 里程碑

### v1.1.0 - 核心功能完善
- ✅ 自动投递系统
- ✅ 实时通信
- ✅ AI 功能
- [ ] 数据安全
- [ ] 历史记录
- [ ] 面试日程

**目标日期**: 2周内

### v1.2.0 - 用户体验优化
- [ ] 性能优化
- [ ] 批量操作
- [ ] 模板管理
- [ ] 黑名单功能

**目标日期**: 4周内

### v1.3.0 - 高级功能
- [ ] 工作流编排
- [ ] 报告导出
- [ ] 更多优化

**目标日期**: 8周内

### v2.0.0 - 平台扩展
- [ ] 支持更多招聘平台
- [ ] 移动端适配
- [ ] 数据分析增强

**目标日期**: 待定

---

## 📝 开发规范

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 Vue 3 Composition API 最佳实践
- 组件单一职责原则
- 函数命名清晰，注释完整

### 提交规范
```
feat: 新功能
fix: 修复 bug
refactor: 重构
perf: 性能优化
docs: 文档更新
style: 代码格式
test: 测试相关
chore: 构建/工具相关
```

### 测试要求
- 核心功能必须有单元测试
- 关键路径必须有集成测试
- 测试覆盖率目标 > 70%

---

## 🤝 协作建议

1. **任务认领**: 在开始任务前，在任务列表中标记认领
2. **进度更新**: 每天更新任务进度
3. **代码审查**: 重要功能需要代码审查
4. **文档同步**: 功能完成后及时更新文档

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 项目讨论区
