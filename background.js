// AI Pen - Background
const API = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULTS = { deepseekKey: '', dailyLimit: 20, language: 'zh' };

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.sync.get('settings');
  if (!settings) await chrome.storage.sync.set({ settings: DEFAULTS });
  const t = new Date();
  await chrome.storage.local.set({ dailyCount: 0, date: t.toDateString() });
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  switch (req.type) {
    case 'AI_ACTION':
      handleAction(req).then(sendResponse).catch(e => sendResponse({ error: e.message }));
      return true;
    case 'CHECK_LIMIT':
      checkLimit().then(sendResponse);
      return true;
    case 'GET_SETTINGS':
      chrome.storage.sync.get('settings').then(sendResponse);
      return true;
    case 'SAVE_SETTINGS':
      chrome.storage.sync.set({ settings: req.settings }).then(() => sendResponse({ success: true }));
      return true;
  }
});

async function checkLimit() {
  const { settings } = await chrome.storage.sync.get('settings');
  const limit = (settings || DEFAULTS).dailyLimit || 20;
  const { dailyCount, date } = await chrome.storage.local.get(['dailyCount', 'date']);
  const today = new Date().toDateString();
  const count = date === today ? (dailyCount || 0) : 0;
  return { allowed: count < limit, remaining: limit - count, total: limit };
}

async function handleAction({ text, action, settings }) {
  const s = settings || DEFAULTS;
  if (!s.deepseekKey) throw new Error('请先设置 DeepSeek API Key');

  const prompts = {
    rewrite: `请改写以下文字，保持原意但用更流畅优美的中文表达：\n\n${text}`,
    translate_en: `请将以下中文翻译成英文：\n\n${text}`,
    translate_zh: `Translate the following to Chinese:\n\n${text}`,
    summarize: `请用简洁的语言总结以下内容，提取核心要点：\n\n${text}`,
    expand: `请将以下内容扩展丰富，增加细节和例子：\n\n${text}`,
    polish: `请润色以下文字，修正语法错误，提升专业性：\n\n${text}`,
    custom: text
  };

  const prompt = prompts[action] || text;

  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.deepseekKey}` },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!resp.ok) throw new Error(`API ${resp.status}`);
  const data = await resp.json();

  // 更新计数
  const { dailyCount, date } = await chrome.storage.local.get(['dailyCount', 'date']);
  const today = new Date().toDateString();
  const count = date === today ? (dailyCount || 0) + 1 : 1;
  await chrome.storage.local.set({ dailyCount: count, date: today });

  // 保存历史
  const { history } = await chrome.storage.local.get('history');
  const entry = { id: Date.now(), action, input: text.substring(0, 200), output: data.choices[0].message.content.substring(0, 500), time: new Date().toISOString() };
  await chrome.storage.local.set({ history: [entry, ...(history || [])].slice(0, 100) });

  return { success: true, result: data.choices[0].message.content };
}
