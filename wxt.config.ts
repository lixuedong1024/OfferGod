import { defineConfig } from 'wxt';
import vue from '@vitejs/plugin-vue-jsx';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'OfferGod - Offer之神',
    description: 'AI加持的智能求职神器，助你斩获心仪Offer！支持Claude、GPT等多种AI模型',
    permissions: ['storage', 'tabs', 'webRequest', 'notifications'],
    host_permissions: [
      '*://*.zhipin.com/*',
      '*://api.anthropic.com/*',
      '*://api.openai.com/*',
      '*://api.deepseek.com/*',
      '*://*/*'
    ],
    action: {
      default_title: 'OfferGod - Offer之神',
      default_popup: 'popup.html',
    },
    web_accessible_resources: [
      {
        resources: ['main-world.js'],
        matches: ['*://*.zhipin.com/*'],
      },
    ],
  },
  vite: () => ({
    plugins: [vue()],
  }),
});
