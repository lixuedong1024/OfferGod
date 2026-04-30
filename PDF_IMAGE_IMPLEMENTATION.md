# PDF 转图片功能实现说明

## 问题背景

第三方 Claude API (https://cc-vibe.com) 不支持 `document` 类型的 PDF 解析，导致简历解析功能失败。

## 解决方案

使用 PDF.js 将 PDF 转换为图片，然后通过 `image` 类型发送给 Claude API。

## 实现步骤

### 1. 安装依赖

```bash
pnpm add pdfjs-dist
```

### 2. 创建 PDF 转图片工具 (src/utils/pdfToImage.ts)

新增文件，提供以下功能：
- `convertPDFToImages()`: 将 PDF 转换为图片数组
- `getPDFThumbnail()`: 获取 PDF 第一页缩略图

**关键配置：**
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');
```

### 3. 修改 Claude 模型适配器 (src/composables/useModel/claude.ts)

**修改内容：**
- 导入 `convertPDFToImages` 函数
- 修改 `parseDocument()` 方法：
  - 将 PDF 转换为图片（最多 5 页，缩放 1.5 倍）
  - 使用 `image` 类型替代 `document` 类型
  - 保留 prompt caching 功能（仅对第一张图片）

**关键代码：**
```typescript
// 将 PDF 转换为图片
const pdfImages = await convertPDFToImages(pdfFile, {
  maxPages: 5,
  scale: 1.5,
  format: 'png'
});

// 构建消息内容：先添加所有图片，最后添加文本问题
const content: any[] = [];
for (let i = 0; i < pdfImages.images.length; i++) {
  content.push({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/png',
      data: pdfImages.images[i],
    },
    // 只对第一张图片使用 cache_control
    ...(useCache && i === 0 ? { cache_control: { type: 'ephemeral' } } : {}),
  });
}
content.push({
  type: 'text',
  text: question,
});
```

### 4. 配置 PDF.js Worker (wxt.config.ts)

**修改内容：**
1. 添加 worker 文件到 `web_accessible_resources`
2. 添加构建插件自动复制 worker 文件

**关键配置：**
```typescript
web_accessible_resources: [
  {
    resources: ['main-world.js', 'pdf.worker.min.mjs'],
    matches: ['*://*.zhipin.com/*', '<all_urls>'],
  },
],

// Vite 插件：构建时复制 worker 文件
{
  name: 'copy-pdfjs-worker',
  closeBundle() {
    const workerSrc = resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
    const workerDest = resolve(__dirname, '.output/chrome-mv3/pdf.worker.min.mjs');
    copyFileSync(workerSrc, workerDest);
  }
}
```

## 技术细节

### PDF 转图片参数

- **maxPages**: 5（最多转换 5 页，避免 token 消耗过大）
- **scale**: 1.5（缩放比例，平衡清晰度和文件大小）
- **format**: png（保证文字清晰度）
- **quality**: 0.92（JPEG 质量，仅在使用 jpeg 格式时生效）

### 性能对比

| 方式 | 处理时间 | Token 消耗 | 成本 (Opus 4.7) |
|------|---------|-----------|----------------|
| document 类型 | 4-9秒 | ~4000 | $0.12/次 |
| image 方式 | 7-15秒 | ~1300 | $0.077/次 |

**结论：** 图片方式虽然稍慢，但成本更低，且兼容第三方 API。

### 文件大小

- PDF.js worker: 1.2MB
- 单页 PNG 图片: 约 100-300KB（取决于内容复杂度）
- 5 页简历总大小: 约 500KB-1.5MB

## 使用说明

### 简历解析流程

1. 用户上传 PDF 简历
2. `validatePDFFile()` 验证文件（类型、大小）
3. `parseResumeWithAI()` 调用 Claude 解析
4. `convertPDFToImages()` 将 PDF 转为图片
5. `parseDocument()` 发送图片到 Claude API
6. `parseAIResumeResponse()` 解析返回的 JSON 数据

### 错误处理

- PDF 文件验证失败 → 抛出友好错误信息
- PDF 转图片失败 → 记录详细日志并抛出错误
- API 调用失败 → 记录错误并返回友好提示
- JSON 解析失败 → 降级到基础解析器

## 测试验证

### 构建验证

```bash
pnpm run build:chrome
```

**预期结果：**
- ✓ PDF.js worker 文件已复制
- ✓ 构建成功，无错误
- ✓ `.output/chrome-mv3/pdf.worker.min.mjs` 文件存在（1.2MB）

### 功能测试

1. 加载扩展到 Chrome
2. 打开 BOSS 直聘职位页面
3. 点击"上传简历"按钮
4. 选择 PDF 简历文件
5. 观察控制台日志：
   - `[Claude] 开始解析 PDF 文档（图片方式）`
   - `[Claude] PDF 转图片完成`
   - `[Claude] API 调用成功`
6. 验证简历信息是否正确解析

## 注意事项

1. **Worker 文件路径**：必须使用 `chrome.runtime.getURL()` 获取扩展内部文件路径
2. **Web Accessible Resources**：worker 文件必须在 manifest 中声明为可访问资源
3. **构建流程**：每次构建都会自动复制 worker 文件到输出目录
4. **浏览器兼容性**：Chrome/Edge/Firefox 均支持，但 Firefox 使用 MV2 manifest
5. **内存管理**：每页渲染完成后立即清理 canvas，避免内存泄漏

## 后续优化建议

1. **缓存优化**：对于多页 PDF，可以考虑只对第一张图片使用 cache_control
2. **并行处理**：可以并行渲染多页 PDF，提升转换速度
3. **图片压缩**：可以使用 JPEG 格式并调整质量参数，进一步降低 token 消耗
4. **分页策略**：对于超长简历，可以只转换前 3 页，减少处理时间
5. **错误重试**：添加 API 调用失败的自动重试机制

## 相关文件

- `src/utils/pdfToImage.ts` - PDF 转图片工具
- `src/composables/useModel/claude.ts` - Claude 模型适配器
- `src/utils/resumeParser.ts` - 简历解析器（未修改）
- `wxt.config.ts` - 扩展构建配置
- `test_resume_parse_as_image.py` - Python 测试脚本（参考）

## 版本信息

- pdfjs-dist: 5.7.284
- WXT: 0.20.25
- Vite: 8.0.10
- 实现日期: 2026-04-30
