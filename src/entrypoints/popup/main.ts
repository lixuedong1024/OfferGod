// Popup 脚本
document.addEventListener('DOMContentLoaded', async () => {
  // 加载今日投递数据
  const data = await chrome.storage.local.get(['todayCount', 'engineRunning']);

  const todayCountEl = document.getElementById('todayCount');
  const engineStatusEl = document.getElementById('engineStatus');

  if (data.todayCount && todayCountEl) {
    todayCountEl.textContent = data.todayCount.toString();
  }

  if (data.engineRunning && engineStatusEl) {
    engineStatusEl.textContent = '运行中';
    engineStatusEl.style.color = '#4ade80';
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

  // 打开设置
  const openSettingsBtn = document.getElementById('openSettings');
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab.url && tab.url.includes('zhipin.com')) {
        try {
          await chrome.tabs.sendMessage(tab.id!, { action: 'openSettings' });
          window.close();
        } catch (error) {
          console.error('发送消息失败:', error);
          // 刷新页面重新加载 content script
          chrome.tabs.reload(tab.id!);
          window.close();
        }
      } else {
        alert('请先访问 Boss 直聘网站');
      }
    });
  }
});
