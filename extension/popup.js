// Scout Extension Popup Logic

const UI = {
  statAlerts: document.getElementById('stat-alerts'),
  statSites: document.getElementById('stat-sites'),
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  modelName: document.getElementById('model-name'),
  modeButtons: document.querySelectorAll('.mode-btn')
};

// Load stats from storage
chrome.storage.local.get(['scoutAlerts', 'scoutSites', 'scoutMode'], (result) => {
  UI.statAlerts.textContent = result.scoutAlerts || 0;
  UI.statSites.textContent = result.scoutSites || 0;

  const activeMode = result.scoutMode || 'auto';
  UI.modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === activeMode);
  });
});

// Check bridge status
chrome.runtime.sendMessage({ action: 'GET_TAB_CONTEXT' }, (ctx) => {
  if (chrome.runtime.lastError) {
    UI.statusDot.classList.add('offline');
    UI.statusText.textContent = 'Bridge Offline';
  } else {
    UI.statusDot.classList.remove('offline');
    UI.statusText.textContent = 'Bridge Connected';
  }
});

// Mode switching
UI.modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    UI.modeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chrome.storage.local.set({ scoutMode: mode });

    // Notify active tab to re-run with forced mode
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_MODE', mode });
      }
    });
  });
});

// Quick actions
document.getElementById('btn-clear').addEventListener('click', () => {
  chrome.storage.local.set({ scoutAlerts: 0, scoutSites: 0 });
  UI.statAlerts.textContent = '0';
  UI.statSites.textContent = '0';
});

document.getElementById('btn-settings').addEventListener('click', () => {
  // Future: open options page
  alert('Settings page coming in v1.1!\n\nEdit bridge/commands.json for custom commands.');
});
