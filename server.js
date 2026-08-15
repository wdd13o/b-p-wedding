const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const DATA_PATH = process.env.RSVP_DATA_PATH || path.join(__dirname, 'data', 'rsvps.json');
const PUBLIC_DIR = __dirname;

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '[]', 'utf8');
  }
}

function readEntries() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read RSVP data:', error);
    return [];
  }
}

function writeEntries(entries) {
  ensureDataFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

let pendingWrite = Promise.resolve();

function appendEntry(entry) {
  pendingWrite = pendingWrite
    .then(() => {
      const entries = readEntries();
      entries.push(entry);
      writeEntries(entries);
      return entry;
    })
    .catch((error) => {
      console.error('Failed to append RSVP entry:', error);
      throw error;
    });

  return pendingWrite;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const safePath = path.normalize(requestPath).replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/rsvps') {
    if (req.method === 'GET') {
      sendJson(res, 200, readEntries());
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const entry = {
            name: String(payload.name || '').trim(),
            phone: String(payload.phone || '').trim(),
            attendance: String(payload.attendance || '').trim(),
            guests: String(payload.guests || '0').trim(),
            partyRole: String(payload.partyRole || '').trim(),
            song: String(payload.song || '').trim(),
            talent: String(payload.talent || '').trim(),
            submittedAt: payload.submittedAt || new Date().toISOString(),
          };

          await appendEntry(entry);
          sendJson(res, 200, entry);
        } catch (error) {
          console.error('Failed to save RSVP payload:', error);
          sendJson(res, 400, { error: 'Invalid RSVP payload' });
        }
      });
      return;
    }
  }

  serveStaticFile(req, res);
});

server.listen(PORT, () => {
  console.log(`RSVP server running on http://localhost:${PORT}`);
});
