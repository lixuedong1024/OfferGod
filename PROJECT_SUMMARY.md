# OfferGod - Offer之神 🎯

## 🎉 项目完成！

**OfferGod（Offer之神）** - AI加持的智能求职神器，助你斩获心仪Offer！

## ✨ 核心特性

### 1. 多 AI 模型加持 ⭐⭐⭐⭐⭐
- ✅ **Claude (Anthropic)** - 原生支持，中文理解优秀
- ✅ **OpenAI 兼容** - GPT、DeepSeek、Kimi 等
- ✅ 灵活配置，自由切换

### 2. 现代化界面 ⭐⭐⭐⭐⭐
- 🎨 深色主题，专业高效
- 📊 数据可视化，一目了然
- 🎯 工作流编排，直观易用

### 3. 智能求职 ⭐⭐⭐⭐⭐
- 🤖 AI 智能筛选岗位
- 📝 自动生成打招呼语
- 🚀 批量投递简历
- 📈 实时数据统计

## 🚀 快速开始

### 安装运行

**Windows:**
```bash
cd offergod
start.bat
```

**Linux/Mac:**
```bash
cd offergod
chmod +x start.sh
./start.sh
```

### 加载到浏览器

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3` 目录

## 🎯 神之加持模式

### 保守模式 - 稳扎稳打
- 每日 ≤ 40 次操作
- 间隔 5-10 分钟
- 匹配度 ≥ 85%
- 适合：新手、谨慎型

### 平衡模式 - 推荐 ⭐
- 每日 ≤ 80 次操作
- 间隔 2-5 分钟
- 匹配度 ≥ 75%
- 适合：大多数用户

### 激进模式 - 全力冲刺
- 每日 ≤ 150 次操作
- 间隔 30-90 秒
- 匹配度 ≥ 65%
- 适合：紧急求职

## 📝 配置 AI 模型

### Claude（推荐）

Claude 在中文理解和对话生成方面表现优异：

1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 创建 API Key
3. 在 OfferGod 设置页面添加模型
4. 选择 "Claude (Anthropic)"
5. 填入配置并保存

**推荐模型：**
- **Claude 3.5 Sonnet** - 最佳性价比
- **Claude 3 Opus** - 最强能力
- **Claude 3 Haiku** - 最快速度

### OpenAI 兼容

支持所有 OpenAI 兼容接口：
- OpenAI 官方
- DeepSeek（国内推荐）
- Kimi（月之暗面）
- 智谱 AI

## 📁 项目结构

```
offergod/
├── src/
│   ├── App.vue                    # 主应用
│   ├── pages/                     # 页面组件
│   │   ├── Dashboard.vue          # 工作台
│   │   ├── Jobs.vue               # 岗位列表
│   │   ├── Workflow.vue           # 工作流
│   │   └── Settings.vue           # 设置
│   ├── composables/useModel/      # AI 模型
│   │   ├── claude.ts              # ⭐ Claude 实现
│   │   ├── openai.ts              # OpenAI 实现
│   │   └── index.ts               # 统一管理
│   └── assets/styles.css          # 现代化样式
├── README.md                      # 项目说明
├── GUIDE.md                       # 使用指南
└── start.bat / start.sh           # 快速启动
```

## 🎨 界面预览

### 工作台
- 实时活动监控
- KPI 数据展示
- 风控状态预警
- AI 模型状态

### 岗位列表
- 智能匹配评分
- 状态分类筛选
- 一键批量投递

### 工作流
- 可视化编排
- 节点拖拽配置
- 实时运行状态

### 设置
- AI 模型管理
- 筛选条件配置
- 自动化参数调整

## 💡 使用技巧

### 1. 优化 AI 提示词

```
你是求职之神的智能助手。请分析以下岗位：

候选人：{{experience}}年{{position}}经验
期望：{{salary}} | {{location}}

岗位：{{job_title}} @ {{company}}
要求：{{requirements}}

评分维度：
1. 技能匹配 (0-100)
2. 薪资匹配 (0-100)
3. 发展前景 (0-100)

给出综合评分和投递建议。
```

### 2. 监控风控状态

- 今日操作数不超限
- 平均间隔保持合理
- 异常次数为 0
- 风险等级：低

### 3. 个性化打招呼

```
您好！我是一名{{experience}}年经验的{{position}}。
看到贵公司{{job_title}}岗位，对{{highlight}}特别感兴趣。
我在{{skill}}方面有丰富实践，期待详聊！
```

## ⚠️ 注意事项

1. **合理使用**
   - 建议使用保守或平衡模式
   - 避免短时间大量操作
   - 定期暂停，模拟人工行为

2. **API 成本**
   - Claude API 按 token 计费
   - 建议设置每日上限
   - 监控使用量

3. **账号安全**
   - 自动化工具存在风险
   - 可能导致权重降低或封号
   - 本项目不承担任何责任

## 🔮 未来规划

### v1.1.0
- [ ] 多账号管理
- [ ] 更多 AI 模型
- [ ] 高级数据分析

### v1.2.0
- [ ] 移动端适配
- [ ] 云端配置同步
- [ ] 团队协作功能

### v2.0.0
- [ ] 完整工作流引擎
- [ ] 插件系统
- [ ] 企业版功能

## 🙏 致谢

- **Boss Helper** - 提供核心功能基础
- **Anthropic** - 提供强大的 Claude API
- **开源社区** - 提供优秀的工具和库

---

**愿 OfferGod 助你斩获心仪 Offer！** 🎉🎯

**Offer之神保佑，Offer多多！** 💼✨
