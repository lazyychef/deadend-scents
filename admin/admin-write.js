(function(){
  window.DeadEndAdminWrite = {
    submit: async function(endpoint, payload){
      if(!endpoint) throw new Error('Admin write endpoint is missing in settings.json');
      return new Promise(function(resolve){
        const iframeName = 'deadendWriteFrame_' + Date.now();
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = endpoint;
        form.target = iframeName;
        form.style.display = 'none';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'payload';
        input.value = JSON.stringify(payload);
        form.appendChild(input);
        document.body.appendChild(form);

        let done = false;
        const cleanup = function(ok){
          if(done) return;
          done = true;
          setTimeout(function(){ form.remove(); iframe.remove(); }, 500);
          resolve({ ok: ok !== false });
        };
        iframe.addEventListener('load', function(){ cleanup(true); });
        form.submit();
        setTimeout(function(){ cleanup(true); }, 2200);
      });
    }
  };
})();
