# OfferGod - Offer之神 🎯

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vue](https://img.shields.io/badge/Vue-3.5-green.svg)](https://vuejs.org/)

AI加持的智能求职神器，助你斩获心仪Offer！支持 Claude、GPT 等多种 AI 模型。

## ✨ 主要特性

### 🎨 现代化界面
- 深色/浅色主题切换
- 玻璃拟态设计风格
- 清晰的视觉层次
- 流畅的交互体验

### 🤖 多 AI 模型加持
- ✅ **Claude (Anthropic)** - 支持 Claude 3.5 Sonnet、Claude 3 Opus 等
- ✅ **OpenAI 兼容接口** - GPT-4o、GPT-4、DeepSeek 等
- 🔧 自定义 API 端点
- 🔄 灵活的模型切换

### 🚀 核心功能
- 📊 **岗位管理** - 批量抓取、智能筛选、匹配度分析
- 💬 **实时沟通** - WebSocket 实时聊天，消息即时收发
- 🤖 **AI 打招呼** - 智能生成个性化打招呼语
- 📈 **数据统计** - 投递分析、回复率统计
- 🔍 **调试日志** - 完整的日志系统，方便调试
- 🎯 **工作流编排** - 可视化配置投递流程

### 💬 WebSocket 实时聊天
- ✅ 自动获取用户信息
- ✅ 自动连接 Boss 直聘 WebSocket
- ✅ Protobuf 消息编解码
- ✅ 实时消息收发
- ✅ 聊天会话管理
- ✅ 未读消息提醒

## 📦 安装

### 前置要求
- Node.js >= 18
- pnpm >= 9

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/lixuedong1024/OfferGod.git
cd OfferGod

# 安装依赖
pnpm install

# 开发模式（Chrome）
pnpm dev

# 开发模式（Firefox）
pnpm dev:firefox

# 构建所有浏览器版本
pnpm build

# 打包为 zip
pnpm zip
```

### 加载扩展

#### Chrome/Edge
1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3` 目录

#### Firefox
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时加载附加组件"
3. 选择 `.output/firefox-mv2/manifest.json`

## 🔧 配置 AI 模型

### Claude 配置
1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 创建 API Key
3. 在设置页面添加模型，选择 "Claude (Anthropic)"
4. 填入 API Key 和选择模型版本

### OpenAI 兼容配置
1. 获取 API Key（OpenAI、DeepSeek、Kimi 等）
2. 在设置页面添加模型，选择 "OpenAI 兼容"
3. 填入完整的 API 地址和 Key

示例配置：
```
DeepSeek: https://api.deepseek.com/v1
Kimi: https://api.moonshot.cn/v1
OpenAI: https://api.openai.com/v1
```

## 🎯 使用说明

### 快速开始
1. 安装浏览器扩展
2. 访问 [Boss 直聘](https://www.zhipin.com/)
3. 点击扩展图标打开 OfferGod
4. 在设置中配置 AI 模型
5. 进入岗位页面，点击"抓取岗位"
6. 查看岗位详情，点击"立即投递"

### 功能说明

#### 岗位管理
- 自动抓取当前页面岗位
- 支持批量抓取多页
- AI 智能匹配度分析
- 岗位状态管理（待投递/已投递/已回复）

#### 实时沟通
- 自动创建聊天会话
- WebSocket 实时消息
- 消息本地持久化
- 未读消息提醒

#### AI 打招呼
- 三种语气风格（专业/友好/简洁）
- AI 智能生成
- 风险词检测
- 字数统计

## 🛠️ 技术栈

- **框架**: Vue 3 + TypeScript
- **构建**: WXT (Web Extension Tools)
- **UI**: Element Plus + 自定义 CSS
- **状态管理**: Pinia
- **实时通信**: WebSocket + Protobuf
- **AI SDK**: 
  - @anthropic-ai/sdk (Claude)
  - openai (OpenAI 兼容)

## 📁 项目结构

```
offergod/
├── src/
│   ├── assets/              # 静态资源
│   │   └── chat.proto       # Protobuf 协议定义
│   ├── components/          # Vue 组件
│   ├── composables/         # 组合式函数
│   │   ├── useModel/        # AI 模型管理
│   │   ├── useWebSocket/    # WebSocket 管理
│   │   └── useTheme.ts      # 主题管理
│   ├── entrypoints/         # 扩展入口
│   │   ├── background.ts    # 后台脚本
│   │   ├── content.ts       # 内容脚本
│   │   └── main-world.ts    # 主世界脚本
│   ├── pages/               # 页面组件
│   ├── stores/              # Pinia 状态管理
│   │   ├── chat.ts          # 聊天管理
│   │   ├── user.ts          # 用户管理
│   │   └── statistics.ts    # 统计数据
│   └── utils/               # 工具函数
├── public/                  # 公共资源
└── wxt.config.ts           # WXT 配置
```

## 📝 特色功能

### WebSocket 实时聊天
- 自动获取用户信息（UID、Token）
- 自动连接 Boss 直聘 WebSocket 服务器
- Protobuf 消息编解码
- 心跳保活机制
- 断线自动重连
- 消息状态管理

### AI 智能分析
- 岗位匹配度评分
- 技能匹配分析
- 个性化打招呼语生成
- 风险词检测

### 数据统计
- 投递成功率
- 回复率统计
- 时间趋势分析
- 活动日志记录

## ⚠️ 注意事项

- 本项目仅供学习交流使用
- 使用自动化工具存在风险（账号权重降低、封号等）
- 请合理控制投递频率
- 建议先测试 WebSocket 连接是否正常
- Boss 直聘有反调试机制，无法使用 F12 开发者工具
- 使用调试日志功能查看运行状态

## 🐛 调试

### 查看日志
1. 打开 OfferGod 扩展
2. 进入"调试日志"页面
3. 查看相关日志信息

### 常见问题

**Q: WebSocket 连接失败？**
A: 检查是否已登录 Boss 直聘，查看调试日志中的错误信息。

**Q: 消息发送失败？**
A: 确认 WebSocket 已连接，检查用户信息是否正确获取。

**Q: 岗位抓取失败？**
A: 确保在 Boss 直聘的岗位列表页面，刷新页面后重试。

## 📄 开源协议

本项目采用 MIT License 开源协议。

MIT 协议是一个宽松的开源协议，允许：
- ✅ 商业使用
- ✅ 修改代码
- ✅ 分发
- ✅ 私人使用

唯一要求：保留版权声明和许可声明。

详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 原项目灵感: [boss-helper](https://github.com/Ocyss/boos-helper)
- 愿 OfferGod 助你斩获心仪 Offer！🎉

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

- GitHub: [@lixuedong1024](https://github.com/lixuedong1024)
- 项目地址: https://github.com/lixuedong1024/OfferGod

