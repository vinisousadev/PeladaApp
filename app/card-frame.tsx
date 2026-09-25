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
      <polygon points={outline} fill="none" stroke={`url(#${id})`} strokeWidth={level >= 90 ? 3 : level >= 80 ? 2 : 1.3} vectorEffect="non-scaling-stroke"/>
      {level >= 70 && <svg x="2" y="1.4" width="96" height="97.2" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points={outline} fill="none" stroke="#ffe65a" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
      </svg>}
      {level >= 70 && <g fill={`url(#${id})`}>
        <path d="M1 10 L8 8.8 L3 12 L1 20 Z M99 10 L92 8.8 L97 12 L99 20 Z M1 80 L3 86 L10 91 L1 87 Z M99 80 L97 86 L90 91 L99 87 Z"/>
      </g>}
      {level >= 90 && <g fill={`url(#${id})`} stroke="#fff5b0" strokeWidth=".25">
        <path d="M0 25 L2 32 L0 39 L-1 32 Z M100 25 L102 32 L100 39 L98 32 Z M0 66 L2 73 L0 80 L-1 73 Z M100 66 L102 73 L100 80 L98 73 Z M16 6 L28 0 L22 4 Z M72 0 L84 6 L78 4 Z M14 94 L28 97 L21 96.5 Z M72 97 L86 94 L79 96.5 Z"/>
      </g>}
      {level >= 80 && <g fill="#fff9d4">
        <path d="M0 45 L.6 48 L2 49 L.6 50 L0 53 L-.6 50 L-2 49 L-.6 48 Z M100 57 L100.6 60 L102 61 L100.6 62 L100 65 L99.4 62 L98 61 L99.4 60 Z"/>
      </g>}
    </svg>
    {level === 100 && <svg className="evolution-crown" viewBox="0 0 48 32" aria-hidden="true">
      <path d="M5 8 L15 16 L24 2 L33 16 L43 8 L38 27 L10 27 Z" fill="#ffd000" stroke="#fff3a2" strokeWidth="1.5"/>
      <path d="M10 27 H38 V31 H10 Z" fill="#ffdf36"/><path d="M24 6 L19 22 H29 Z" fill="#fff3a2"/>
    </svg>}
  </>;
}
