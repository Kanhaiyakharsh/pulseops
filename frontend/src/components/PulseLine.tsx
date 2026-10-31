export type PulseTone = 'ok' | 'error' | 'idle';

const HEARTBEAT =
  'M0 40 H340 L356 34 L372 40 H430 L446 52 L466 6 L488 74 L504 40 H560 L580 30 L604 40 H1200';
const FLATLINE = 'M0 40 H1200';

/** The trace beats while the system is healthy and goes flat when it is not. */
export function PulseLine({ tone }: { tone: PulseTone }) {
  return (
    <svg className="pulse" data-tone={tone} viewBox="0 0 1200 80" aria-hidden="true">
      <path key={tone} d={tone === 'ok' ? HEARTBEAT : FLATLINE} pathLength={1} />
    </svg>
  );
}
