(function(){
  window.DeadEndAdminWrite = {
    submit: async function(endpoint, payload){
      if(!endpoint) throw new Error('Admin write endpoint is missing in settings.json');

      return new Promise(function(resolve, reject){
        const iframeName = 'deadendWriteFrame_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';

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

        let submitted = false;
        let finished = false;
        let timeoutId = null;

        function cleanup(){
          if(finished) return;
          finished = true;
          if(timeoutId) clearTimeout(timeoutId);
          setTimeout(function(){
            form.remove();
            iframe.remove();
          }, 500);
          resolve({ok:true});
        }

        iframe.addEventListener('load', function(){
          // The first load is the iframe's initial about:blank document.
          // Submit only after that document is ready so it cannot trigger an
          // early cleanup before Apps Script receives the POST.
          if(!submitted){
            submitted = true;
            try {
              form.submit();
            } catch(err){
              finished = true;
              form.remove();
              iframe.remove();
              reject(err);
            }
            return;
          }

          // The second load is the Apps Script response/redirect.
          cleanup();
        });

        document.body.appendChild(iframe);
        document.body.appendChild(form);

        // Do not report success early. This fallback only releases the UI if
        // Safari suppresses the cross-origin iframe load event; the Orders page
        // still verifies the spreadsheet write before showing success.
        timeoutId = setTimeout(cleanup, 12000);
      });
    }
  };
})();
