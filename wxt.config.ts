import { defineConfig } from 'wxt';
import vue from '@vitejs/plugin-vue-jsx';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'OfferGod - Offer之神',
    description: 'AI加持的智能求职神器，助你斩获心仪Offer！支持Claude、GPT等多种AI模型',
    permissions: ['storage', 'tabs', 'notifications'],
    host_permissions: [
      '*://*.zhipin.com/*',
      'https://api.anthropic.com/*',
      'https://api.openai.com/*',
      'https://api.deepseek.com/*',
      'https://*/*',
      'http://*/*'
    ],
    action: {
      default_title: 'OfferGod - Offer之神',
      default_popup: 'popup.html',
    },
    web_accessible_resources: [
      {
        resources: ['main-world.js', 'pdf.worker.min.mjs'],
        matches: ['*://*.zhipin.com/*', '<all_urls>'],
      },
    ],
  },
  vite: () => ({
    plugins: [
      vue(),
      {
        name: 'copy-pdfjs-worker',
        closeBundle() {
          try {
            const workerSrc = resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
            const workerDest = resolve(__dirname, '.output/chrome-mv3/pdf.worker.min.mjs');
            copyFileSync(workerSrc, workerDest);
            console.log('✓ PDF.js worker 文件已复制');
          } catch (error) {
            console.warn('⚠ PDF.js worker 文件复制失败:', error);
          }
        }
      }
    ],
  }),
});
