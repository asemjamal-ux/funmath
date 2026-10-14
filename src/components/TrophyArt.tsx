import { Icon, type IconName } from './Icon';

const ICONS: Record<string, IconName> = {
  footprints: 'arrow-forward', lightbulb: 'lightbulb', mountain: 'trophy', star: 'star', medal: 'trophy',
  plus: 'plus', minus: 'minus', times: 'times', divide: 'divide', hands: 'check', blocks: 'refresh',
  crown: 'star', plate: 'seed', game: 'play', mix: 'shuffle', calendar: 'leaf', palm: 'leaf', sun: 'star',
};

/** Trophy artwork: earned = full colour; locked = silhouette (DS §8.5). Not mirrored. */
export function TrophyArt({ icon, earned, size = 80 }: { icon: string; earned: boolean; size?: number }) {
  return (
    <span className={`trophy-art${earned ? ' trophy-art--earned' : ''}`} style={{ inlineSize: size, blockSize: size }} aria-hidden="true">
      <svg viewBox="0 0 80 80" width={size} height={size} focusable="false">
        <path d="M22 10h36v18a18 18 0 0 1-36 0z" className="trophy-art__cup" />
        <path d="M22 16H12a10 10 0 0 0 12 12M58 16h10a10 10 0 0 1-12 12" className="trophy-art__handles" />
        <path d="M34 46h12v10H34zM24 62h32l-2 8H26z" className="trophy-art__base" />
      </svg>
      <span className="trophy-art__icon"><Icon name={ICONS[icon] ?? 'star'} mirrorInRtl={false} /></span>
    </span>
  );
}
