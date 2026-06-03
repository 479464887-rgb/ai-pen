document.addEventListener('DOMContentLoaded',async()=>{
  const{dailyCount,date,history}=await chrome.storage.local.get(['dailyCount','date','history']);
  const today=new Date().toDateString();
  document.getElementById('count').textContent=date===today?(dailyCount||0):0;
  document.getElementById('total').textContent=(history||[]).length;
  document.getElementById('settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
});
