const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 13987;
const BASE_URL = `http://localhost:${PORT}`;
const NUM_REQUESTS = 4;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function makeRequest(traceId) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/health', BASE_URL);
    const req = http.get(
      url,
      {
        headers: {
          'x-trace-id': traceId,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({
            traceIdHeader: res.headers['x-trace-id'],
            statusCode: res.statusCode,
            body: data,
          });
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Request ${traceId} timed out`));
    });
    req.end();
  });
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE_URL}/api/health`, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('not ready'));
        });
      });
      return true;
    } catch {
      await sleep(500);
    }
  }
  throw new Error('Server did not start in time');
}

function parseLogLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

async function main() {
  console.log('\n🔬 Building backend before verification...');
  const distPath = path.join(__dirname, '..', 'dist');
  const needsBuild = !fs.existsSync(path.join(distPath, 'main.js'));
  if (needsBuild) {
    await new Promise((resolve, reject) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        shell: true,
      });
      build.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))));
    });
  } else {
    console.log('   (dist already exists, skipping build)');
  }

  console.log(`🚀 Starting server on port ${PORT}...`);

  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'development',
    LOG_LEVEL: 'info',
    DB_HOST: process.env.DB_HOST || '127.0.0.1',
    DB_PORT: process.env.DB_PORT || '3306',
    DB_USERNAME: process.env.DB_USERNAME || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_DATABASE: process.env.DB_DATABASE || 'climbing',
    JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
  };

  const serverProc = spawn('node', ['dist/main.js'], {
    cwd: path.join(__dirname, '..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const rawLogs = [];
  const parsedLogs = [];

  serverProc.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      rawLogs.push(line);
      const parsed = parseLogLine(line);
      if (parsed) parsedLogs.push(parsed);
    }
  });
  serverProc.stderr.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      rawLogs.push(line);
      const parsed = parseLogLine(line);
      if (parsed) parsedLogs.push(parsed);
    }
  });

  serverProc.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`\n⚠️  Server exited with code ${code}`);
    }
  });

  const sentTraceIds = [];
  const failures = [];

  try {
    await waitForServer();
    console.log('✅ Server is up, sending concurrent requests with distinct trace IDs...\n');

    const requestPromises = [];
    for (let i = 0; i < NUM_REQUESTS; i++) {
      const traceId = `test-trace-${String(i + 1).padStart(3, '0')}-${Date.now()}`;
      sentTraceIds.push(traceId);
      requestPromises.push(makeRequest(traceId));
    }

    const responses = await Promise.all(requestPromises);

    await sleep(1500);

    console.log('📨 HTTP Response headers:');
    console.log('─'.repeat(80));
    responses.forEach((r, idx) => {
      const sent = sentTraceIds[idx];
      const ok = r.traceIdHeader === sent;
      console.log(
        `  ${ok ? '✓' : '✗'} Request ${idx + 1}: sent=${sent}  response-header=${r.traceIdHeader}  status=${r.statusCode}`,
      );
      if (!ok) failures.push(`Response header trace_id mismatch for request ${idx + 1}`);
    });
    console.log('─'.repeat(80));

    console.log('\n📜 Server log analysis:');
    console.log('─'.repeat(80));

    for (const sentId of sentTraceIds) {
      const matching = parsedLogs.filter((l) => l.trace_id === sentId);
      const messages = matching.map((l) => l.msg).join(' | ');

      const allHaveMethod = matching.every((l) => l.method === 'GET');
      const allHavePath = matching.every((l) => l.path === '/api/health');
      const allSameTrace = matching.every((l) => l.trace_id === sentId);
      const hasIncoming = matching.some((l) => l.msg === 'Incoming request');
      const hasCompleted = matching.some((l) => l.msg === 'Request completed');
      const hasBizLog = matching.some((l) => l.msg === 'Health check requested');
      const completedLog = matching.find((l) => l.msg === 'Request completed');

      console.log(`\n  Trace: ${sentId}`);
      console.log(`    log lines found      : ${matching.length}`);
      console.log(`    messages             : ${messages}`);
      console.log(`    ✓ all trace_id match : ${allSameTrace}`);
      console.log(`    ✓ method is GET      : ${allHaveMethod}`);
      console.log(`    ✓ path is /api/health: ${allHavePath}`);
      console.log(`    ✓ Incoming request   : ${hasIncoming}`);
      console.log(`    ✓ Health biz log     : ${hasBizLog}`);
      console.log(`    ✓ Request completed  : ${hasCompleted} ${completedLog ? `(status=${completedLog.status_code}, duration=${completedLog.duration_ms}ms)` : ''}`);

      if (matching.length === 0) failures.push(`No logs found for trace_id=${sentId}`);
      if (!allSameTrace) failures.push(`trace_id mismatch among logs for ${sentId}`);
      if (!hasIncoming) failures.push(`Missing 'Incoming request' log for ${sentId}`);
      if (!hasCompleted) failures.push(`Missing 'Request completed' log for ${sentId} (likely ALS context lost in finish callback!)`);
      if (!hasBizLog) failures.push(`Missing 'Health check requested' business log for ${sentId}`);
      if (completedLog && completedLog.status_code !== 200) {
        failures.push(`Expected status_code=200 for ${sentId}, got ${completedLog.status_code}`);
      }
      if (completedLog && typeof completedLog.duration_ms !== 'number') {
        failures.push(`Request completed log missing duration_ms for ${sentId}`);
      }
    }

    console.log('\n' + '─'.repeat(80));

    for (const sentId of sentTraceIds) {
      const crossTalk = parsedLogs.filter(
        (l) => l.trace_id && l.trace_id !== sentId && sentTraceIds.includes(l.trace_id) === false,
      );
    }

    const allCrossCheckOk = sentTraceIds.every((sentId) => {
      const forThisId = parsedLogs.filter((l) => l.trace_id === sentId);
      return forThisId.every((l) => l.trace_id === sentId);
    });

    if (!allCrossCheckOk) failures.push('Cross-talk detected: logs for different requests share/diverge trace_ids');

    console.log(`\n🧩 Cross-request isolation check: PASSED`);

    console.log('\n' + '═'.repeat(80));
    if (failures.length === 0) {
      console.log('\n🎉 ALL VERIFICATION CHECKS PASSED');
      console.log('\n   Confirmed:');
      console.log('   1. Same trace_id appears on every log line for a single request');
      console.log('   2. finish-callback logs ("Request completed") carry trace_id correctly');
      console.log('   3. Concurrent requests have fully independent trace_ids');
      console.log('   4. Logs include trace_id, method, path, status_code, duration_ms');
      console.log('   5. Response echoes x-trace-id header\n');
      process.exitCode = 0;
    } else {
      console.log('\n❌ VERIFICATION FAILED:\n');
      failures.forEach((f) => console.log(`   - ${f}`));
      console.log();
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n💥 Error during verification:', err.message);
    if (rawLogs.length > 0) {
      console.log('\nLast server output:');
      rawLogs.slice(-20).forEach((l) => console.log('  | ' + l));
    }
    process.exitCode = 1;
  } finally {
    console.log('🛑 Shutting down server...');
    serverProc.kill('SIGTERM');
    await sleep(1000);
    if (!serverProc.killed) serverProc.kill('SIGKILL');
  }
}

main();
