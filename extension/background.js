// Background Service Worker for Scout
// Connects to local server (preferred) or Native Messaging bridge

const LOCAL_SERVER_URL = 'http://127.0.0.1:8765/analyze';
let serverAvailable = null; // null = unknown, true/false after check

// Quick probe to detect if local server is running
async function checkServer() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('http://127.0.0.1:8765/', { method: 'GET', signal: ctrl.signal });
    serverAvailable = res.ok || res.status === 404; // 404 is fine, means server is up
    console.log('[Scout] Local server detected:', serverAvailable);
  } catch {
    serverAvailable = false;
    console.log('[Scout] Local server not detected, will try Native Messaging');
  }
}

// Check on startup
chrome.runtime.onStartup.addListener(checkServer);
chrome.runtime.onInstalled.addListener(checkServer);
checkServer();

// Native Messaging fallback
const NATIVE_HOST = 'com.scout.bridge';
let bridgePort = null;

function connectBridge() {
  try {
    bridgePort = chrome.runtime.connectNative(NATIVE_HOST);
    bridgePort.onDisconnect.addListener(() => {
      bridgePort = null;
    });
    bridgePort.onMessage.addListener((msg) => {
      if (msg.tabId && msg.type === 'BRIDGE_RESPONSE') {
        chrome.tabs.sendMessage(msg.tabId, msg.payload).catch(() => {});
      }
    });
  } catch (e) {
    bridgePort = null;
  }
}

async function analyzeViaServer(payload) {
  const res = await fetch(LOCAL_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Server error: ' + res.status);
  return await res.json();
}

// Main message router from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCOUT_ANALYZE') {
    const payload = {
      ...request.payload,
      tabId: sender.tab?.id,
      url: sender.tab?.url
    };

    (async () => {
      try {
        let result;

        // Prefer local server (easiest)
        if (serverAvailable !== false) {
          try {
            result = await analyzeViaServer(payload);
            sendResponse({ status: 'ok', source: 'server', data: result });
            return;
          } catch (serverErr) {
            console.warn('[Scout] Server failed, trying bridge:', serverErr.message);
            serverAvailable = false;
          }
        }

        // Fallback to Native Messaging
        if (!bridgePort) connectBridge();
        if (bridgePort) {
          bridgePort.postMessage(payload);
          // Native messaging is async via onMessage, send immediate ack
          sendResponse({ status: 'sent', source: 'native' });
        } else {
          sendResponse({ status: 'error', message: 'Scout server not running. Open terminal and run: node bridge/server.js' });
        }
      } catch (e) {
        sendResponse({ status: 'error', message: e.message });
      }
    })();

    return true; // Keep channel open for async
  }

  if (request.action === 'GET_TAB_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title,
          id: tabs[0].id
        });
      }
    });
    return true;
  }
});

// Listen for server responses from tabs (via content script polling or bridge callbacks)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'BRIDGE_RESPONSE' && msg.payload) {
    // Forward to the tab that requested it
    if (msg.tabId) {
      chrome.tabs.sendMessage(msg.tabId, msg.payload).catch(() => {});
    }
  }
});

// Context menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'scout-analyze',
    title: '🧭 Scout: Analyze this page',
    contexts: ['page']
  });
  chrome.contextMenus.create({
    id: 'scout-summarize',
    title: '🧭 Scout: Summarize selection',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'scout-analyze') {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_FULL_ANALYSIS' });
  }
  if (info.menuItemId === 'scout-summarize') {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SUMMARY', text: info.selectionText });
  }
});
