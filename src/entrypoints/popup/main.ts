// Popup 脚本
document.addEventListener('DOMContentLoaded', async () => {
  // 加载主题设置
  const themeData = await chrome.storage.local.get(['theme']);
  const currentTheme = themeData.theme || 'dark';
  document.body.setAttribute('data-theme', currentTheme);
  updateThemeButton(currentTheme);

  // 加载今日投递数据
  const data = await chrome.storage.local.get(['todayCount', 'engineRunning']);

  const todayCountEl = document.getElementById('todayCount');
  const engineStatusEl = document.getElementById('engineStatus');

  if (data.todayCount && todayCountEl) {
    todayCountEl.textContent = data.todayCount.toString();
  }

  if (data.engineRunning && engineStatusEl) {
    engineStatusEl.innerHTML = '<span class="pulse-dot"></span>运行中';
  } else if (engineStatusEl) {
    engineStatusEl.innerHTML = '<span class="pulse-dot" style="background: #64748b; animation: none;"></span>已暂停';
    engineStatusEl.style.color = '#94a3b8';
  }

  // 打开工作台
  const openDashboardBtn = document.getElementById('openDashboard');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.url && tab.url.includes('zhipin.com')) {
        // 在当前标签页注入内容脚本
        try {
          await chrome.tabs.sendMessage(tab.id!, { action: 'openDashboard' });
          window.close();
        } catch (error) {
          console.error('发送消息失败:', error);
          // 刷新页面重新加载 content script
          chrome.tabs.reload(tab.id!);
          window.close();
        }
      } else {
        // 打开 Boss 直聘
        chrome.tabs.create({ url: 'https://www.zhipin.com/web/geek/job' });
        window.close();
      }
    });
  }

  // 主题切换
  const toggleThemeBtn = document.getElementById('toggleTheme');
  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', async () => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      // 保存主题设置
      await chrome.storage.local.set({ theme: newTheme });

      // 更新popup主题
      document.body.setAttribute('data-theme', newTheme);
      updateThemeButton(newTheme);

      // 通知主应用切换主题
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.url.includes('zhipin.com')) {
        try {
          await chrome.tabs.sendMessage(tab.id!, {
            action: 'toggleTheme',
            theme: newTheme
          });
        } catch (error) {
          console.error('发送主题切换消息失败:', error);
        }
      }
    });
  }
});

// 更新主题按钮显示
function updateThemeButton(theme: string) {
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  if (themeIcon && themeText) {
    if (theme === 'dark') {
      // 深色模式，显示太阳图标
      themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
      themeText.textContent = '切换到浅色';
    } else {
      // 浅色模式，显示月亮图标
      themeIcon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
      themeText.textContent = '切换到深色';
    }
  }
}
