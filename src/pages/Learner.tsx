import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFmt, usePath, useT } from '../app/hooks';
import { learnerSkills, learnerSkillsOf, skillUnlocked, starsOf, unlockInputFor, useApp, worldOpen } from '../app/store';
import { Button, IconButton } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { FanakSays, Mascot } from '../components/Mascot';
import { Avatar, OP_SHORT, OpBadge, SeedCounter, StarRating } from '../components/Progress';
import { LanguageSwitch, TopBar } from '../components/TopBar';
import { TrophyArt } from '../components/TrophyArt';
import { isReviewDue } from '../domain/adaptivity/stars';
import { isWorldOpen } from '../domain/adaptivity/unlock';
import { isTopic, type GameId, type Skill, type SkillId, type Tier } from '../domain/math/types';
import { TopicsGate } from '../components/TopicsGate';
import { selectDailyMix, type MixCandidate } from '../domain/scheduler/dailyMix';
import { createRng, randomSeed } from '../domain/rng';
import { localDateString } from '../domain/time';
import { BubblePop, MatchPairs, NumberLineHop } from '../features/games/Games';
// The extra games load on demand to keep the startup bundle inside NFR-01 (decision 004).
const moreGames = () => import('../features/games/MoreGames');
const Bingo = lazy(async () => ({ default: (await moreGames()).Bingo }));
const NumberHunt = lazy(async () => ({ default: (await moreGames()).NumberHunt }));
const TrueFalse = lazy(async () => ({ default: (await moreGames()).TrueFalse }));
import { LessonPlayer } from '../features/lesson/LessonPlayer';
import { practiceSlots, Runner } from '../features/practice/Runner';
import { appClock } from '../services/clock';
import { GAMES, getSkill, isGameId, isOperation, lessonFor, OPERATIONS, TROPHIES } from '../services/content';
import { responsesFor } from '../services/storage/repo';

/** Learner routes need an active profile; otherwise back to the picker (ARCH §2). */
export function RequireProfile() {
  const path = usePath();
  const active = useApp((s) => s.activeProfileId);
  if (!active) return <Navigate to={path('/')} replace />;
  return <Outlet />;
}

