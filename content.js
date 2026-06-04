// AI Pen - Content Script
// 选中文字弹出浮动工具栏

let toolbar = null;
let resultBox = null;

document.addEventListener('mouseup', (e) => {
  const sel = window.getSelection();
  const text = sel?.toString()?.trim();
  
  if (text && text.length > 2) {
    showToolbar(e.clientX, e.clientY, text);
  } else {
    hideToolbar();
  }
});

function showToolbar(x, y, text) {
  hideToolbar();

  toolbar = document.createElement('div');
  toolbar.id = 'aipen-toolbar';
  toolbar.innerHTML = `
    <button data-action="rewrite" title="改写">✏️ 改写</button>
    <button data-action="translate_en" title="中译英">🌐 英译</button>
    <button data-action="summarize" title="总结">📝 总结</button>
    <button data-action="expand" title="扩展">📖 扩展</button>
    <button data-action="polish" title="润色">✨ 润色</button>
    <button id="aipen-close" title="关闭">×</button>
  `;

  toolbar.style.cssText = `
    position:fixed;z-index:2147483647;
    left:${Math.min(x, window.innerWidth - 320)}px;top:${y + 15}px;
    background:#1a1a2e;border:1px solid #333;border-radius:12px;
    padding:8px 12px;display:flex;gap:6px;align-items:center;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);font-size:13px;
    animation:aipen-in 0.15s ease;
  `;

  toolbar.querySelectorAll('button[data-action]').forEach(btn => {
    btn.onclick = () => handleAction(text, btn.dataset.action);
  });
  toolbar.querySelector('#aipen-close').onclick = hideToolbar;

  document.body.appendChild(toolbar);

  // 点击其他地方关闭
  setTimeout(() => {
    document.addEventListener('click', hideToolbar, { once: true });
  }, 100);
}

function hideToolbar() {
  if (toolbar) { toolbar.remove(); toolbar = null; }
  if (resultBox) { resultBox.remove(); resultBox = null; }
}

async function handleAction(text, action) {
  hideToolbar();

  const sel = window.getSelection();
  const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
  
  // 显示加载
  resultBox = document.createElement('div');
  resultBox.id = 'aipen-result';
  resultBox.style.cssText = `
    position:fixed;z-index:2147483647;right:20px;top:80px;
    width:380px;max-height:500px;background:#1a1a2e;border:1px solid #333;
    border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.4);
    font-size:14px;color:#e0e0e0;line-height:1.6;overflow-y:auto;
    animation:aipen-in 0.2s ease;
  `;
  resultBox.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:#888"><span style="animation:spin 1s linear infinite">⏳</span> AI 处理中...</div>';
  document.body.appendChild(resultBox);

  try {
    const { settings } = await chrome.storage.sync.get('settings');
    const limit = await chrome.runtime.sendMessage({ type: 'CHECK_LIMIT' });
    if (!limit.allowed && !limit.pro) {
      resultBox.innerHTML = `
        <div style="text-align:center;padding:20px">
          <div style="font-size:36px;margin-bottom:12px">🚀</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px;color:#f0c040">今日免费次数已用完</div>
          <div style="font-size:13px;color:#8b949e;margin-bottom:16px">升级 Pro 版，无限使用 + 优先响应</div>
          <button id="aipen-upgrade" style="background:#f0c040;color:#0d1117;border:none;padding:10px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">✨ 升级 Pro</button>
          <div style="margin-top:8px"><a href="#" id="aipen-login" style="color:#58a6ff;font-size:11px;text-decoration:none">已购买？登录激活</a></div>
        </div>`;
      document.getElementById('aipen-upgrade').onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_PAYMENT' });
      document.getElementById('aipen-login').onclick = (e) => { e.preventDefault(); chrome.runtime.sendMessage({ type: 'OPEN_LOGIN' }); };
      return;
    }

    const resp = await chrome.runtime.sendMessage({ type: 'AI_ACTION', text, action, settings });
    if (resp.error) {
      resultBox.innerHTML = `<div style="color:#f85149">错误：${resp.error}</div>`;
    } else if (resp.limitReached) {
      resultBox.innerHTML = `
        <div style="text-align:center;padding:20px">
          <div style="font-size:36px;margin-bottom:12px">🚀</div>
          <div style="font-size:16px;font-weight:600;margin-bottom:8px;color:#f0c040">今日免费次数已用完</div>
          <div style="font-size:13px;color:#8b949e;margin-bottom:16px">升级 Pro 版，无限使用 + 优先响应</div>
          <button id="aipen-upgrade" style="background:#f0c040;color:#0d1117;border:none;padding:10px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">✨ 升级 Pro</button>
          <div style="margin-top:8px"><a href="#" id="aipen-login" style="color:#58a6ff;font-size:11px;text-decoration:none">已购买？登录激活</a></div>
        </div>`;
      document.getElementById('aipen-upgrade').onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_PAYMENT' });
      document.getElementById('aipen-login').onclick = (e) => { e.preventDefault(); chrome.runtime.sendMessage({ type: 'OPEN_LOGIN' }); };
    } else {
      resultBox.innerHTML = `
        <div style="margin-bottom:12px;font-weight:600;color:#58a6ff;display:flex;justify-content:space-between">
          <span>AI Pen · ${action}</span>
          <button id="aipen-copy" style="background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:2px 10px;cursor:pointer;font-size:12px">复制</button>
        </div>
        <div>${resp.result.replace(/\n/g, '<br>')}</div>
        <div style="margin-top:12px;font-size:11px;color:#8b949e">剩余 ${limit.remaining} 次</div>
      `;
      document.getElementById('aipen-copy').onclick = () => {
        navigator.clipboard.writeText(resp.result);
        document.getElementById('aipen-copy').textContent = '已复制✓';
      };
    }
  } catch (e) {
    resultBox.innerHTML = `<div style="color:#f85149">连接失败：${e.message}</div>`;
  }
}

// CSS动画注入
const style = document.createElement('style');
style.textContent = `
  @keyframes aipen-in { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
  @keyframes spin { to { transform:rotate(360deg) } }
  #aipen-toolbar button{background:#21262d;color:#c9d1d9;border:1px solid #30363d;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;transition:all 0.15s;white-space:nowrap}
  #aipen-toolbar button:hover{background:#30363d;border-color:#58a6ff}
  #aipen-close{color:#8b949e!important;font-size:18px!important;padding:4px 8px!important}
`;
document.head.appendChild(style);
