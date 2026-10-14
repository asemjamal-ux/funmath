import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { activityKey, useActivityStore, useForgetFinishedActivity } from '../../app/activityStore';
import { useFmt, useHoldCelebrations, usePath, useReducedMotion, useT } from '../../app/hooks';
import { useApp } from '../../app/store';
import { Button, IconButton } from '../../components/Button';
import { ConfirmDialog } from '../../components/Dialog';
import { Confetti, FeedbackBanner } from '../../components/Feedback';
import { Manipulative, modelFits } from '../../components/Manipulatives';
import { Mascot } from '../../components/Mascot';
import { ProgressDots, StarRating, type DotState } from '../../components/Progress';
import { TopBar, LanguageSwitch } from '../../components/TopBar';
import { BreakReminder } from '../../components/BreakReminder';
import { initialTierState, nextTierState, type TierState } from '../../domain/adaptivity/tier';
import { checkAnswer } from '../../domain/math/check';
import { canRequeue, nextSetItem, practiceSetLength, similarItem } from '../../domain/math/practiceSet';
import type { Item, SkillId, Tier } from '../../domain/math/types';
import { randomSeed } from '../../domain/rng';
import { appClock } from '../../services/clock';
import { getSkill } from '../../services/content';
import { playSfx } from '../../services/audio/audio';
import { upsertSession } from '../../services/storage/repo';
import { completeDailyMix, completePracticeSet, recordAnswered, saveTier, type Outcome } from '../rewards/engine';
import { freshAnswerState, ItemView, type AnswerState } from './ItemView';
import { modelSpecFor, WorkedExample } from './WorkedExample';

export type RunnerKind = 'practice' | 'dailyMix';

interface Slot {
  skillId: SkillId;
  tier?: Tier; // fixed tier (Daily Mix)
  requeue?: Item;
}

interface Result {
  correct: boolean;
  firstTry: boolean;
  tier: Tier;
}

export interface RunnerState {
  kind: RunnerKind;
  sessionId: string;
  seed: number;
  startedAt: string;
  items: Item[];
  pending: Slot[];
  results: Result[];
  answer: AnswerState;
  phase: 'answering' | 'correct' | 'worked' | 'summary';
  tierState: TierState | null;
  seedsEarned: number;
  itemStartedAt: number;
  summary?: { correct: number; total: number; seeds: number; starsBefore?: number; starsAfter?: number; bonus?: boolean };
}

export interface RunnerProps {
  kind: RunnerKind;
  /** Practice: one Skill. Daily Mix: the per-item Skill plan with each Skill's current Tier. */
  plan: Slot[];
  startTier: Tier;
  title: string;
  exitTo: string;
}

function itemFor(slot: Slot, state: { seed: number; items: Item[] }, tier: Tier): Item {
  const skill = getSkill(slot.skillId);
  if (!skill) throw new Error(`Unknown skill ${slot.skillId}`);
  if (slot.requeue) return similarItem(skill, slot.requeue, state.seed, state.items.length, state.items);
  return nextSetItem(skill, slot.tier ?? tier, state.seed, state.items.length, state.items);
}

