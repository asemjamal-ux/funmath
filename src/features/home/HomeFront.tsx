import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFmt, usePath, useReducedMotion, useT } from '../../app/hooks';
import { learnerSkills, learnerSkillsOf, skillUnlocked, starsOf, useApp, worldOpen } from '../../app/store';
import { ChoiceGroup, type ChoiceState } from '../../components/Answering';
import { Avatar, OP_SHORT, OP_SYMBOL, SeedCounter, TopicGlyph } from '../../components/Progress';
import { Confetti } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { ItemExpression } from '../../components/MathDisplay';
import { OasisScene } from '../../components/OasisScene';
import { FloatingTiles, TappableFanak } from '../../components/Playful';
import { LanguageSwitch, TopBar } from '../../components/TopBar';
import { UpdatePrompt } from '../../components/UpdatePrompt';
import { isReviewDue } from '../../domain/adaptivity/stars';
import { nextSetItem } from '../../domain/math/practiceSet';
import { isTopic, type Item, type Operation, type Skill, type Tier } from '../../domain/math/types';
import { seedsToNextStage } from '../../domain/rewards/rewards';
import { randomSeed } from '../../domain/rng';
import { localDateString } from '../../domain/time';
import { playSfx, setMusic } from '../../services/audio/audio';
import { appClock } from '../../services/clock';
import { getSkill, OPERATIONS, TROPHIES } from '../../services/content';

/*
 * Learner Home in the "Fun with Multiplication" front-page layout (decision 003): hero with Fanak and the Oasis,
 * pick-a-world chips, three ways to learn, a quick challenge, how-it-works, banners and footer.
 */

const QC_GOAL = 5;

