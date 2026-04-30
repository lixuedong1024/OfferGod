import * as pdfjsLib from 'pdfjs-dist';
import { Logger } from './logger';

// 设置 PDF.js worker
// 注意：需要在 wxt.config.ts 中配置 worker 文件的复制
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');
}

export interface PDFToImageOptions {
  maxPages?: number; // 最多转换多少页，默认 5
  scale?: number; // 缩放比例，默认 1.5
  format?: 'png' | 'jpeg'; // 图片格式，默认 png
  quality?: number; // JPEG 质量 (0-1)，默认 0.92
}

export interface PDFImageResult {
  images: string[]; // base64 图片数组
  pageCount: number; // 总页数
  convertedPages: number; // 实际转换的页数
}

/**
 * 将 PDF 文件转换为图片数组
 * @param pdfFile PDF 文件对象
 * @param options 转换选项
 * @returns 图片数组和元数据
 */
export async function convertPDFToImages(
  pdfFile: File,
  options: PDFToImageOptions = {}
): Promise<PDFImageResult> {
  const {
    maxPages = 5,
    scale = 1.5,
    format = 'png',
    quality = 0.92
  } = options;

  Logger.info('开始转换 PDF 为图片', {
    fileName: pdfFile.name,
    fileSize: `${(pdfFile.size / 1024).toFixed(2)}KB`,
    maxPages,
    scale,
    format
  });

  try {
    // 读取 PDF 文件
    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    const pageCount = pdf.numPages;
    const convertedPages = Math.min(pageCount, maxPages);

    Logger.info('PDF 加载成功', {
      totalPages: pageCount,
      willConvert: convertedPages
    });

    const images: string[] = [];

    // 转换每一页
    for (let pageNum = 1; pageNum <= convertedPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // 创建 canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('无法创建 Canvas 2D 上下文');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // 渲染 PDF 页面到 canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        // 转换为 base64
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // 提取 base64 数据（去掉 data:image/png;base64, 前缀）
        const base64Data = dataUrl.split(',')[1];

        images.push(base64Data);

        Logger.info(`第 ${pageNum} 页转换完成`, {
          width: viewport.width,
          height: viewport.height,
          dataSize: `${(base64Data.length / 1024).toFixed(2)}KB`
        });

        // 清理 canvas
        canvas.remove();
      } catch (error) {
        Logger.error(`第 ${pageNum} 页转换失败`, { error });
        throw error;
      }
    }

    Logger.info('PDF 转图片完成', {
      totalImages: images.length,
      totalSize: `${(images.reduce((sum, img) => sum + img.length, 0) / 1024).toFixed(2)}KB`
    });

    return {
      images,
      pageCount,
      convertedPages
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    Logger.error('PDF 转图片失败', { error: errorMessage });
    throw new Error(`PDF 转图片失败: ${errorMessage}`);
  }
}

/**
 * 获取 PDF 的第一页预览图
 * @param pdfFile PDF 文件对象
 * @param scale 缩放比例，默认 1.0
 * @returns base64 图片数据
 */
export async function getPDFThumbnail(
  pdfFile: File,
  scale: number = 1.0
): Promise<string> {
  const result = await convertPDFToImages(pdfFile, {
    maxPages: 1,
    scale,
    format: 'jpeg',
    quality: 0.8
  });

  return result.images[0];
}
