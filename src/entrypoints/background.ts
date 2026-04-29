export default defineBackground(() => {
  console.log('Jobflow background script loaded');

  // 监听来自 content script 的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_STORAGE') {
      chrome.storage.local.get(request.key, (result) => {
        sendResponse(result);
      });
      return true;
    }

    if (request.type === 'SET_STORAGE') {
      chrome.storage.local.set({ [request.key]: request.value }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    // 处理 API 测试请求
    if (request.type === 'TEST_API_CONNECTION') {
      (async () => {
        try {
          const { modelsUrl, headers, timeout = 8000 } = request.payload;

          console.log('[Background] 测试 API 连接:', { modelsUrl, headers, timeout });

          // 热身请求
          try {
            await fetch(modelsUrl, {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(timeout),
            });
          } catch (e) {
            console.log('[Background] 热身请求失败（忽略）:', e);
            // 忽略热身请求的错误
          }

          // 实际测试请求
          const start = performance.now();
          const response = await fetch(modelsUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(timeout),
          });
          const latency = Math.round(performance.now() - start);

          console.log('[Background] 收到响应:', { status: response.status, latency });

          if (response.ok) {
            try {
              const data = await response.json();
              const modelCount = data.data?.length || 0;
              console.log('[Background] 解析成功:', { modelCount });
              sendResponse({
                success: true,
                latency,
                modelCount,
                status: response.status,
              });
            } catch (e) {
              console.log('[Background] JSON 解析失败:', e);
              sendResponse({
                success: true,
                latency,
                status: response.status,
              });
            }
          } else {
            const errorText = await response.text().catch(() => '');
            console.error('[Background] HTTP 错误:', { status: response.status, errorText });
            sendResponse({
              success: false,
              status: response.status,
              errorText,
            });
          }
        } catch (error: any) {
          console.error('[Background] 请求异常:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
          sendResponse({
            success: false,
            error: error.message,
            errorName: error.name,
            isTimeout: error.name === 'TimeoutError' || error.name === 'AbortError' || error.message.includes('timeout'),
            isNetworkError: error.message.includes('Failed to fetch'),
          });
        }
      })();
      return true; // 保持消息通道开放以支持异步响应
    }
  });
});
