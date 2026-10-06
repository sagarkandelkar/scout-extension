// Scout Sentinel Background Worker
// Lightweight message router + context menus

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sentinel-analyze',
    title: '🧭 Scout: Analyze this page',
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: 'sentinel-lens',
    title: '🧭 Scout: Lens selection',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sentinel-analyze') {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_FULL_ANALYSIS' });
  }
  if (info.menuItemId === 'sentinel-lens') {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_LENS', text: info.selectionText });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_TAB_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({ url: tabs[0].url, title: tabs[0].title, id: tabs[0].id });
      }
    });
    return true;
  }
});
