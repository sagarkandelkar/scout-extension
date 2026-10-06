// Scout Extension Popup — Diagnostics & Connection Tester

const LOCAL_SERVER = 'http://127.0.0.1:8765';
const OLLAMA_URL = 'http://localhost:11434';

const UI = {
  srvStatus: document.getElementById('srv-status'),
  srvDot: document.getElementById('srv-dot'),
  aiStatus: document.getElementById('ai-status'),
  aiDot: document.getElementById('ai-dot'),
  modelStatus: document.getElementById('model-status'),
  logBox: document.getElementById('log-box'),
  testBtn: document.getElementById('btn-test'),
  modeButtons: document.querySelectorAll('.mode-btn')
};

function log(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = `log-${type}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  UI.logBox.appendChild(div);
  UI.logBox.scrollTop = UI.logBox.scrollHeight;
}

function setStatus(el, dot, text, status) {
  el.innerHTML = `<span class="conn-dot conn-${status}"></span>${text}`;
  dot.className = `conn-dot conn-${status}`;
}

// ─── Connection Tests ───

async function testServer() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${LOCAL_SERVER}/health`, { signal: ctrl.signal });
    if (res.ok) {
      const data = await res.json();
      setStatus(UI.srvStatus, UI.srvDot, `Running (${data.format || 'unknown'})`, 'ok');
      UI.modelStatus.textContent = data.model || 'unknown';
      return true;
    }
    throw new Error('HTTP ' + res.status);
  } catch (e) {
    setStatus(UI.srvStatus, UI.srvDot, 'Not reachable', 'err');
    log(`Server unreachable: ${e.message}`, 'err');
    return false;
  }
}

async function testOllama() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    if (res.ok) {
      const data = await res.json();
      const models = data.models?.map(m => m.name).join(', ') || 'found';
      setStatus(UI.aiStatus, UI.aiDot, `${data.models?.length || 0} models`, 'ok');
      log(`Ollama found: ${models}`, 'ok');
      return true;
    }
    throw new Error('HTTP ' + res.status);
  } catch (e) {
    setStatus(UI.aiStatus, UI.aiDot, 'Not reachable', 'err');
    log(`Ollama unreachable: ${e.message}`, 'err');
    return false;
  }
}

async function testAnalyze() {
  log('Sending test analyze request...', 'info');
  UI.testBtn.disabled = true;
  UI.testBtn.textContent = 'Testing...';

  try {
    const res = await fetch(`${LOCAL_SERVER}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'chat',
        context: { lastMessages: 'Hello world test message', platform: 'test' },
        url: 'http://localhost/test',
        title: 'Test'
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Server error ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    if (data.insights && data.insights.length > 0) {
      log(`✅ AI responded with ${data.insights.length} insights`, 'ok');
      log(`First: "${data.insights[0].title}"`, 'info');
    } else {
      log('⚠️ AI returned empty insights', 'err');
    }
  } catch (e) {
    log(`Analyze failed: ${e.message}`, 'err');
  } finally {
    UI.testBtn.disabled = false;
    UI.testBtn.textContent = '🧪 Test Connection & Analyze This Page';
  }
}

// ─── Trigger Analysis on Active Tab ───

async function analyzeCurrentTab() {
  log('Getting active tab...', 'info');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    log('No active tab found', 'err');
    return;
  }
  log(`Tab: ${tab.url?.slice(0, 60)}...`, 'info');

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_FULL_ANALYSIS' });
    log('Sent analyze command to tab', 'ok');
  } catch (e) {
    log(`Content script not loaded: ${e.message}`, 'err');
    log('Try refreshing the page', 'info');
  }
}

// ─── Mode Switching ───

UI.modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    UI.modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chrome.storage.local.set({ scoutMode: mode });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_MODE', mode });
    });
    log(`Switched to ${mode} mode`, 'info');
  });
});

// ─── Event Listeners ───

UI.testBtn.addEventListener('click', async () => {
  log('=== Running Diagnostics ===', 'info');
  const srvOk = await testServer();
  const ollOk = await testOllama();
  if (srvOk && ollOk) {
    await testAnalyze();
    await analyzeCurrentTab();
  } else {
    log('Fix connection issues before analyzing', 'err');
  }
});

document.getElementById('btn-clear').addEventListener('click', () => {
  UI.logBox.innerHTML = '';
  log('Logs cleared', 'info');
});

document.getElementById('btn-reload').addEventListener('click', () => {
  chrome.runtime.reload();
});

// ─── Init ───

log('Popup opened. Click "Test Connection" to diagnose.', 'info');

// Auto-check on open
testServer();
testOllama();
