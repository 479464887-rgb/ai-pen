// AI Pen — Background Service Worker
// Handles DeepSeek API calls and usage tracking

const API_URL = 'https://api.deepseek.com/chat/completions';
const DAILY_LIMIT = 20;

function today() { return new Date().toISOString().split('T')[0]; }

async function getApiKey() {
  const data = await chrome.storage.local.get(['apiKey']);
  return data.apiKey || 'sk-3d248dabf05f4837ab3ec3577df95ce0';
}

async function checkUsage() {
  const data = await chrome.storage.local.get(['usage', 'usageDate', 'pro']);
  const isPro = data.pro || false;
  const d = today();
  if (data.usageDate !== d) { await chrome.storage.local.set({ usage: 0, usageDate: d }); }
  const used = (data.usageDate === d ? data.usage || 0 : 0);
  return { allowed: isPro || used < DAILY_LIMIT, remaining: isPro ? Infinity : DAILY_LIMIT - used, pro: isPro };
}

async function incrementUsage() {
  const data = await chrome.storage.local.get(['usage', 'usageDate']);
  await chrome.storage.local.set({ usage: (data.usageDate === today() ? data.usage || 0 : 0) + 1, usageDate: today() });
}

async function callDeepSeek(text, action) {
  const apiKey = await getApiKey();
  const systemPrompts = {
    rewrite: 'You are a professional writing assistant. Rewrite the following text to be clearer and more professional. Output only the rewritten text.',
    translate: 'Translate the following text to English. If already English, translate to Chinese. Output only translation.',
    translate_en: 'Translate the following text to English. Output only the translation.',
    summarize: 'Summarize the following text in 2-3 concise bullet points. Output only the summary.',
    expand: 'Expand the following text with more detail and examples while preserving the original meaning.',
    polish: 'Polish the following text to be more elegant and natural. Output only the polished version.'
  };

  const sysPrompt = systemPrompts[action] || systemPrompts.rewrite;
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: text }], temperature: 0.7, max_tokens: 1000 })
  });

  if (!response.ok) { const err = await response.text(); throw new Error(`API ${response.status}`); }
  const data = await response.json();
  return data.choices[0].message.content;
}

// Single message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Popup: process text
  if (request.action === 'aiProcess') {
    (async () => {
      try {
        const usage = await checkUsage();
        if (!usage.allowed) { sendResponse({ error: 'Daily limit reached', limitReached: true }); return; }
        const result = await callDeepSeek(request.text, request.mode);
        await incrementUsage();
        sendResponse({ result, remaining: (await checkUsage()).remaining });
      } catch (err) { sendResponse({ error: err.message }); }
    })();
    return true;
  }

  // Popup: get usage
  if (request.action === 'getUsage') {
    (async () => { sendResponse(await checkUsage()); })();
    return true;
  }

  // Content script: check limit
  if (request.type === 'CHECK_LIMIT') {
    (async () => { sendResponse(await checkUsage()); })();
    return true;
  }

  // Content script: AI action
  if (request.type === 'AI_ACTION') {
    (async () => {
      try {
        const usage = await checkUsage();
        if (!usage.allowed) { sendResponse({ limitReached: true }); return; }
        const result = await callDeepSeek(request.text, request.action);
        await incrementUsage();
        sendResponse({ result });
      } catch (err) { sendResponse({ error: err.message }); }
    })();
    return true;
  }
});
