# OfferGod 设置页面优化

## 新增功能

### 1. 配置管理系统 (`useConfig`)
- 统一的配置存储和管理
- 支持配置的保存、加载、导入、导出
- 使用 Chrome Storage API 持久化配置

### 2. 搜索条件配置页面 (`SearchConfig.vue`)
参考设计原型 `design/pages/search-config.jsx` 实现：

#### 抓取规则配置
- **职位关键词**：支持添加/删除多个关键词，使用芯片（chip）样式展示
- **排除关键词**：支持排除不想要的关键词，红色警告样式
- **城市和区域**：支持选择城市和多个区域
- **经验和学历**：下拉选择框配置
- **薪资范围**：双向滑块选择，实时显示范围（如 15K - 25K）

#### 简历画像功能
- **简历上传**：支持 PDF 格式简历上传
- **AI 标签提取**：自动解析简历并提取技能标签
- **求职偏好**：展示和编辑求职偏好描述
- **文件信息**：显示文件名、大小、上传日期

#### AI 评分阈值
- **可视化圆环图**：展示当前阈值设置
- **滑块调整**：支持 0-100 的阈值调整
- **自动投递规则**：匹配度 ≥ 阈值自动投递，低于阈值保留待确认

### 3. 优化的设置页面 (`Settings.vue`)
参考 `boss-helper` 的实现：

#### AI 模型配置
- 支持添加多个 AI 模型（Claude、OpenAI 兼容）
- 配置 API Key、模型参数（temperature、max_tokens）
- 模型列表展示和管理

#### 系统配置
- 通知提醒开关
- 自动刷新开关
- 每日投递上限设置
- 配置导入/导出功能

### 4. 新增组件

#### `SearchConfigCard.vue`
- 搜索条件配置卡片
- 关键词芯片输入
- 薪资范围滑块

#### `ResumeProfileCard.vue`
- 简历上传和管理
- AI 标签展示
- 求职偏好编辑

#### `AIScoreCard.vue`
- AI 评分阈值配置
- 圆环图可视化
- 滑块调整

## 技术实现

### 状态管理
```typescript
// useConfig store
- config: AppConfig (搜索配置、简历、AI评分等)
- loadConfig(): 从 Chrome Storage 加载
- saveConfig(): 保存到 Chrome Storage
- exportConfig(): 导出为 JSON 文件
- importConfig(): 从 JSON 文件导入
```

### 样式设计
- 使用现有的设计系统（`styles.css`）
- 深色主题，青绿色强调色
- 卡片式布局，响应式网格
- 芯片、标签、滑块等交互组件

### 数据持久化
- 使用 `chrome.storage.local` API
- 配置键：`offergod_config`
- 支持跨会话保存

## 使用方法

1. 点击侧边栏"搜索条件"进入配置页面
2. 配置职位关键词、排除关键词、城市等筛选条件
3. 上传简历，AI 自动提取标签和偏好
4. 调整 AI 评分阈值（建议 75 分）
5. 点击"保存并启用"应用配置
6. 可以导出配置备份，或导入已有配置

## 文件结构

```
offergod/
├── src/
│   ├── composables/
│   │   └── useConfig/
│   │       └── index.ts          # 配置管理 store
│   ├── components/
│   │   ├── SearchConfigCard.vue  # 搜索条件配置
│   │   ├── ResumeProfileCard.vue # 简历画像
│   │   └── AIScoreCard.vue       # AI评分阈值
│   └── pages/
│       ├── SearchConfig.vue      # 搜索条件页面
│       └── Settings.vue          # 设置页面（优化）
```

## 参考资料

- 设计原型：`design/pages/search-config.jsx`
- 参考实现：`boss-helper-main/src/pages/zhipin/components/`
- Element Plus 组件库：用于表单控件

## 后续优化建议

1. 实现真实的简历解析 API
2. 添加更多筛选条件（公司规模、融资阶段等）
3. 支持多个简历配置文件
4. 添加配置模板功能
5. 实现配置版本管理
6. 添加配置预览功能
7. 支持批量导入关键词
