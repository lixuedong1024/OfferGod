# 岗位描述获取问题修复

## 问题描述
在岗位详情页面中，岗位描述字段 `postDescription` 无法获取，显示"暂无描述"。

## 问题原因
1. 在岗位列表页抓取数据时，只能获取到基础信息（岗位名称、公司、薪资等）
2. 详细的岗位描述（JD）需要进入岗位详情页才能获取
3. 原有代码没有实现从详情页获取岗位描述的功能

## 解决方案

### 1. 添加岗位详情获取函数 (`main-world.ts`)
```typescript
// 获取当前岗位详情页的描述信息
function getJobDetailDescription(): string {
  // 方法1: 从 Vue 实例获取
  // 方法2: 从 DOM 获取
  // 方法3: 从 __INITIAL_STATE__ 获取
}
```

### 2. 自动监听 URL 变化 (`main-world.ts`)
当用户进入岗位详情页时（URL 包含 `/job_detail/`），自动获取岗位描述并发送到 content script。

```typescript
// 监听 URL 变化，自动获取岗位详情
const urlObserver = new MutationObserver(() => {
  if (currentUrl.includes('/job_detail/')) {
    const description = getJobDetailDescription();
    // 发送到 content script
  }
});
```

### 3. 处理岗位详情消息 (`content.ts`)
接收来自 main-world 的岗位描述数据，更新到 storage 中。

```typescript
// 处理岗位详情数据
if (event.data.type === 'OFFERGOD_JOB_DETAIL_RESULT') {
  const { jobId, description } = event.data;
  // 更新岗位数据
}
```

### 4. 主动请求岗位描述 (`JobDetail.vue`)
在加载岗位详情时，如果发现 `postDescription` 为空，主动发送消息请求获取。

```typescript
// 如果没有岗位描述，尝试从当前页面获取
if (!jobData.postDescription || jobData.postDescription.trim() === '') {
  window.postMessage({
    type: 'OFFERGOD_GET_JOB_DETAIL',
    jobId: props.jobId
  }, '*');
}
```

## 修改的文件
1. `src/entrypoints/main-world.ts` - 添加岗位描述获取和 URL 监听
2. `src/entrypoints/content.ts` - 添加岗位详情消息处理
3. `src/pages/JobDetail.vue` - 添加主动请求岗位描述逻辑

## 工作流程
1. 用户在 Boss 直聘浏览岗位列表
2. 插件自动抓取列表页的基础信息
3. 用户点击查看岗位详情时：
   - URL 监听器检测到进入详情页
   - 自动从页面获取岗位描述
   - 更新到 storage 中
4. 用户在插件中查看岗位详情时：
   - 如果已有描述，直接显示
   - 如果没有描述，主动请求获取
   - 等待 2 秒后重新加载数据

## 测试步骤
1. 重新加载插件
2. 在 Boss 直聘浏览岗位
3. 点击进入岗位详情页
4. 打开插件，查看岗位详情
5. 验证岗位描述是否正确显示

## 注意事项
- 岗位描述获取依赖于 Boss 直聘页面结构，如果页面结构变化可能需要更新选择器
- 使用了多种方法（Vue 实例、DOM、__INITIAL_STATE__）来提高获取成功率
- 自动获取和主动请求双重保障，确保描述能够被获取
