const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PORT    = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';

const server = http.createServer((req, res) => {

  // ── Serviranje index.html ──────────────────────────────────
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // ── Proxy ka Anthropic API ─────────────────────────────────
  if (req.method === 'POST' && req.url === '/api/messages') {
    if (!API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: { message: 'ANTHROPIC_API_KEY nije postavljen na serveru.' }
      }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const options = {
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers: {
          'content-type':      'application/json',
          'x-api-key':         API_KEY,
          'anthropic-version': '2023-06-01',
          'content-length':    Buffer.byteLength(body)
        }
      };

      const proxy = https.request(options, apiRes => {
        res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
        apiRes.pipe(res);
      });

      proxy.on('error', err => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Proxy greška: ' + err.message } }));
      });

      proxy.write(body);
      proxy.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server pokrenut na http://localhost:${PORT}`);
  if (!API_KEY) console.warn('UPOZORENJE: ANTHROPIC_API_KEY nije postavljen. Postavi ga pre koriscenja AI analize.');
});
