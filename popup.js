document.addEventListener('DOMContentLoaded',async()=>{
  // Check Pro status
  let isPro = false;
  try {
    const user = await chrome.runtime.sendMessage({type:'GET_PAID_STATUS'});
    isPro = user.paid;
  }catch(e){}

  const badge = document.getElementById('badge');
  const proBanner = document.getElementById('pro-banner');
  const upgradeBtn = document.getElementById('upgrade');
  const loginBtn = document.getElementById('login-btn');

  if(isPro){
    badge.innerHTML = '<span class="badge badge-pro">PRO</span>';
    proBanner.style.display = 'block';
  }else{
    badge.innerHTML = '<span class="badge badge-free">FREE</span>';
    upgradeBtn.style.display = 'block';
    loginBtn.style.display = 'block';
  }

  const{dailyCount,date,history}=await chrome.storage.local.get(['dailyCount','date','history']);
  const today=new Date().toDateString();
  document.getElementById('count').textContent = isPro ? '∞' : (date===today?(dailyCount||0):0);
  document.getElementById('total').textContent=(history||[]).length;

  document.getElementById('settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
  document.getElementById('upgrade').addEventListener('click',()=>chrome.runtime.sendMessage({type:'OPEN_PAYMENT'}));
  document.getElementById('login-btn').addEventListener('click',()=>chrome.runtime.sendMessage({type:'OPEN_LOGIN'}));
});
