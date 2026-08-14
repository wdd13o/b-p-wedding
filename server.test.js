const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appDir = __dirname;
const dataFile = path.join(appDir, 'data', 'test-rsvps.json');

function waitForServer(port, timeoutMs = 5000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(`http://127.0.0.1:${port}/api/rsvps`)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() - start > timeoutMs) {
            reject(new Error('Server did not start in time'));
            return;
          }
          setTimeout(check, 100);
        });
    };

    check();
  });
}

test('RSVP API stores and returns entries from a shared backend', async () => {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, '[]', 'utf8');

  const child = spawn(process.execPath, ['server.js'], {
    cwd: appDir,
    env: {
      ...process.env,
      PORT: '4050',
      RSVP_DATA_PATH: dataFile,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(4050);

    const postResponse = await fetch('http://127.0.0.1:4050/api/rsvps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Jane Doe',
        phone: '555-1234',
        attendance: 'attending',
        guests: '2',
        partyRole: 'Guest',
        song: 'Amazing Grace',
        talent: '',
        submittedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
      }),
    });

    assert.equal(postResponse.status, 200);
    const created = await postResponse.json();
    assert.equal(created.name, 'Jane Doe');

    const getResponse = await fetch('http://127.0.0.1:4050/api/rsvps');
    assert.equal(getResponse.status, 200);
    const entries = await getResponse.json();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].name, 'Jane Doe');
  } finally {
    child.kill('SIGTERM');
  }
});
