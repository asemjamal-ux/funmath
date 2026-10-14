import { useReducedMotion } from '../app/hooks';

function Palm({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} 150) scale(${s})`}>
      <path d="M0 0q4-40-2-70" stroke="var(--art-trunk)" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M-2-70q-26-8-40 6 18-6 40-6zm0 0q24-12 40 2-18-4-40-2zm0 0q-14-18-34-16 20 4 34 16zm0 0q14-20 32-16-18 2-32 16z" fill="var(--art-grass-dark)" />
      <circle cx="-4" cy="-64" r="3" fill="var(--art-date)" />
      <circle cx="2" cy="-63" r="3" fill="var(--art-date)" />
    </g>
  );
}

/**
 * Layered Oasis for Oasis Stages 1–10 (PRD §7.1). Decorative; the caption carries the meaning (DS §8.5).
 * Each stage adds elements: grass, first palm, pond, flowers, birds, tent, more palms, lanterns, a well, sunset glow.
 */
export function OasisScene({ stage, growing }: { stage: number; growing?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <svg className={`oasis${growing && !reduced ? ' oasis--grow' : ''}`} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--art-sky)" />
          <stop offset="1" stopColor="var(--art-sky-low)" />
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill="url(#sky)" />
      <circle cx="340" cy="44" r="22" fill="var(--color-sun)" opacity={stage >= 10 ? 1 : 0.85} />
      <path d="M0 140q100-40 200-10t200-20v90H0z" fill="var(--art-dune-dark)" />
      <path d="M0 160q120-30 230 0t170-10v50H0z" fill="var(--art-dune)" />
      {stage === 1 && <g className="oasis__layer"><path d="M200 166v-14" stroke="var(--art-grass-dark)" strokeWidth="4" strokeLinecap="round" /><path d="M200 156q-12-10-18-2 8 4 18 2zm0-2q10-12 18-4-8 6-18 4z" fill="var(--art-grass)" stroke="var(--color-ink)" strokeWidth="2" /></g>}
      {stage >= 2 && <g className="oasis__layer"><path d="M120 162q20-10 40 0 20-12 40 0 20-10 40 0" stroke="var(--art-grass)" strokeWidth="8" fill="none" strokeLinecap="round" /></g>}
      {stage >= 3 && <g className="oasis__layer"><Palm x={150} /></g>}
      {stage >= 4 && <g className="oasis__layer"><ellipse cx="215" cy="172" rx="52" ry="12" fill="var(--art-water)" /><ellipse cx="205" cy="170" rx="22" ry="4" fill="var(--art-water-dark)" opacity="0.4" /></g>}
      {stage >= 5 && <g className="oasis__layer">{[110, 270, 292].map((x) => <circle key={x} cx={x} cy={166} r="5" fill="var(--art-flower)" />)}</g>}
      {stage >= 6 && <g className="oasis__layer"><path d="M60 60q8-8 16 0 8-8 16 0M250 40q6-6 12 0 6-6 12 0" stroke="var(--art-bird)" strokeWidth="3" fill="none" strokeLinecap="round" /></g>}
      {stage >= 7 && <g className="oasis__layer"><path d="M300 160l30-40 30 40z" fill="var(--art-tent)" /><path d="M330 120v40" stroke="var(--color-ink)" strokeWidth="2" /></g>}
      {stage >= 8 && <g className="oasis__layer"><Palm x={260} s={0.85} /><Palm x={95} s={0.75} /></g>}
      {stage >= 9 && <g className="oasis__layer">{[180, 245].map((x) => <g key={x}><path d={`M${x} 158v-22`} stroke="var(--color-ink)" strokeWidth="2" /><rect x={x - 5} y="128" width="10" height="12" rx="3" fill="var(--art-lantern)" /></g>)}</g>}
      {stage >= 10 && <g className="oasis__layer"><rect x="36" y="146" width="34" height="18" rx="4" fill="var(--art-dune-dark)" stroke="var(--art-trunk)" strokeWidth="3" /><path d="M40 146v-16h26v16M36 130h34" stroke="var(--art-trunk)" strokeWidth="3" fill="none" /></g>}
    </svg>
  );
}
