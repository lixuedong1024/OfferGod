import { ref } from 'vue';

export type Theme = 'dark' | 'light';

const currentTheme = ref<Theme>('dark');

export function useTheme() {
  const toggleTheme = () => {
    currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme.value);
    saveTheme(currentTheme.value);
  };

  const setTheme = (theme: Theme) => {
    currentTheme.value = theme;
    applyTheme(theme);
    saveTheme(theme);
  };

  const applyTheme = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const saveTheme = (theme: Theme) => {
    localStorage.setItem('offergod-theme', theme);
  };

  const loadTheme = () => {
    const saved = localStorage.getItem('offergod-theme') as Theme;
    if (saved) {
      currentTheme.value = saved;
      applyTheme(saved);
    } else {
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
