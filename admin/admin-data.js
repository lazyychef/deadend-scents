(() => {
  'use strict';
  const PREFIX='deadend-admin-v3:';
  const DEFAULT_TTL=120000;
  const originalFetch=window.fetch.bind(window);
  let bypassUntil=0;
  const now=()=>Date.now();
  const isAppsRead=(url,opts={})=>{
    const method=String(opts.method||'GET').toUpperCase();
    if(method!=='GET') return false;
    const u=String(url||'');
    if(!/script\.google\.com\/macros\/s\//i.test(u)) return false;
    if(!/[?&]action=/.test(u)) return false;
    if(/[?&]action=(writeStatus|dailyPickWeather)\b/i.test(u)) return false;
    return true;
  };
  const keyFor=(url)=>{
    try{ const u=new URL(String(url),location.href); u.searchParams.delete('t'); return PREFIX+u.toString(); }
    catch(e){ return PREFIX+String(url).replace(/([?&])t=\d+/,'$1'); }
  };
  const read=(key)=>{try{const x=JSON.parse(sessionStorage.getItem(key)||'null'); if(!x||!x.time||!x.body)return null; if(now()-x.time>DEFAULT_TTL)return null; return x;}catch(e){return null;}};
  const write=(key,body,status=200,headers={})=>{try{sessionStorage.setItem(key,JSON.stringify({time:now(),body,status,headers}));}catch(e){}};
  window.fetch=async function(input,opts={}){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(isAppsRead(url,opts) && now()>bypassUntil){
      const key=keyFor(url), cached=read(key);
      if(cached){
        window.dispatchEvent(new CustomEvent('deadend:data-status',{detail:{source:'cache',time:cached.time}}));
        return new Response(cached.body,{status:cached.status||200,headers:{'Content-Type':'application/json','X-DeadEnd-Cache':'HIT'}});
      }
      const res=await originalFetch(input,opts), clone=res.clone();
      if(res.ok){try{const body=await clone.text(); write(key,body,res.status); window.dispatchEvent(new CustomEvent('deadend:data-status',{detail:{source:'live',time:now()}}));}catch(e){}}
      return res;
    }
    return originalFetch(input,opts);
  };
  window.DeadEndAdminData={
    clear(){try{Object.keys(sessionStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>sessionStorage.removeItem(k));}catch(e){} bypassUntil=now()+15000; window.dispatchEvent(new CustomEvent('deadend:data-status',{detail:{source:'refreshing',time:now()}}));},
    freshFor(ms=15000){this.clear();bypassUntil=now()+ms;},
    cacheAge(){let newest=0;try{Object.keys(sessionStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>{const x=JSON.parse(sessionStorage.getItem(k)||'null');if(x&&x.time)newest=Math.max(newest,x.time)});}catch(e){}return newest?now()-newest:null;}
  };
})();
