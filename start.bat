@echo off
chcp 65001 >nul
echo OfferGod - Offer之神 启动脚本
echo ==================================
echo.

REM 检查 pnpm 是否安装
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo pnpm 未安装，正在安装...
    npm install -g pnpm
)

echo 安装依赖...
call pnpm install

echo.
echo 安装完成！
echo.
echo 可用命令：
echo   pnpm dev          - 开发模式（Chrome）
echo   pnpm dev:firefox  - 开发模式（Firefox）
echo   pnpm dev:edge     - 开发模式（Edge）
echo   pnpm build        - 构建所有浏览器版本
echo.
echo 现在运行: pnpm dev
echo.

call pnpm dev
