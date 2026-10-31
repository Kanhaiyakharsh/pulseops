import { healthResponseSchema } from '@pulseops/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function check(name: string, run: () => Promise<string>): Promise<CheckResult> {
  try {
    return { name, ok: true, detail: await run() };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function getJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main(): Promise<void> {
  const results: CheckResult[] = [];

  results.push(
    await check('Backend liveness', async () => {
      const { status } = await getJson(`${API_URL}/health/live`);
      assert(status === 200, `expected HTTP 200, got ${status}`);
      return `${API_URL}/health/live -> 200`;
    }),
  );

  const readiness = await check('Backend readiness', async () => {
    const { status, body } = await getJson(`${API_URL}/health`);
    const report = healthResponseSchema.parse(body);
    assert(status === 200, `expected HTTP 200, got ${status} (status: ${report.status})`);
    return `v${report.version}, ${report.environment}`;
  });
  results.push(readiness);

  for (const dependency of ['mongodb', 'redis'] as const) {
    results.push(
      await check(`${dependency === 'mongodb' ? 'MongoDB' : 'Redis'} connection`, async () => {
        const { body } = await getJson(`${API_URL}/health`);
        const report = healthResponseSchema.parse(body);
        const result = report.checks[dependency];
        assert(result.status === 'up', result.error ?? 'dependency is down');
        return `ping ok in ${result.latencyMs} ms`;
      }),
    );
  }

  results.push(
    await check('API versioning (/health is not served unversioned)', async () => {
      const { status } = await getJson(`${new URL(API_URL).origin}/health`);
      assert(status === 404, `expected HTTP 404, got ${status}`);
      return 'unversioned route -> 404';
    }),
  );

  results.push(
    await check('Frontend dev server', async () => {
      const res = await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(5_000) });
      assert(res.status === 200, `expected HTTP 200, got ${res.status}`);
      assert((await res.text()).includes('id="root"'), 'index.html has no #root element');
      return `${FRONTEND_URL} -> 200`;
    }),
  );

  results.push(
    await check('Frontend -> backend proxy', async () => {
      const { status, body } = await getJson(`${FRONTEND_URL}/api/v1/health`);
      const report = healthResponseSchema.parse(body);
      assert(status === 200 && report.status === 'ok', `proxy returned HTTP ${status}`);
      return `${FRONTEND_URL}/api/v1/health -> ok`;
    }),
  );

  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}: ${result.detail}`);
  }

  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
