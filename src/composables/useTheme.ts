import { ref } from 'vue';

export type Theme = 'dark' | 'light';

const currentTheme = ref<Theme>('dark');

export function useTheme() {
  const toggleTheme = async () => {
    const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark';
    currentTheme.value = newTheme;
    applyTheme(newTheme);
    await saveTheme(newTheme);
  };

  const setTheme = async (theme: Theme) => {
    currentTheme.value = theme;
    applyTheme(theme);
    await saveTheme(theme);
  };

  const applyTheme = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const saveTheme = async (theme: Theme) => {
    try {
      await chrome.storage.local.set({ theme });
    } catch (error) {
      console.error('保存主题失败:', error);
    }
  };

  const loadTheme = async () => {
    try {
      const data = await chrome.storage.local.get(['theme']);
      const saved = data.theme as Theme;
      if (saved) {
        currentTheme.value = saved;
        applyTheme(saved);
      } else {
        applyTheme('dark');
      }
    } catch (error) {
      console.error('加载主题失败:', error);
      applyTheme('dark');
    }
  };

  return {
    currentTheme,
    toggleTheme,
    setTheme,
    loadTheme,
  };
}
