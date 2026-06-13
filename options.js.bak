const DEFAULTS={deepseekKey:'',dailyLimit:20,language:'zh'};
document.addEventListener('DOMContentLoaded',async()=>{
  const{settings}=await chrome.storage.sync.get('settings');
  const s=settings||DEFAULTS;
  document.getElementById('key').value=s.deepseekKey||'';
  document.getElementById('limit').value=s.dailyLimit||20;
  document.getElementById('save').addEventListener('click',async()=>{
    const btn=document.getElementById('save');btn.disabled=true;btn.textContent='保存中...';
    await chrome.storage.sync.set({settings:{
      deepseekKey:document.getElementById('key').value.trim(),
      dailyLimit:parseInt(document.getElementById('limit').value)||20
    }});
    btn.disabled=false;btn.textContent='保存设置';
    const el=document.getElementById('status');el.textContent='已保存!';el.style.display='inline';
    setTimeout(()=>el.style.display='none',2000);
  });
});