export function Runner({ kind, plan, startTier, title, exitTo }: RunnerProps) {
  const t = useT();
  const { n } = useFmt();
  const path = usePath();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const profile = useApp((s) => s.data?.profile);
  const profileId = profile?.id ?? null;
  const key = activityKey(location.pathname, profileId);
  const stored = useActivityStore((s) => s.states[key]) as RunnerState | undefined;
  const put = useActivityStore((s) => s.put);
  const clear = useActivityStore((s) => s.clear);
  const [confirmExit, setConfirmExit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showBreak, setShowBreak] = useState(false);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useHoldCelebrations(stored?.phase !== 'summary');

  // Create (or resume) the set.
  useEffect(() => {
    if (stored || !profileId || plan.length === 0) return;
    const seed = randomSeed(Math.random);
    const base = { seed, items: [] as Item[] };
    const [first, ...rest] = plan;
    const firstItem = itemFor(first as Slot, base, startTier);
    const state: RunnerState = {
      kind,
      sessionId: crypto.randomUUID(),
      seed,
      startedAt: appClock.now().toISOString(),
      items: [firstItem],
      pending: rest,
      results: [],
      answer: freshAnswerState(firstItem),
      phase: 'answering',
      tierState: kind === 'practice' ? initialTierState(startTier) : null,
      seedsEarned: 0,
      itemStartedAt: Date.now(),
    };
    put(key, state);
    void upsertSession({ id: state.sessionId, profileId, activity: kind, skillId: kind === 'practice' ? first?.skillId : undefined, startedAt: state.startedAt, itemCount: 0, completed: false, activeMs: 0 });
  }, [stored, profileId, plan, startTier, kind, key, put]);

  const s = stored;
  const item = s ? s.items[s.items.length - 1] : undefined;
  const index = s ? s.items.length - 1 : 0;
  const total = s ? s.items.length + s.pending.length : plan.length;
  const skill = item ? getSkill(item.skillId) : undefined;

  const update = useCallback((patch: Partial<RunnerState>) => {
    const cur = useActivityStore.getState().states[key] as RunnerState | undefined;
    if (cur) put(key, { ...cur, ...patch });
  }, [key, put]);

  useEffect(() => {
    if (s?.phase === 'correct') nextBtn.current?.focus();
  }, [s?.phase]);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useForgetFinishedActivity(key, (st) => (st as RunnerState | undefined)?.phase === 'summary');

  const dots: DotState[] = useMemo(() => {
    if (!s) return [];
    return Array.from({ length: total }, (_, i) => {
      const r = s.results[i];
      if (r) return r.correct ? 'correct' : 'incorrect';
      return i === index ? 'current' : 'upcoming';
    });
  }, [s, total, index]);

  if (!s || !item || !skill || !profileId) return <div className="page-loading" aria-live="polite">{t('common.loading')}</div>;

  const record = async (correct: boolean, firstTry: boolean, answerGiven: number | null, hintsUsed: number, hadHint: boolean): Promise<Outcome> => {
    const duration = Date.now() - s.itemStartedAt;
    useApp.getState().addActiveMs(Math.min(duration, 5 * 60_000));
    const out = await recordAnswered({ profileId, activity: kind, sessionId: s.sessionId, itemIndex: index, item, answerGiven, correct, firstTry, hintsUsed, hadHint, durationMs: duration });
    await upsertSession({ id: s.sessionId, profileId, activity: kind, skillId: kind === 'practice' ? item.skillId : undefined, startedAt: s.startedAt, itemCount: index + 1, completed: false, activeMs: 0 });
    return out;
  };

  const onSubmit = async (value: number) => {
    if (busy || s.phase !== 'answering') return;
    setBusy(true);
    try {
      const a = s.answer;
      if (checkAnswer(item, value)) {
        const firstTry = a.attempts === 0 && a.hintLevel === 0;
        playSfx('correct');
        const out = await record(true, firstTry, value, a.hintLevel, a.hintLevel > 0 || a.attempts > 0);
        const tierState = s.tierState ? nextTierState(s.tierState, firstTry ? 'firstTry' : 'correctLater') : null;
        update({
          phase: 'correct',
          answer: { ...a, solved: true },
          results: [...s.results, { correct: true, firstTry, tier: item.tier }],
          tierState,
          seedsEarned: s.seedsEarned + out.seedsAdded,
        });
      } else if (a.attempts === 0) {
        // First wrong attempt: gentle message, Hint 1 automatically, wrong option greyed (PRD §6.6).
        playSfx('tryAgain');
        update({ answer: { ...a, attempts: 1, wrong: [...a.wrong, value], hintLevel: Math.max(1, a.hintLevel) as 1 | 2, entry: '', col: a.col.map(() => null), colFocus: 0 } });
      } else {
        // Second wrong attempt: Worked Example; item recorded incorrect; similar item re-queued.
        await record(false, false, value, a.hintLevel, true);
        const tierState = s.tierState ? nextTierState(s.tierState, 'incorrect') : null;
        const pending = [...s.pending];
        if (canRequeue(s.items.length + s.pending.length)) {
          pending.splice(Math.min(2, pending.length), 0, { skillId: item.skillId, tier: item.tier, requeue: item });
        }
        update({ phase: 'worked', answer: { ...a, attempts: 2, wrong: [...a.wrong, value] }, results: [...s.results, { correct: false, firstTry: false, tier: item.tier }], tierState, pending });
      }
    } finally {
      setBusy(false);
    }
  };

  const advance = async () => {
    const cur = useActivityStore.getState().states[key] as RunnerState;
    if (cur.pending.length === 0) {
      await finishSet(cur);
      return;
    }
    // Break reminders appear only at an item boundary, never mid-answer (F-16).
    const minutes = profile?.prefs.breakReminderMinutes ?? 0;
    if (minutes > 0 && useApp.getState().activeMsSinceBreak >= minutes * 60_000 && !showBreak) {
      setShowBreak(true);
      return;
    }
    const [slot, ...rest] = cur.pending;
    const tier = cur.tierState?.tier ?? startTier;
    const next = itemFor(slot as Slot, cur, tier);
    if (cur.tierState && kind === 'practice') void saveTier(profileId, next.skillId, cur.tierState.tier);
    update({ items: [...cur.items, next], pending: rest, answer: freshAnswerState(next), phase: 'answering', itemStartedAt: Date.now() });
  };

  const finishSet = async (cur: RunnerState) => {
    setBusy(true);
    try {
      const correct = cur.results.filter((r) => r.correct).length;
      let summary: RunnerState['summary'];
      if (kind === 'practice') {
        const out = await completePracticeSet(profileId, item.skillId, cur.sessionId, { tiers: cur.results.map((r) => r.tier), firstTry: cur.results.map((r) => r.firstTry) }, cur.tierState?.tier ?? startTier);
        summary = { correct, total: cur.results.length, seeds: cur.seedsEarned + out.seedsAdded, starsBefore: out.starsBefore, starsAfter: out.starsAfter };
      } else {
        const out = await completeDailyMix(profileId, cur.sessionId);
        summary = { correct, total: cur.results.length, seeds: cur.seedsEarned + out.seedsAdded, bonus: out.bonus };
      }
      const rate = cur.results.filter((r) => r.firstTry).length / Math.max(1, cur.results.length);
      await upsertSession({ id: cur.sessionId, profileId, activity: kind, skillId: kind === 'practice' ? item.skillId : undefined, startedAt: cur.startedAt, endedAt: appClock.now().toISOString(), itemCount: cur.results.length, firstTryRate: rate, completed: true, activeMs: 0 });
      playSfx('sparkle');
      update({ phase: 'summary', summary });
    } finally {
      setBusy(false);
    }
  };

  const exit = () => {
    // Partial sets are discarded for Stars; answered items already kept their Seeds (FR-15).
    clear(key);
    navigate(exitTo);
  };

  const again = () => {
    clear(key);
  };

  if (s.phase === 'summary' && s.summary) {
    const sm = s.summary;
    const starUp = sm.starsAfter !== undefined && sm.starsBefore !== undefined && sm.starsAfter > sm.starsBefore;
    return (
      <div className="activity">
        <TopBar start={<IconButton icon="home" label={t('common.backHome')} onClick={() => { clear(key); navigate(path('/home')); }} />} end={<LanguageSwitch />} />
        <main className="summary" id="main">
          {!reduced && <Confetti />}
          <Mascot expression="cheer" size={120} />
          <h1 tabIndex={-1} ref={heading} className="summary__title">{t('practice.summary.title')}</h1>
          <ul className="summary__stats">
            <li>{t('practice.summary.correct', { correct: n(sm.correct), total: n(sm.total) })}</li>
            <li>{t('rewards.seeds.earned', { count: sm.seeds, n: n(sm.seeds) })}</li>
            {sm.bonus && <li>{t('dailyMix.bonus', { n: n(5) })}</li>}
            {sm.starsAfter !== undefined && (
              <li className="summary__stars">
                <StarRating stars={sm.starsAfter} size={32} />
                <span>{starUp ? t('practice.summary.newStar') : t('practice.summary.keepGoing')}</span>
              </li>
            )}
          </ul>
          <div className="summary__actions">
            {kind === 'practice' && <Button onClick={again} trailingIcon="refresh">{t('practice.summary.again')}</Button>}
            {kind === 'practice' && skill.games.length > 0 && (
              <Button variant="secondary" onClick={() => { clear(key); navigate(path(`/games?skill=${skill.id}`)); }}>{t('practice.summary.playGame')}</Button>
            )}
            <Button variant="secondary" onClick={() => { clear(key); navigate(path('/home')); }} leadingIcon="home">{t('common.backToOasis')}</Button>
          </div>
        </main>
      </div>
    );
  }

  const a = s.answer;
  const hintSpec = modelSpecFor(item, skill.model);
  const feedbackKind = s.phase === 'correct' ? 'correct' : a.attempts === 1 && s.phase === 'answering' ? 'tryAgain' : null;

  return (
    <div className="activity">
      <TopBar
        start={<IconButton icon="exit-door" label={t('practice.exit')} onClick={() => setConfirmExit(true)} />}
        middle={<ProgressDots states={dots} current={index} total={total} />}
        end={
          <>
            <IconButton
              icon="lightbulb"
              label={t('practice.hint.button')}
              disabled={s.phase !== 'answering' || a.hintLevel >= 2}
              onClick={() => update({ answer: { ...a, hintLevel: Math.min(2, a.hintLevel + 1) as 1 | 2 } })}
            />
            <LanguageSwitch />
          </>
        }
      />
      <main className="activity__main" id="main">
        <h1 className="visually-hidden" tabIndex={-1} ref={heading}>{title}</h1>
        <div className="prompt">
          <Mascot expression={s.phase === 'correct' ? 'cheer' : a.attempts > 0 ? 'thinking' : 'happy'} size={64} />
          <p className="prompt__text">{t(item.blank === 'result' ? 'practice.prompt.solve' : 'practice.prompt.missing')}</p>
        </div>
        {a.hintLevel > 0 && s.phase === 'answering' && (
          <div className="hint" role="note">
            <p><strong>{t('practice.hint.title')}</strong> {t(`hint.${skill.id}`)}</p>
            {a.hintLevel >= 2 && modelFits(hintSpec) && <Manipulative spec={hintSpec} mode="start" key={`${index}-hint`} />}
            {a.hintLevel >= 2 && !modelFits(hintSpec) && <p>{t('practice.hint.level2')}</p>}
          </div>
        )}
        {s.phase === 'worked' ? (
          <WorkedExample item={item} model={skill.model} onGotIt={advance} />
        ) : (
          <>
            <ItemView key={index} item={item} stage={skill.stage} state={a} locked={s.phase !== 'answering' || busy} onState={(answer) => update({ answer })} onSubmit={onSubmit} />
            <FeedbackBanner kind={feedbackKind} />
            {s.phase === 'correct' && (
              <div className="next-row">
                {!reduced && <span className="burst" aria-hidden="true" />}
                <Button ref={nextBtn} onClick={advance} trailingIcon="arrow-forward" disabled={busy}>{t('practice.next')}</Button>
              </div>
            )}
          </>
        )}
      </main>
      <ConfirmDialog
        open={confirmExit}
        title={t('practice.leave.title')}
        confirmLabel={t('practice.leave.confirm')}
        cancelLabel={t('practice.leave.stay')}
        onConfirm={exit}
        onCancel={() => setConfirmExit(false)}
      />
      <BreakReminder
        open={showBreak}
        onKeepGoing={() => { useApp.getState().resetBreakTimer(); setShowBreak(false); void advance(); }}
        onTakeBreak={() => { useApp.getState().resetBreakTimer(); setShowBreak(false); clear(key); navigate(path('/home')); }}
      />
    </div>
  );
}

export function practiceSlots(skillId: SkillId): Slot[] {
  const skill = getSkill(skillId);
  if (!skill) return [];
  return Array.from({ length: practiceSetLength(skill) }, () => ({ skillId }));
}
