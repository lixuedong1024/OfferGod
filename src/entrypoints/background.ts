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

          // 热身请求
          try {
            await fetch(modelsUrl, {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(timeout),
            });
          } catch (e) {
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

          if (response.ok) {
            try {
              const data = await response.json();
              const modelCount = data.data?.length || 0;
              sendResponse({
                success: true,
                latency,
                modelCount,
                status: response.status,
              });
            } catch (e) {
              sendResponse({
                success: true,
                latency,
                status: response.status,
              });
            }
          } else {
            const errorText = await response.text().catch(() => '');
            sendResponse({
              success: false,
              status: response.status,
              errorText,
            });
          }
        } catch (error: any) {
          sendResponse({
            success: false,
            error: error.message,
            isTimeout: error.name === 'TimeoutError' || error.message.includes('timeout'),
            isNetworkError: error.message.includes('Failed to fetch'),
          });
        }
      })();
      return true; // 保持消息通道开放以支持异步响应
    }
  });
});
