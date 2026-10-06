// Scout Sentinel Popup — Minimal status check

const LOCAL_SERVER = 'http://127.0.0.1:8765';
const OLLAMA_URL = 'http://localhost:11434';

async function checkStatus() {
  const srvEl = document.getElementById('srv-status');
  const aiEl = document.getElementById('ai-status');

  // Check server
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${LOCAL_SERVER}/health`, { signal: ctrl.signal });
    if (res.ok) {
      const data = await res.json();
      srvEl.textContent = `Running (${data.format})`;
      srvEl.style.color = '#10b981';
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch {
    srvEl.textContent = 'Offline';
    srvEl.style.color = '#ef4444';
  }

  // Check Ollama
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    if (res.ok) {
      const data = await res.json();
      aiEl.textContent = `${data.models?.length || 0} models`;
      aiEl.style.color = '#10b981';
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch {
    aiEl.textContent = 'Offline';
    aiEl.style.color = '#ef4444';
  }
}

checkStatus();