function LearnerTopBar({ back }: { back?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const path = usePath();
  const data = useApp((s) => s.data);
  return (
    <TopBar
      start={
        back ? (
          <IconButton icon="arrow-back" label={t('common.back')} onClick={() => navigate(back)} />
        ) : (
          <button type="button" className="me-btn" onClick={() => { void useApp.getState().setActiveProfile(null); navigate(path('/')); }} aria-label={t('home.switchProfile')}>
            {data && <Avatar id={data.profile.avatarId} size={44} />}
          </button>
        )
      }
      middle={data && <SeedCounter seeds={data.rewards.seeds} />}
      end={<LanguageSwitch />}
    />
  );
}

/* ---------------- Home ---------------- */
// The Home front page lives in features/home (redesign 003).
export { HomePage } from '../features/home/HomeFront';

/* ---------------- World / Skill Path ---------------- */
export function WorldPage() {
  const t = useT();
  const { n } = useFmt();
  const path = usePath();
  const navigate = useNavigate();
  const { operation } = useParams();
  const data = useApp((s) => s.data);
  const [lockedMsg, setLockedMsg] = useState<SkillId | null>(null);
  if (!isOperation(operation)) return <Navigate to={path('/home')} replace />;
  if (!data) return null;
  if (!worldOpen(data, operation)) return <Navigate to={path('/home')} replace />;
  const today = localDateString(appClock.now());
  const skills = learnerSkillsOf(data, operation);
  return (
    <div className={`page world world--${OP_SHORT[operation]}`}>
      <LearnerTopBar back={path('/home')} />
      <main id="main">
        <header className="world__header">
          <OpBadge op={operation} size={64} />
          <h1>{t(`world.${operation}`)}</h1>
        </header>
        <ol className="skill-path">
          {skills.map((s, i) => {
            const unlocked = skillUnlocked(data, s);
            const stars = starsOf(data, s.id);
            const p = data.progress.get(s.id);
            const due = p ? isReviewDue(p, today) : false;
            const status = !unlocked ? 'locked' : stars >= 3 ? 'mastered' : stars === 0 ? 'new' : 'progress';
            return (
              <li key={s.id} className={`skill-node skill-node--${status} skill-node--pos${i % 2}`}>
                <button
                  type="button"
                  className="skill-node__btn"
                  onClick={() => (unlocked ? navigate(path(`/skill/${s.id}`)) : setLockedMsg(lockedMsg === s.id ? null : s.id))}
                  aria-describedby={lockedMsg === s.id ? `lock-${s.id}` : undefined}
                >
                  <span className="skill-node__circle">
                    {unlocked ? <span className="skill-node__num">{n(i + 1)}</span> : <Icon name="lock" size={32} />}
                    {due && <span className="skill-node__leaf" title={t('world.reviewLeaf')}><Icon name="leaf" /></span>}
                  </span>
                  <span className="skill-node__title">{t(s.titleKey)}</span>
                  <StarRating stars={stars} />
                  <span className="visually-hidden">{t(`skill.status.${status}`)}{due ? `, ${t('world.reviewLeaf')}` : ''}</span>
                </button>
                {lockedMsg === s.id && <p id={`lock-${s.id}`} className="skill-node__explain" role="status">{t('skill.lockedHint')}</p>}
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}

/* ---------------- Skill page ---------------- */
export function SkillPage() {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  const { skillId } = useParams();
  const data = useApp((s) => s.data);
  const skill = getSkill(skillId ?? '');
  if (!skill || skill.scope !== 'mvp') return <Navigate to={path('/home')} replace />;
  if (!data) return null;
  if (!skillUnlocked(data, skill)) return <Navigate to={path(`/world/${skill.operation}`)} replace />;
  const stars = starsOf(data, skill.id);
  const statusKey = stars >= 3 ? 'mastered' : stars === 2 ? 'strong' : stars === 1 ? 'learning' : 'new';
  return (
    <div className={`page skill-page world--${OP_SHORT[skill.operation]}`}>
      <LearnerTopBar back={path(`/world/${skill.operation}`)} />
      <main id="main" className="skill-page__main">
        <OpBadge op={skill.operation} size={64} />
        <h1>{t(skill.titleKey)}</h1>
        <StarRating stars={stars} size={32} />
        <p className="skill-page__status">{t(`skill.stars.${statusKey}`)}</p>
        <FanakSays expression={stars === 0 ? 'curious' : 'happy'}>{stars === 0 ? t('skill.recommendLesson') : t('skill.welcomeBack')}</FanakSays>
        <div className="skill-page__actions">
          <Button operation={skill.operation} variant={stars === 0 ? 'primary' : 'secondary'} leadingIcon="play" onClick={() => navigate(path(`/lesson/${skill.id}`))}>{t('skill.lesson')}</Button>
          <Button operation={skill.operation} variant={stars === 0 ? 'secondary' : 'primary'} leadingIcon="star" onClick={() => navigate(path(`/practice/${skill.id}`))}>{t('skill.practice')}</Button>
          {skill.games.length > 0 && <Button variant="secondary" leadingIcon="play" onClick={() => navigate(path(`/games?skill=${skill.id}`))}>{t('skill.playGame')}</Button>}
        </div>
      </main>
    </div>
  );
}

export function LessonPage() {
  const path = usePath();
  const { skillId } = useParams();
  const data = useApp((s) => s.data);
  const skill = getSkill(skillId ?? '');
  const lesson = skill ? lessonFor(skill.id) : undefined;
  if (!skill || !lesson || !data) return <Navigate to={path('/home')} replace />;
  if (!skillUnlocked(data, skill)) return <Navigate to={path('/home')} replace />;
  return <TopicsGate need={isTopic(skill.operation)}><LessonPlayer skill={skill} lesson={lesson} /></TopicsGate>;
}

export function PracticePage() {
  const t = useT();
  const path = usePath();
  const { skillId } = useParams();
  const data = useApp((s) => s.data);
  const skill = getSkill(skillId ?? '');
  const plan = useMemo(() => (skill ? practiceSlots(skill.id) : []), [skill]);
  if (!skill || !data || skill.scope !== 'mvp') return <Navigate to={path('/home')} replace />;
  if (!skillUnlocked(data, skill)) return <Navigate to={path('/home')} replace />;
  const tier = (data.progress.get(skill.id)?.currentTier ?? 1) as Tier;
  return (
    <TopicsGate need={isTopic(skill.operation)}>
      <Runner kind="practice" plan={plan} startTier={tier} title={t('practice.title', { skill: t(skill.titleKey) })} exitTo={path(`/skill/${skill.id}`)} />
    </TopicsGate>
  );
}

export function DailyMixPage() {
  const t = useT();
  const path = usePath();
  const data = useApp((s) => s.data);
  const [plan, setPlan] = useState<{ skillId: SkillId; tier: Tier }[] | null>(null);
  useEffect(() => {
    if (!data) return;
    let alive = true;
    void (async () => {
      const today = localDateString(appClock.now());
      const since = new Date(appClock.now().getTime() - 30 * 86_400_000).toISOString();
      const responses = (await responsesFor(data.profile.id)).filter((r) => r.answeredAt >= since);
      const candidates: MixCandidate[] = learnerSkills(data).filter((s) => skillUnlocked(data, s)).map((s) => {
        const p = data.progress.get(s.id);
        const rs = responses.filter((r) => r.skillId === s.id);
        return { skillId: s.id, stars: p?.stars ?? 0, due: p ? isReviewDue(p, today) : false, accuracy: rs.length ? rs.filter((r) => r.firstTry).length / rs.length : null };
      });
      const picks = selectDailyMix(candidates, createRng(randomSeed(Math.random)));
      if (alive) setPlan(picks.map((p) => ({ skillId: p.skillId, tier: (data.progress.get(p.skillId)?.currentTier ?? 1) as Tier })));
    })();
    return () => {
      alive = false;
    };
    // The plan is chosen once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.profile.id]);
  if (!data) return null;
  if (plan && plan.length === 0) return <Navigate to={path('/home')} replace />;
  if (!plan) return <div className="page-loading">{t('common.loading')}</div>;
  const needTopics = plan.some((p) => {
    const s = getSkill(p.skillId);
    return s !== undefined && isTopic(s.operation);
  });
  return (
    <TopicsGate need={needTopics}>
      <Runner kind="dailyMix" plan={plan} startTier={1} title={t('dailyMix.title')} exitTo={path('/home')} />
    </TopicsGate>
  );
}

/* ---------------- Games ---------------- */
const GAME_ICON: Record<GameId, IconName> = {
  'bubble-pop': 'seed', 'number-line-hop': 'arrow-forward', 'match-pairs': 'shuffle',
  bingo: 'star', 'number-hunt': 'lightbulb', 'true-false': 'check',
};

export function GamesHubPage() {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const data = useApp((s) => s.data);
  const preselect = getSkill(params.get('skill') ?? '');
  const [game, setGame] = useState<GameId | null>(null);
  if (!data) return null;
  const unlocked = learnerSkills(data).filter((s) => skillUnlocked(data, s));
  const choose = (g: GameId) => {
    if (preselect && preselect.games.includes(g) && skillUnlocked(data, preselect)) navigate(path(`/games/${g}?skill=${preselect.id}`));
    else setGame(g);
  };
  return (
    <div className="page">
      <LearnerTopBar back={preselect ? path(`/skill/${preselect.id}`) : path('/home')} />
      <main id="main" className="games-hub">
        <h1>{game ? t('games.chooseSkill', { game: t(`games.${game}.title`) }) : t('games.title')}</h1>
        {!game ? (
          <ul className="game-list">
            {GAMES.map((g) => (
              <li key={g}>
                <button type="button" className={`game-card game-card--${g}`} onClick={() => choose(g)}>
                  <span className="game-card__art" aria-hidden="true"><Icon name={GAME_ICON[g]} size={48} /></span>
                  <span className="game-card__title">{t(`games.${g}.title`)}</span>
                  <span className="game-card__desc">{t(`games.${g}.desc`)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <ul className="skill-choice">
              {unlocked.filter((s) => s.games.includes(game)).map((s) => (
                <li key={s.id}>
                  <Button variant="secondary" operation={s.operation} onClick={() => navigate(path(`/games/${game}?skill=${s.id}`))}>{t(s.titleKey)}</Button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="m" leadingIcon="arrow-back" onClick={() => setGame(null)}>{t('common.back')}</Button>
          </>
        )}
      </main>
    </div>
  );
}

export function GamePage() {
  const path = usePath();
  const { gameId } = useParams();
  const [params] = useSearchParams();
  const data = useApp((s) => s.data);
  const skill = getSkill(params.get('skill') ?? '');
  if (!isGameId(gameId) || !data) return <Navigate to={path('/games')} replace />;
  if (!skill || !skill.games.includes(gameId) || !skillUnlocked(data, skill)) return <Navigate to={path('/games')} replace />;
  const tier = (data.progress.get(skill.id)?.currentTier ?? 1) as Tier;
  const props = { skill, tier, profileId: data.profile.id };
  const key = `${gameId}-${skill.id}`;
  return <TopicsGate need={isTopic(skill.operation)}>{gameFor(gameId, key, props)}</TopicsGate>;
}

function gameFor(gameId: GameId, key: string, props: { skill: Skill; tier: Tier; profileId: string }) {
  switch (gameId) {
    case 'bubble-pop':
      return <BubblePop key={key} {...props} />;
    case 'number-line-hop':
      return <NumberLineHop key={key} {...props} />;
    case 'match-pairs':
      return <MatchPairs key={key} {...props} />;
    case 'bingo':
      return <Suspense fallback={<div className="boot" aria-busy="true" />}><Bingo key={key} {...props} /></Suspense>;
    case 'number-hunt':
      return <Suspense fallback={<div className="boot" aria-busy="true" />}><NumberHunt key={key} {...props} /></Suspense>;
    case 'true-false':
      return <Suspense fallback={<div className="boot" aria-busy="true" />}><TrueFalse key={key} {...props} /></Suspense>;
  }
}

/* ---------------- Trophy Room ---------------- */
export function TrophyRoomPage() {
  const t = useT();
  const path = usePath();
  const data = useApp((s) => s.data);
  if (!data) return null;
  const earned = new Set(data.trophies.map((x) => x.trophyId));
  return (
    <div className="page">
      <LearnerTopBar back={path('/home')} />
      <main id="main">
        <h1>{t('trophies.title')}</h1>
        <ul className="trophy-grid">
          {TROPHIES.map((tr) => {
            const has = earned.has(tr.id);
            return (
              <li key={tr.id} className={`trophy-card${has ? ' trophy-card--earned' : ''}`}>
                <TrophyArt icon={tr.icon} earned={has} />
                <span className="trophy-card__name">{has ? t(tr.titleKey) : t('trophies.locked')}</span>
                {!has && <span className="trophy-card__hint">{t(tr.hintKey)}</span>}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

/* ---------------- My Progress ---------------- */
export function ProgressPage() {
  const t = useT();
  const { n } = useFmt();
  const path = usePath();
  const data = useApp((s) => s.data);
  if (!data) return null;
  const input = unlockInputFor(data);
  return (
    <div className="page">
      <LearnerTopBar back={path('/home')} />
      <main id="main">
        <h1>{t('progress.title')}</h1>
        <p className="lead">{t('progress.trophies', { count: data.trophies.length, n: n(data.trophies.length), total: n(TROPHIES.length) })}</p>
        <div className="progress-worlds">
          {OPERATIONS.filter((op) => learnerSkillsOf(data, op).length > 0).map((op) => {
            const skills: Skill[] = learnerSkillsOf(data, op);
            const mastered = skills.filter((s) => starsOf(data, s.id) >= 3).length;
            const stars = skills.reduce((sum, s) => sum + starsOf(data, s.id), 0);
            return (
              <section key={op} className={`progress-world world--${OP_SHORT[op]}`}>
                <h2><OpBadge op={op} size={40} /> {t(`world.${op}`)}</h2>
                <p>{t('progress.starsTotal', { count: stars, n: n(stars), total: n(skills.length * 3) })} · {t('world.masteredCount', { mastered: n(mastered), total: n(skills.length) })}</p>
                {!isWorldOpen(op, input) && <p className="muted"><Icon name="lock" /> {t('world.locked')}</p>}
                <ul className="progress-skills">
                  {skills.map((s) => (
                    <li key={s.id}>
                      <span>{t(s.titleKey)}</span>
                      <StarRating stars={starsOf(data, s.id)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <Mascot expression="happy" size={96} />
      </main>
    </div>
  );
}
