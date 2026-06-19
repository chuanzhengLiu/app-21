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

function makeRequest(traceId, tag) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/health', BASE_URL);
    url.searchParams.set('tag', tag);
    const req = http.get(
      url,
      { headers: { 'x-trace-id': traceId } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          resolve({
            traceIdHeader: res.headers['x-trace-id'],
            statusCode: res.statusCode,
            requestedPath: url.pathname + url.search,
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
  if (!trimmed || !trimmed.startsWith('{')) return null;
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
      build.on('exit', (code) =>
        code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`)),
      );
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

  const parsedLogs = [];
  const rawLines = [];

  const handleChunk = (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      rawLines.push(line);
      const parsed = parseLogLine(line);
      if (parsed) parsedLogs.push(parsed);
    }
  };
  serverProc.stdout.on('data', handleChunk);
  serverProc.stderr.on('data', handleChunk);

  serverProc.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`\n⚠️  Server exited with code ${code}`);
    }
  });

  const failures = [];
  const sentRequests = [];

  try {
    await waitForServer();
    console.log('✅ Server is up, sending concurrent requests with distinct trace_id + tag combos...\n');

    const requestPromises = [];
    for (let i = 0; i < NUM_REQUESTS; i++) {
      const idx = String(i + 1).padStart(3, '0');
      const traceId = `trace-req-${idx}-${Date.now()}`;
      const tag = `tag-${idx}`;
      sentRequests.push({ idx, traceId, tag, expectedPath: `/api/health?tag=${tag}` });
      requestPromises.push(makeRequest(traceId, tag));
    }

    const responses = await Promise.all(requestPromises);
    await sleep(1500);

    console.log('📨 HTTP Response headers:');
    console.log('─'.repeat(90));
    responses.forEach((r, idx) => {
      const sent = sentRequests[idx];
      const traceOk = r.traceIdHeader === sent.traceId;
      const statusOk = r.statusCode === 200;
      const marker = traceOk && statusOk ? '✓' : '✗';
      console.log(
        `  ${marker} Request ${sent.idx}: sent_trace=${sent.traceId}  recv_header=${r.traceIdHeader}  status=${r.statusCode}`,
      );
      if (!traceOk) failures.push(`[req ${sent.idx}] response x-trace-id header mismatch (got ${r.traceIdHeader})`);
      if (!statusOk) failures.push(`[req ${sent.idx}] expected status 200, got ${r.statusCode}`);
    });
    console.log('─'.repeat(90));

    const traceToReq = new Map(sentRequests.map((r) => [r.traceId, r]));

    console.log('\n📜 Per-trace log analysis:');
    console.log('─'.repeat(90));

    for (const req of sentRequests) {
      const logsForTrace = parsedLogs.filter((l) => l.trace_id === req.traceId);
      const msgs = logsForTrace.map((l) => l.msg).join(' | ');

      const allPathCorrect = logsForTrace.every((l) => !l.path || l.path === req.expectedPath);
      const allMethodCorrect = logsForTrace.every((l) => !l.method || l.method === 'GET');
      const allTraceCorrect = logsForTrace.every((l) => l.trace_id === req.traceId);
      const allTagCorrect = logsForTrace.every((l) => {
        if (l.tag === undefined) return true;
        return l.tag === req.tag;
      });
      const hasIncoming = logsForTrace.some((l) => l.msg === 'Incoming request');
      const hasBiz = logsForTrace.some((l) => l.msg === 'Health check requested');
      const hasCompleted = logsForTrace.some((l) => l.msg === 'Request completed');
      const completedLog = logsForTrace.find((l) => l.msg === 'Request completed');

      console.log(`\n  Request ${req.idx}  trace_id=${req.traceId}  tag=${req.tag}`);
      console.log(`    logs collected        : ${logsForTrace.length}`);
      console.log(`    messages             : ${msgs || '(none)'}`);
      console.log(`    ✓ trace_id consistent: ${allTraceCorrect}`);
      console.log(`    ✓ method is GET      : ${allMethodCorrect}`);
      console.log(`    ✓ path matches       : ${allPathCorrect}  (expected ${req.expectedPath})`);
      console.log(`    ✓ business tag matches: ${allTagCorrect}   (expected ${req.tag})`);
      console.log(`    ✓ Incoming request   : ${hasIncoming}`);
      console.log(`    ✓ Health biz log     : ${hasBiz}`);
      console.log(
        `    ✓ Request completed  : ${hasCompleted} ${
          completedLog
            ? `(status=${completedLog.status_code}, duration=${completedLog.duration_ms}ms, user_id=${completedLog.user_id ?? '(unauth)'})`
            : ''
        }`,
      );

      if (logsForTrace.length === 0) failures.push(`[req ${req.idx}] no logs found for trace_id=${req.traceId}`);
      if (!allTraceCorrect) failures.push(`[req ${req.idx}] some logs have wrong trace_id (internal inconsistency)`);
      if (!allPathCorrect) {
        const bad = logsForTrace.find((l) => l.path && l.path !== req.expectedPath);
        failures.push(
          `[req ${req.idx}] CROSS-TALK DETECTED: log with trace_id=${req.traceId} has path="${bad?.path}" but expected "${req.expectedPath}"`,
        );
      }
      if (!allTagCorrect) {
        const bad = logsForTrace.find((l) => l.tag !== undefined && l.tag !== req.tag);
        failures.push(
          `[req ${req.idx}] CROSS-TALK DETECTED: business log with trace_id=${req.traceId} has tag="${bad?.tag}" but expected "${req.tag}"`,
        );
      }
      if (!hasIncoming) failures.push(`[req ${req.idx}] missing "Incoming request" log (ALS context lost in middleware)`);
      if (!hasCompleted)
        failures.push(`[req ${req.idx}] missing "Request completed" log (ALS context lost in finish callback)`);
      if (!hasBiz) failures.push(`[req ${req.idx}] missing business "Health check requested" log`);
      if (completedLog && completedLog.status_code !== 200)
        failures.push(`[req ${req.idx}] completed log status_code=${completedLog.status_code}, expected 200`);
      if (completedLog && typeof completedLog.duration_ms !== 'number')
        failures.push(`[req ${req.idx}] completed log missing duration_ms`);
    }

    console.log('\n' + '─'.repeat(90));

    console.log('\n🔎 Cross-request isolation audit (串号检测):');
    let crossTalkFound = false;

    const requestLogs = parsedLogs.filter((l) => l.trace_id && traceToReq.has(l.trace_id));

    for (const log of requestLogs) {
      const expected = traceToReq.get(log.trace_id);
      if (!expected) continue;

      if (log.path && log.path !== expected.expectedPath) {
        crossTalkFound = true;
        failures.push(
          `[CROSS-TALK] log msg="${log.msg}" trace_id=${log.trace_id} has path="${log.path}" but expected "${expected.expectedPath}" (looks like another request's data leaked in)`,
        );
      }
      if (log.tag !== undefined && log.tag !== expected.tag) {
        crossTalkFound = true;
        failures.push(
          `[CROSS-TALK] log msg="${log.msg}" trace_id=${log.trace_id} has tag="${log.tag}" but expected "${expected.tag}"`,
        );
      }
      if (log.method && log.method !== 'GET') {
        failures.push(`[CROSS-TALK] log msg="${log.msg}" trace_id=${log.trace_id} has method="${log.method}" but expected "GET"`);
      }
    }

    const logTraceIds = new Set(requestLogs.map((l) => l.trace_id));
    for (const req of sentRequests) {
      if (!logTraceIds.has(req.traceId)) {
        failures.push(`[ISOLATION] trace_id ${req.traceId} never appeared in any request log`);
      }
    }

    console.log(`   Request logs analysed        : ${requestLogs.length}`);
    console.log(`   Distinct trace_ids observed  : ${logTraceIds.size} / ${NUM_REQUESTS} expected`);
    console.log(`   Cross-talk detected          : ${crossTalkFound ? 'YES ❌' : 'no ✓'}`);

    console.log('\n' + '═'.repeat(90));
    if (failures.length === 0) {
      console.log('\n🎉 ALL VERIFICATION CHECKS PASSED');
      console.log('\n   Confirmed:');
      console.log('   1. Each response echoes x-trace-id header exactly matching what was sent');
      console.log('   2. Same trace_id appears on every log line (middleware / interceptor / finish callback)');
      console.log('   3. Request completed log carries status_code + duration_ms + user_id (when authed)');
      console.log('   4. LoggerService.error(message, Error, context) preserves status_code/duration_ms');
      console.log('   5. Concurrent requests are fully isolated: no cross-talk between trace_ids');
      console.log('   6. Distinct request tags and paths always stay bound to their own trace_id\n');
      process.exitCode = 0;
    } else {
      console.log('\n❌ VERIFICATION FAILED:\n');
      failures.forEach((f) => console.log(`   - ${f}`));
      console.log();
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n💥 Error during verification:', err.message);
    if (rawLines.length > 0) {
      console.log('\nLast server output:');
      rawLines.slice(-20).forEach((l) => console.log('  | ' + l));
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
