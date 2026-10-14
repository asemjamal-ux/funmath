/** Rounded line icons (DS §7). Directional icons mirror only through `mirrorInRtl`. */
export type IconName =
  | 'arrow-back' | 'arrow-forward' | 'chevron-start' | 'chevron-end' | 'backspace' | 'exit-door'
  | 'check' | 'star' | 'seed' | 'trophy' | 'lock' | 'speaker' | 'speaker-off' | 'music' | 'play'
  | 'lightbulb' | 'globe' | 'gear' | 'shield' | 'plus' | 'minus' | 'times' | 'divide' | 'leaf'
  | 'close' | 'shuffle' | 'rotate' | 'home' | 'cloud-off' | 'refresh' | 'download' | 'upload' | 'trash' | 'user';

const DIRECTIONAL: ReadonlySet<IconName> = new Set(['arrow-back', 'arrow-forward', 'chevron-start', 'chevron-end', 'backspace', 'exit-door']);

const PATHS: Record<IconName, React.ReactNode> = {
  'arrow-back': <path d="M19 12H5m6-6-6 6 6 6" />,
  'arrow-forward': <path d="M5 12h14m-6-6 6 6-6 6" />,
  'chevron-start': <path d="m15 6-6 6 6 6" />,
  'chevron-end': <path d="m9 6 6 6-6 6" />,
  backspace: <><path d="M21 6H9l-6 6 6 6h12z" /><path d="m12 10 4 4m0-4-4 4" /></>,
  'exit-door': <><path d="M14 4h5v16h-5" /><path d="M10 12H3m3-3-3 3 3 3" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  seed: <><path d="M12 21c-4-2-6-6-6-10 3 0 6 2 6 6 0-4 3-6 6-6 0 4-2 8-6 10z" /><path d="M12 15V7" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4m8-4h3a3 3 0 0 1-3 4M12 13v4m-4 3h8l-1-3H9z" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  speaker: <><path d="M4 10v4h4l5 4V6L8 10z" /><path d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" /></>,
  'speaker-off': <><path d="M4 10v4h4l5 4V6L8 10z" /><path d="m16 10 4 4m0-4-4 4" /></>,
  music: <><path d="M9 18V6l10-2v12" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="16" r="2" /></>,
  play: <path d="M8 5v14l11-7z" />,
  lightbulb: <><path d="M9 18h6m-5 3h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1" /></>,
  shield: <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  times: <path d="m6 6 12 12M18 6 6 18" />,
  divide: <><path d="M5 12h14" /><circle cx="12" cy="6.5" r="1.2" /><circle cx="12" cy="17.5" r="1.2" /></>,
  leaf: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19 13 11" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  shuffle: <><path d="M4 7h3c5 0 5 10 10 10h3m0 0-3-3m3 3-3 3" /><path d="M4 17h3c2 0 3-1.5 4-3.5M20 7h-3c-2 0-3 1.5-4 3.5M20 7l-3-3m3 3-3 3" /></>,
  rotate: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></>,
  home: <><path d="m3 11 9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  'cloud-off': <><path d="M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.3 9 4.5 4.5 0 0 0 7 18z" /><path d="m4 4 16 16" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></>,
  download: <><path d="M12 4v11m-5-5 5 5 5-5" /><path d="M5 20h14" /></>,
  upload: <><path d="M12 15V4M7 9l5-5 5 5" /><path d="M5 20h14" /></>,
  trash: <><path d="M4 7h16M10 7V4h4v3m-8 0 1 13h10l1-13" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6" /></>,
};

export interface IconProps {
  name: IconName;
  size?: 24 | 32 | 48;
  mirrorInRtl?: boolean;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 24, mirrorInRtl, filled, className }: IconProps) {
  const mirror = mirrorInRtl ?? DIRECTIONAL.has(name);
  return (
    <svg
      className={`icon${mirror ? ' icon--mirror' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
