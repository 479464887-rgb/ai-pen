// AI Pen — Popup Script
let currentMode = 'rewrite';

document.addEventListener('DOMContentLoaded', () => {
  const chips = document.querySelectorAll('.chip');
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  const processBtn = document.getElementById('process-btn');
  const remaining = document.getElementById('remaining');

  // Mode selection
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentMode = chip.dataset.mode;
    });
  });

  // Load selected text if any
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelectedText' }, resp => {
        if (resp && resp.text) {
          input.value = resp.text;
        }
      });
    }
  });

  // Load usage and Pro status
  updateUI();

  // Process button
  processBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) {
      showError('Please enter or select some text.');
      return;
    }

    loading.classList.add('show');
    output.classList.remove('show');
    error.classList.remove('show');
    processBtn.disabled = true;

    chrome.runtime.sendMessage({ action: 'aiProcess', text, mode: currentMode }, resp => {
      loading.classList.remove('show');
      processBtn.disabled = false;

      if (resp.error) {
        if (resp.limitReached) {
          showError('Daily limit reached. Upgrade to Pro for unlimited use!');
        } else {
          showError(resp.error);
        }
        return;
      }

      output.textContent = resp.result;
      output.classList.add('show');
      if (resp.remaining !== undefined) {
        updateRemaining(resp.remaining);
      }
    });
  });

  function updateUI() {
    chrome.storage.local.get(['pro'], data => {
      const badge = document.getElementById('plan-badge');
      if (data.pro) {
        badge.textContent = 'Pro';
        badge.className = 'badge badge-pro';
        remaining.textContent = 'Unlimited';
      }
    });
    chrome.runtime.sendMessage({ action: 'getUsage' }, resp => {
      if (resp && resp.remaining !== undefined) {
        updateRemaining(resp.remaining);
      }
    });
  }

  function updateRemaining(rem) {
    remaining.textContent = rem === Infinity ? 'Unlimited' : `${rem} free uses left today`;
  }

  function showError(msg) {
    error.textContent = msg;
    error.classList.add('show');
    setTimeout(() => error.classList.remove('show'), 4000);
  }
});
