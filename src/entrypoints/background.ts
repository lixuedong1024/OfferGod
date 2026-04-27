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
  });
});
