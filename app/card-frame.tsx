import {useId} from 'react';

const outline = '0,8 16,6 28,0 42,4 50,0 58,4 72,0 84,6 100,8 100,87 86,94 50,100 14,94 0,87';

/** Vector trim stays sharp in the exported PNG and never changes photo framing. */
export function CardFrame({level}: {level: number}) {
  const id = useId().replace(/:/g, '') + '-gold';
  if (level < 60) return null;
  return <>
    <svg className="evolution-trim" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff6b5"/><stop offset=".2" stopColor="#ffd000"/>
        <stop offset=".45" stopColor="#fff1a0"/><stop offset=".65" stopColor="#e8ae00"/>
        <stop offset=".85" stopColor="#ffe94a"/><stop offset="1" stopColor="#fff9cf"/>
      </linearGradient></defs>
      {/* Concentric strokes share one contour; scaling a second polygon misaligns corners. */}
      <g fill="none" strokeLinejoin="round">
        <polygon points={outline} stroke={`url(#${id})`} strokeWidth={level >= 90 ? 6 : level >= 70 ? 4.5 : 1.8} vectorEffect="non-scaling-stroke"/>
        {level >= 70 && <>
          <polygon points={outline} stroke="#503700" strokeWidth={level >= 90 ? 3.4 : 2.4} vectorEffect="non-scaling-stroke"/>
          <polygon points={outline} stroke="#ffe65a" strokeWidth={level >= 90 ? 1.5 : 1} vectorEffect="non-scaling-stroke"/>
        </>}
      </g>
      {level >= 90 && <g fill={`url(#${id})`} stroke="#fff5b0" strokeWidth=".25">
        <path d="M0 25 L.9 32 L0 39 L-.9 32 Z M100 25 L100.9 32 L100 39 L99.1 32 Z M0 66 L.9 73 L0 80 L-.9 73 Z M100 66 L100.9 73 L100 80 L99.1 73 Z"/>
      </g>}
      {level >= 70 && <g fill="#fff9d4">
        <path d="M0 45 L.6 48 L2 49 L.6 50 L0 53 L-.6 50 L-2 49 L-.6 48 Z M100 57 L100.6 60 L102 61 L100.6 62 L100 65 L99.4 62 L98 61 L99.4 60 Z"/>
      </g>}
    </svg>
    {level === 100 && <svg className="evolution-crown" viewBox="0 0 48 32" aria-hidden="true">
      <path d="M5 8 L15 16 L24 2 L33 16 L43 8 L38 27 L10 27 Z" fill="#ffd000" stroke="#fff3a2" strokeWidth="1.5"/>
      <path d="M10 27 H38 V31 H10 Z" fill="#ffdf36"/><path d="M24 6 L19 22 H29 Z" fill="#fff3a2"/>
    </svg>}
  </>;
}
