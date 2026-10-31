import type { HealthResponse } from '@pulseops/shared';

import { PulseLine, type PulseTone } from '@/components/PulseLine';
import { ServiceRow, type ServiceStatus } from '@/components/ServiceRow';
import { type HealthState, useHealth } from '@/hooks/useHealth';
import { formatClock, formatDuration, formatLatency } from '@/lib/format';

interface View {
  tone: PulseTone;
  headline: string;
  api: ServiceStatus;
}

function describe(state: HealthState): View {
  switch (state.phase) {
    case 'loading':
      return { tone: 'idle', headline: 'Checking systems', api: 'unknown' };
    case 'unreachable':
      return { tone: 'error', headline: 'The API is not responding', api: 'down' };
    case 'ready':
      return state.report.status === 'ok'
        ? { tone: 'ok', headline: 'All systems responding', api: 'up' }
        : { tone: 'error', headline: 'A dependency is down', api: 'up' };
  }
}

function dependency(
  report: HealthResponse | undefined,
  name: keyof HealthResponse['checks'],
): { status: ServiceStatus; latency: string; note?: string } {
  const check = report?.checks[name];
  if (!check) return { status: 'unknown', latency: '—' };
  return {
    status: check.status,
    latency: formatLatency(check.latencyMs),
    ...(check.error ? { note: check.error } : {}),
  };
}

export function App() {
  const { state, refresh, isRefreshing } = useHealth();
  const view = describe(state);
  const report = state.phase === 'ready' ? state.report : undefined;
  const mongo = dependency(report, 'mongodb');
  const redis = dependency(report, 'redis');

  return (
    <main className="shell" data-tone={view.tone}>
      <header className="masthead">
        <h1 className="wordmark">PulseOps</h1>
        <button
          type="button"
          className="button"
          disabled={isRefreshing}
          onClick={() => {
            void refresh();
          }}
        >
          {isRefreshing ? 'Checking…' : 'Check now'}
        </button>
      </header>

      <PulseLine tone={view.tone} />

      <section aria-labelledby="headline">
        <h2 id="headline" className="headline" role="status">
          {view.headline}
        </h2>
        <p className="meta">
          {state.phase === 'loading'
            ? 'Contacting the API…'
            : `Last checked at ${formatClock(state.checkedAt)}. Refreshes every 10 seconds.`}
        </p>
        {state.phase === 'unreachable' ? (
          <p className="problem">
            {state.message}. Start the backend with <code>npm run dev</code> and check that{' '}
            <code>API_PROXY_TARGET</code> in <code>.env</code> points at it.
          </p>
        ) : null}
      </section>

      <table className="services">
        <caption className="visually-hidden">Service status</caption>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">
              Latency
            </th>
          </tr>
        </thead>
        <tbody>
          <ServiceRow
            name="API server"
            status={view.api}
            latency={state.phase === 'ready' ? formatLatency(state.roundTripMs) : '—'}
          />
          <ServiceRow name="MongoDB" {...mongo} />
          <ServiceRow name="Redis" {...redis} />
        </tbody>
      </table>

      {report ? (
        <dl className="facts">
          <div>
            <dt>Environment</dt>
            <dd>{report.environment}</dd>
          </div>
          <div>
            <dt>API version</dt>
            <dd>{report.version}</dd>
          </div>
          <div>
            <dt>API uptime</dt>
            <dd>{formatDuration(report.uptimeSeconds)}</dd>
          </div>
        </dl>
      ) : null}
    </main>
  );
}