/** The next Skill to work on; learners who start at a higher Stage are pointed at their own Stage first (decision 005). */
function useSuggestion(arithmeticOnly = false): Skill | undefined {
  const data = useApp((s) => s.data);
  if (!data) return undefined;
  const open = OPERATIONS.filter((op) => worldOpen(data, op) && !(arithmeticOnly && isTopic(op)));
  const todo = open.flatMap((op) => learnerSkillsOf(data, op)).filter((sk) => skillUnlocked(data, sk) && starsOf(data, sk.id) < 2);
  return todo.find((sk) => sk.stage >= data.profile.startingStage) ?? todo[0];
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

function WorldChip({ op }: { op: Operation }) {
  const t = useT();
  const { n } = useFmt();
  const path = usePath();
  const data = useApp((s) => s.data);
  const [explain, setExplain] = useState(false);
  if (!data) return null;
  const open = worldOpen(data, op);
  const skills = learnerSkillsOf(data, op);
  const mastered = skills.filter((s) => starsOf(data, s.id) >= 3).length;
  const body = (
    <>
      <span className="world-chip__sym" aria-hidden="true">{!open ? <Icon name="lock" size={48} /> : isTopic(op) ? <TopicGlyph topic={op} size={64} /> : OP_SYMBOL[op]}</span>
      <span className="world-chip__name">{t(`world.${op}`)}</span>
      <small className="world-chip__count">{open ? t('world.masteredCount', { mastered: n(mastered), total: n(skills.length) }) : t('world.locked')}</small>
    </>
  );
  return (
    <li className={`world-chip world-chip--${OP_SHORT[op]}${open ? '' : ' world-chip--locked'}`}>
      {open ? (
        <Link to={path(`/world/${op}`)} className="world-chip__link">{body}</Link>
      ) : (
        <button type="button" className="world-chip__link" onClick={() => setExplain(!explain)} aria-expanded={explain}>{body}</button>
      )}
      {explain && <p className="world-chip__explain" role="status">{t(`world.unlockHint.${op}`)}</p>}
    </li>
  );
}

/** Quick challenge: get five right. Untimed, no streak reset, nothing to lose (CS-07, N-04). */
function QuickChallenge({ skill, tier }: { skill: Skill; tier: Tier }) {
  const t = useT();
  const { n } = useFmt();
  const reduced = useReducedMotion();
  const [seed, setSeed] = useState(() => randomSeed(Math.random));
  const [items, setItems] = useState<Item[]>([]);
  const [found, setFound] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setItems([nextSetItem(skill, tier, seed, 0, [], { format: 'choice' })]);
    setFound(0);
    setWrong([]);
    setSolved(false);
    setMsg('');
  }, [skill, tier, seed]);

  const item = items[items.length - 1];
  if (!item) return null;
  const done = found >= QC_GOAL;

  const next = (list: Item[]) => {
    setItems([...list, nextSetItem(skill, tier, seed, list.length, list, { format: 'choice' })]);
    setWrong([]);
    setSolved(false);
  };

  const choose = (v: number) => {
    if (solved || done) return;
    if (v === item.answer) {
      playSfx('correct');
      const f = found + 1;
      setFound(f);
      setSolved(true);
      setMsg(f >= QC_GOAL ? t('home.qc.five') : t(`home.qc.cheer${(f % 4) + 1}`));
      if (f < QC_GOAL) window.setTimeout(() => next(items), reduced ? 300 : 800);
    } else {
      playSfx('tryAgain');
      setWrong([...wrong, v]);
      setMsg(t('home.qc.tryAgain'));
    }
  };

  const states: Record<number, ChoiceState> = {};
  for (const w of wrong) states[w] = 'tryAgain';
  if (solved) states[item.answer] = 'correct';

  return (
    <div className="sticker qc">
      {done && !reduced && <Confetti />}
      <span className="tag tag--sun">{t('home.qc.tag')}</span>
      <h2 className="qc__title">{t('home.qc.h2', { goal: n(QC_GOAL) })}</h2>
      <p className="qc__skill">{t(skill.titleKey)}</p>
      <div className="question-big"><ItemExpression item={item} size="xl" showAnswer={solved} /></div>
      <ChoiceGroup choices={item.choices ?? []} states={states} onChoose={choose} label={t('answer.choices.label')} disabled={solved || done} />
      <div className="stat-row">
        <div className="stat"><b>{n(found)}</b><span>{t('home.qc.found', { goal: n(QC_GOAL) })}</span></div>
      </div>
      <p className="qc__msg" aria-live="polite">{msg}</p>
      {done && (
        <div className="qc__again">
          <button type="button" className="btn btn--m btn--primary" onClick={() => setSeed(randomSeed(Math.random))}>{t('home.qc.again')}</button>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const t = useT();
  const { n } = useFmt();
  const path = usePath();
  const navigate = useNavigate();
  const data = useApp((s) => s.data);
  const suggestion = useSuggestion();
  // The quick challenge stays with arithmetic: the advanced Worlds' questions load with their own pages.
  const qcSuggestion = useSuggestion(true);
  useEffect(() => {
    setMusic(true);
    return () => setMusic(false);
  }, []);
  const qcSkill = useMemo(() => qcSuggestion ?? learnerSkills(data).find((s) => !isTopic(s.operation)) ?? getSkill('ADD-01'), [qcSuggestion, data]);
  if (!data || !qcSkill) return null;

  const today = localDateString(appClock.now());
  const mine = learnerSkills(data);
  const anyStar = mine.some((s) => starsOf(data, s.id) >= 1);
  const dueCount = mine.filter((s) => {
    const p = data.progress.get(s.id);
    return p ? isReviewDue(p, today) : false;
  }).length;
  const toNext = seedsToNextStage(data.rewards.seeds);
  const qcTier = (data.progress.get(qcSkill.id)?.currentTier ?? 1) as Tier;
  const goTo = dueCount > 0 ? path('/daily-mix') : suggestion ? path(`/skill/${suggestion.id}`) : path(`/world/addition`);

  return (
    <div className="page home home-front">
      <TopBar
        start={
          <button type="button" className="me-btn" onClick={() => { void useApp.getState().setActiveProfile(null); navigate(path('/')); }} aria-label={t('home.switchProfile')}>
            <Avatar id={data.profile.avatarId} size={44} />
          </button>
        }
        middle={<SeedCounter seeds={data.rewards.seeds} />}
        end={<LanguageSwitch />}
      />
      <main id="main">
        {/* ---------- Hero ---------- */}
        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <Eyebrow>{t('home.greeting', { name: data.profile.nickname })}</Eyebrow>
              <h1 className="hero-title">
                {t('home.hero.pre')}{' '}
                <span className="hero-title__nowrap">
                  <span className="wobble">{t('home.hero.a')}</span> <span className="swing">{t('home.hero.b')}</span>
                </span>
              </h1>
              <p className="lead">
                {dueCount > 0 ? t('home.suggestReview') : suggestion ? t('home.suggestSkill', { skill: t(suggestion.titleKey) }) : t('home.suggestFree')}
              </p>
              <div className="hero-actions">
                <Link className="btn btn--l btn--coral" to={goTo}><Icon name="play" />{t('home.hero.go')}</Link>
                <Link className="btn btn--l btn--sky" to={path('/games')}><Icon name="star" />{t('home.hero.games')}</Link>
                <Link className="btn btn--m btn--secondary" to={path('/worksheets')}><Icon name="download" />{t('home.hero.print')}</Link>
              </div>
            </div>
            <div className="hero-art">
              <div className="home__hero">
                <OasisScene stage={data.rewards.oasisStage} />
                <FloatingTiles />
              </div>
              <p className="home__caption">
                {t('home.oasisCaption', { stage: n(data.rewards.oasisStage), total: n(10) })}
                {toNext !== null && <> · {t('home.toNext', { count: toNext, n: n(toNext) })}</>}
              </p>
              <TappableFanak size={150}>{t('home.fanak.hello')}</TappableFanak>
            </div>
          </div>
        </section>

        <UpdatePrompt />

        {/* ---------- Pick a world ---------- */}
        <section className="section">
          <div className="section-head">
            <div>
              <Eyebrow>{t('home.pick.eyebrow')}</Eyebrow>
              <h2>{t('home.pick.h2')}</h2>
            </div>
            <p className="lead">{t('home.pick.lead')}</p>
          </div>
          <ul className="world-picker">
            {OPERATIONS.filter((op) => learnerSkillsOf(data, op).length > 0).map((op) => <WorldChip key={op} op={op} />)}
            <li className={`world-chip world-chip--mix${anyStar ? '' : ' world-chip--locked'}`}>
              <button type="button" className="world-chip__link" onClick={() => anyStar && navigate(path('/daily-mix'))} aria-disabled={!anyStar || undefined}>
                <span className="world-chip__sym" aria-hidden="true"><Icon name="shuffle" size={48} /></span>
                <span className="world-chip__name">{t('home.dailyMix')}</span>
                <small className="world-chip__count">
                  {anyStar ? (dueCount > 0 ? t('home.dailyMixDue', { count: dueCount, n: n(dueCount) }) : t('home.dailyMixReady')) : t('home.dailyMixLocked')}
                </small>
              </button>
            </li>
          </ul>
        </section>

        {/* ---------- Three ways to learn ---------- */}
        <section className="section section--tight">
          <div className="section-head">
            <div>
              <Eyebrow>{t('home.ways.eyebrow')}</Eyebrow>
              <h2>{t('home.ways.h2')}</h2>
            </div>
          </div>
          <div className="grid-3">
            <Link className="sticker sticker-link tilt-l" to={goTo}>
              <span className="tag">{t('home.ways.startHere')}</span>
              <span className="card-icon card-icon--coral" aria-hidden="true"><Icon name="lightbulb" size={48} /></span>
              <h3>{t('home.ways.learn.h3')}</h3>
              <p>{t('home.ways.learn.p')}</p>
              <span className="btn btn--s btn--coral">{t('home.ways.learn.btn')}</span>
            </Link>
            <Link className="sticker sticker-link" to={path('/games')}>
              <span className="card-icon card-icon--sky" aria-hidden="true"><Icon name="play" size={48} /></span>
              <h3>{t('home.ways.games.h3')}</h3>
              <p>{t('home.ways.games.p')}</p>
              <span className="btn btn--s btn--sky">{t('home.ways.games.btn')}</span>
            </Link>
            <Link className="sticker sticker-link tilt-r" to={path('/worksheets')}>
              <span className="card-icon card-icon--lime" aria-hidden="true"><Icon name="download" size={48} /></span>
              <h3>{t('home.ways.ws.h3')}</h3>
              <p>{t('home.ways.ws.p')}</p>
              <span className="btn btn--s btn--lime">{t('home.ways.ws.btn')}</span>
            </Link>
          </div>
        </section>

        {/* ---------- Quick challenge ---------- */}
        <section className="section">
          <QuickChallenge skill={qcSkill} tier={qcTier} />
        </section>

        {/* ---------- How it works ---------- */}
        <section className="section section--tight">
          <div className="grid-3">
            <div className="sticker how how--sun">
              <h3><span className="how__num">{n(1)}</span>{t('home.how.learn.h3')}</h3>
              <p>{t('home.how.learn.p')}</p>
            </div>
            <div className="sticker how how--teal">
              <h3><span className="how__num">{n(2)}</span>{t('home.how.play.h3')}</h3>
              <p>{t('home.how.play.p')}</p>
            </div>
            <div className="sticker how how--grape">
              <h3><span className="how__num">{n(3)}</span>{t('home.how.practise.h3')}</h3>
              <p>{t('home.how.practise.p')}</p>
            </div>
          </div>
        </section>

        {/* ---------- Banners ---------- */}
        <section className="section section--tight">
          <div className="banner">
            <span className="banner__icon" aria-hidden="true"><Icon name="trophy" size={48} /></span>
            <div className="banner__copy">
              <h2>{t('home.banner.trophies.h2')}</h2>
              <p>{t('progress.trophies', { count: data.trophies.length, n: n(data.trophies.length), total: n(TROPHIES.length) })}</p>
            </div>
            <div className="banner__actions">
              <Link className="btn btn--m btn--secondary" to={path('/trophies')}>{t('home.trophyRoom')}</Link>
              <Link className="btn btn--m btn--secondary" to={path('/progress')}>{t('home.myProgress')}</Link>
            </div>
          </div>
        </section>
        <section className="section section--tight">
          <div className="banner banner--sky">
            <span className="banner__icon" aria-hidden="true"><Icon name="shield" size={48} /></span>
            <div className="banner__copy">
              <h2>{t('home.banner.grownups.h2')}</h2>
              <p>{t('home.banner.grownups.p')}</p>
            </div>
            <div className="banner__actions">
              <Link className="btn btn--m btn--secondary" to={path('/grown-ups')}>{t('home.banner.grownups.btn')}</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  const t = useT();
  const { n } = useFmt();
  const path = usePath();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>{t('footer.made')}</p>
        <p className="site-footer__nums" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => n(i + 1)).join(' ')}</p>
        <nav aria-label={t('footer.nav')} className="site-footer__links">
          <Link to={path('/worksheets')}>{t('footer.worksheets')}</Link>
          <Link to={path('/grown-ups')}>{t('footer.grownups')}</Link>
          <Link to={path('/about')}>{t('picker.about')}</Link>
        </nav>
      </div>
    </footer>
  );
}
