@echo off
chcp 65001 >nul

echo ========================================
echo   OfferGod - Offer之神
echo   AI智能求职助手
echo ========================================
echo.

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [1/3] 安装 pnpm...
    call npm install -g pnpm
) else (
    echo [1/3] pnpm 已安装
)

echo.
echo [2/3] 安装项目依赖...
call pnpm install

echo.
echo [3/3] 启动开发服务器...
echo.
echo 提示：
echo   - 开发服务器启动后，打开 chrome://extensions/
echo   - 开启"开发者模式"
echo   - 加载 .output/chrome-mv3 目录
echo.

call pnpm dev

pause
