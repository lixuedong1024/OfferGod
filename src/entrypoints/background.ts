export default defineBackground(() => {
  console.log('Jobflow background script loaded');
  console.log('Chrome version:', navigator.userAgent);
  console.log('Extension ID:', chrome.runtime.id);

  // 测试权限
  chrome.permissions.getAll((permissions) => {
    console.log('[Background] 当前权限:', permissions);
  });

  // 使用 XMLHttpRequest 作为备用方案
  function fetchWithXHR(url: string, headers: Record<string, string>, timeout: number): Promise<{
    status: number;
    statusText: string;
    responseText: string;
    headers: Record<string, string>;
  }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = timeout;

      xhr.onload = () => {
        const responseHeaders: Record<string, string> = {};
        const headerStr = xhr.getAllResponseHeaders();
        headerStr.split('\r\n').forEach(line => {
          const parts = line.split(': ');
          if (parts.length === 2) {
            responseHeaders[parts[0].toLowerCase()] = parts[1];
          }
        });

        resolve({
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          headers: responseHeaders,
        });
      };

      xhr.onerror = () => {
        reject(new Error('Network request failed'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Request timeout'));
      };

      xhr.open('GET', url);

      // 设置请求头
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send();
    });
  }

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
          const { modelsUrl, headers, timeout = 10000, useFetch = true } = request.payload;

          console.log('[Background] 测试 API 连接:', {
            modelsUrl,
            headers: Object.keys(headers),
            timeout,
            method: useFetch ? 'fetch' : 'XMLHttpRequest'
          });

          // 验证 URL 格式
          let url: URL;
          try {
            url = new URL(modelsUrl);
            console.log('[Background] URL 解析成功:', {
              protocol: url.protocol,
              host: url.host,
              pathname: url.pathname
            });
          } catch (e) {
            console.error('[Background] URL 格式错误:', e);
            sendResponse({
              success: false,
              error: 'URL 格式错误: ' + modelsUrl,
              errorName: 'URLError',
            });
            return;
          }

          // 检查权限
          try {
            const hasPermission = await chrome.permissions.contains({
              origins: [url.origin + '/*']
            });
            console.log('[Background] 权限检查:', {
              origin: url.origin,
              hasPermission
            });

            if (!hasPermission) {
              console.warn('[Background] 警告：没有访问该域名的明确权限（但可能有通配符权限）');
            }
          } catch (permCheckError) {
            console.error('[Background] 权限检查失败:', permCheckError);
          }

          const start = performance.now();

          try {
            if (useFetch) {
              // 方法 1: 使用 fetch API
              console.log('[Background] 使用 fetch API 发送请求...');

              const controller = new AbortController();
              const timeoutId = setTimeout(() => {
                console.log('[Background] 请求超时，中止请求');
                controller.abort();
              }, timeout);

              const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: headers,
                signal: controller.signal,
              });

              clearTimeout(timeoutId);
              const latency = Math.round(performance.now() - start);

              console.log('[Background] 收到响应:', {
                status: response.status,
                statusText: response.statusText,
                latency,
              });

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
                console.error('[Background] HTTP 错误:', {
                  status: response.status,
                  errorText: errorText.substring(0, 500)
                });
                sendResponse({
                  success: false,
                  status: response.status,
                  errorText,
                });
              }
            } else {
              // 方法 2: 使用 XMLHttpRequest（备用方案）
              console.log('[Background] 使用 XMLHttpRequest 发送请求...');

              const xhrResponse = await fetchWithXHR(modelsUrl, headers, timeout);
              const latency = Math.round(performance.now() - start);

              console.log('[Background] 收到响应:', {
                status: xhrResponse.status,
                statusText: xhrResponse.statusText,
                latency,
              });

              if (xhrResponse.status >= 200 && xhrResponse.status < 300) {
                try {
                  const data = JSON.parse(xhrResponse.responseText);
                  const modelCount = data.data?.length || 0;
                  console.log('[Background] 解析成功:', { modelCount });
                  sendResponse({
                    success: true,
                    latency,
                    modelCount,
                    status: xhrResponse.status,
                  });
                } catch (e) {
                  console.log('[Background] JSON 解析失败:', e);
                  sendResponse({
                    success: true,
                    latency,
                    status: xhrResponse.status,
                  });
                }
              } else {
                console.error('[Background] HTTP 错误:', {
                  status: xhrResponse.status,
                  errorText: xhrResponse.responseText.substring(0, 500)
                });
                sendResponse({
                  success: false,
                  status: xhrResponse.status,
                  errorText: xhrResponse.responseText,
                });
              }
            }
          } catch (fetchError: any) {
            console.error('[Background] 请求失败 - 错误名称:', fetchError.name);
            console.error('[Background] 请求失败 - 错误消息:', fetchError.message);
            console.error('[Background] 请求失败 - 完整错误:', fetchError);

            // 如果 fetch 失败，自动尝试 XMLHttpRequest
            if (useFetch) {
              console.log('[Background] fetch 失败，尝试使用 XMLHttpRequest...');
              try {
                const xhrResponse = await fetchWithXHR(modelsUrl, headers, timeout);
                const latency = Math.round(performance.now() - start);

                console.log('[Background] XMLHttpRequest 成功:', {
                  status: xhrResponse.status,
                  latency,
                });

                if (xhrResponse.status >= 200 && xhrResponse.status < 300) {
                  try {
                    const data = JSON.parse(xhrResponse.responseText);
                    const modelCount = data.data?.length || 0;
                    sendResponse({
                      success: true,
                      latency,
                      modelCount,
                      status: xhrResponse.status,
                      usedXHR: true,
                    });
                  } catch (e) {
                    sendResponse({
                      success: true,
                      latency,
                      status: xhrResponse.status,
                      usedXHR: true,
                    });
                  }
                } else {
                  sendResponse({
                    success: false,
                    status: xhrResponse.status,
                    errorText: xhrResponse.responseText,
                    usedXHR: true,
                  });
                }
                return;
              } catch (xhrError: any) {
                console.error('[Background] XMLHttpRequest 也失败:', xhrError);
              }
            }

            // 检查是否是 AbortError
            if (fetchError.name === 'AbortError') {
              sendResponse({
                success: false,
                error: `连接超时（${timeout}ms）`,
                errorName: 'AbortError',
                isTimeout: true,
              });
              return;
            }

            throw fetchError;
          }
        } catch (error: any) {
          console.error('[Background] 请求异常 - 错误名称:', error.name);
          console.error('[Background] 请求异常 - 错误消息:', error.message);
          console.error('[Background] 请求异常 - 完整错误:', error);
          if (error.stack) {
            console.error('[Background] 请求异常 - 堆栈:', error.stack);
          }

          const isPermissionError = error.message.includes('permissions') ||
                                   error.message.includes('blocked') ||
                                   error.message.includes('CORS');

          sendResponse({
            success: false,
            error: error.message,
            errorName: error.name,
            isTimeout: error.name === 'TimeoutError' || error.name === 'AbortError',
            isNetworkError: error.message.includes('Failed to fetch') || error.message.includes('NetworkError'),
            isPermissionError,
          });
        }
      })();
      return true;
    }
  });
});
