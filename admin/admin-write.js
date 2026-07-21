(function(){
  function requestId(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function readStatus(endpoint,id){
    const url=endpoint+(endpoint.includes('?')?'&':'?')+'action=writeStatus&requestId='+encodeURIComponent(id)+'&t='+Date.now();
    const response=await fetch(url,{cache:'no-store',redirect:'follow'});
    if(!response.ok) throw new Error('Write status check failed ('+response.status+').');
    return response.json();
  }

  async function submit(endpoint,payload,options){
    if(!endpoint) throw new Error('Admin write endpoint is missing in settings.json');
    const opts=options||{}, id=requestId();
    const outgoing=Object.assign({},payload,{requestId:id});
    const body=new URLSearchParams();
    body.set('payload',JSON.stringify(outgoing));

    // Apps Script web apps do not expose a dependable cross-origin POST response.
    // A simple no-CORS POST guarantees delivery, while the request-specific
    // status endpoint returns the real success result or server error.
    await fetch(endpoint,{
      method:'POST',
      mode:'no-cors',
      cache:'no-store',
      credentials:'omit',
      redirect:'follow',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:body.toString()
    });

    const timeout=Number(opts.timeout)||45000;
    const started=Date.now();
    while(Date.now()-started<timeout){
      await sleep(500);
      const status=await readStatus(endpoint,id);
      if(status.status==='complete') return status;
      if(status.status==='error'||status.ok===false) throw new Error(status.error||'Apps Script write failed.');
    }
    throw new Error('Apps Script did not confirm the write within '+Math.round(timeout/1000)+' seconds.');
  }

  window.DeadEndAdminWrite={submit};
})();
