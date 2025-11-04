const { getMagicLink, markMagicLinkUsed, getUserByEmail } = require('../lib/database');

module.exports = async (req, res) => {
  // Support CORS preflight for safety
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // Render a JS-based verifier page so email scanners (that only fetch GET) don't consume tokens
  const tokenFromQuery = (req.query && req.query.token) ? String(req.query.token) : '';
      console.log('[verify GET] URL:', req.url);
      console.log('[verify GET] Query token:', tokenFromQuery || 'NONE');
      console.log('[verify GET] Hash will be read client-side from URL fragment');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>VERA – Verifying…</title>
          <style>
            body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0A0E27;color:#eaeaf1}
            .card{max-width:640px;margin:24px;padding:28px;border:1px solid rgba(177,156,217,.25);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));text-align:center}
            h1{margin:0 0 10px;background:linear-gradient(135deg,#B19CD9,#64B5F6);background-clip:text;-webkit-background-clip:text;color:transparent}
            p{color:rgba(255,255,255,.8)}
            a.btn{display:inline-block;margin-top:14px;padding:12px 18px;border-radius:999px;background:linear-gradient(135deg,#9B59B6,#64B5F6);color:#fff;text-decoration:none;font-weight:600}
          </style>
        </head>
        <body>
          <main class="card">
            <h1>Verifying…</h1>
            <p>Please wait while we confirm your link.</p>
          </main>
          <script>
            (async function(){
              var token = ${JSON.stringify(tokenFromQuery)};
              if (!token) {
                try {
                  var h = (window.location && window.location.hash) ? window.location.hash : '';
                  if (h && h.indexOf('token=') >= 0) {
                    token = decodeURIComponent(h.split('token=')[1] || '');
                  }
                  if (!token) {
                    var qs = new URLSearchParams(window.location.search || '');
                    token = qs.get('token') || '';
                  }
                } catch (e) { token = ''; }
              }
              try {
                const resp = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
                const data = await resp.json();
                if (resp.ok && data && data.success) {
                  if (data.email) localStorage.setItem('userEmail', data.email);
                  if (data.userId) localStorage.setItem('userId', String(data.userId));
                  window.location.href = '/chat.html';
                } else {
                  document.body.innerHTML = '<main class="card"><h1>Link expired or invalid</h1><p>Please request a new magic link and try again.</p><div id="resend"></div><div style="margin-top:14px"><a class="btn" href="/">Back to VERA</a></div></main>';
                  var container = document.getElementById('resend');
                  var savedEmail = (typeof localStorage !== 'undefined' && localStorage.getItem('userEmail')) || '';
                  if (savedEmail) {
                    container.innerHTML = '<div style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">\
                      <button id="resendBtn" class="btn" type="button">Resend to ' + savedEmail + '</button>\
                      <a class="btn" href="/chat.html">Open Chat</a>\
                    </div>';
                    var resendBtn = document.getElementById('resendBtn');
                    resendBtn && resendBtn.addEventListener('click', async function(){
                      try {
                        resendBtn.disabled = true; resendBtn.textContent = 'Sending…';
                        var r = await fetch('/api/auth/send-trial-magic-link', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email: savedEmail }) });
                        if (r.ok) { resendBtn.textContent = 'Link sent ✓'; } else { resendBtn.textContent = 'Failed to send'; resendBtn.disabled = false; }
                      } catch(e){ resendBtn.textContent = 'Failed to send'; resendBtn.disabled = false; }
                    });
                  } else {
                    container.innerHTML = '<form id="resendForm" style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">\
                      <input id="emailInput" type="email" required placeholder="Enter your email" style="padding:10px 12px;border-radius:8px;border:1px solid rgba(177,156,217,.35);background:rgba(255,255,255,.06);color:#eaeaf1"/>\
                      <button class="btn" type="submit">Send link</button>\
                    </form>';
                    var form = document.getElementById('resendForm');
                    form && form.addEventListener('submit', async function(ev){
                      ev.preventDefault();
                      var email = (document.getElementById('emailInput')||{}).value || '';
                      if (!email) return;
                      var btn = form.querySelector('button');
                      try {
                        btn.disabled = true; btn.textContent = 'Sending…';
                        var r2 = await fetch('/api/auth/send-trial-magic-link', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: email }) });
                        if (r2.ok) { btn.textContent = 'Link sent ✓'; } else { btn.textContent = 'Failed to send'; btn.disabled = false; }
                      } catch(e){ btn.textContent = 'Failed to send'; btn.disabled = false; }
                    });
                  }
                }
              } catch (e) {
                document.body.innerHTML = '<main class="card"><h1>Something went wrong</h1><p>Please try again in a moment.</p><a class="btn" href="/">Back to VERA</a></main>';
              }
            })();
          </script>
        </body>
        </html>
      `);
    }

    if (req.method === 'POST') {
      console.log('[verify POST] Received request, body type:', typeof req.body);
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      console.log('[verify POST] Parsed body:', JSON.stringify(body).substring(0, 100));
      const token = body.token ? String(body.token) : '';
      console.log('[verify POST] Token extracted from body:', token.substring(0, 20) + '... (length: ' + token.length + ')');
      
      if (!token) {
        console.log('[verify POST] ERROR: No token provided in request');
        return res.status(400).json({ success: false, error: 'Token required' });
      }

      console.log('[verify POST] Looking up token in database:', token.substring(0, 20) + '...');
      const magicLink = await getMagicLink(token);
      
      if (!magicLink) {
        console.log('[verify POST] ERROR: Token NOT found in database');
        console.log('[verify POST] Token was:', token.substring(0, 20) + '... (length: ' + token.length + ')');
        console.log('[verify POST] Token hex check:', token.match(/^[a-f0-9]+$/) ? 'Valid hex' : 'INVALID hex!');
        return res.status(400).json({ success: false, error: 'Invalid or expired token' });
      }

      console.log('[verify POST] SUCCESS: Token found!');
      console.log('[verify POST] Magic link record:', {
        email: magicLink.email,
        expires_at: magicLink.expires_at,
        used: magicLink.used,
        token_in_db: magicLink.token?.substring(0, 20) + '...'
      });
      
      await markMagicLinkUsed(token);
      const user = await getUserByEmail(magicLink.email);
      console.log('[verify POST] User lookup result:', user ? { id: user.id, email: user.email } : 'NEW_USER');
      return res.status(200).json({ success: true, email: magicLink.email, userId: user ? user.id : null });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
