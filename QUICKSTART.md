# OfferGod 快速启动指南

## 方式一：手动启动（推荐）

打开 PowerShell 或 CMD，执行以下命令：

```bash
# 1. 进入项目目录
cd offergod

# 2. 安装 pnpm（如果没有）
npm install -g pnpm

# 3. 安装依赖
pnpm install

# 4. 启动开发服务器
pnpm dev
```

## 方式二：使用 npm

如果 pnpm 有问题，可以使用 npm：

```bash
cd offergod
npm install
npm run dev
```

## 加载到浏览器

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目目录下的 `.output/chrome-mv3` 文件夹

## 常见问题

### Q: pnpm 命令不存在？
A: 运行 `npm install -g pnpm` 安装

### Q: 依赖安装失败？
A: 尝试删除 `node_modules` 和 `pnpm-lock.yaml`，重新运行 `pnpm install`

### Q: 构建失败？
A: 检查 Node.js 版本是否 >= 18

## 开发命令

```bash
pnpm dev          # Chrome 开发模式
pnpm dev:firefox  # Firefox 开发模式
pnpm dev:edge     # Edge 开发模式
pnpm build        # 构建生产版本
```

## 下一步

启动成功后，访问 Boss 直聘网站，点击浏览器扩展图标即可使用 OfferGod！
