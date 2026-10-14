import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { activityKey, useActivityStore, useForgetFinishedActivity } from '../../app/activityStore';
import { useFmt, useHoldCelebrations, useLocale, usePath, useReducedMotion, useT } from '../../app/hooks';
import { useApp } from '../../app/store';
import { ChoiceGroup, type ChoiceState } from '../../components/Answering';
import { Button, IconButton } from '../../components/Button';
import { ConfirmDialog } from '../../components/Dialog';
import { Confetti, FeedbackBanner } from '../../components/Feedback';
import { MathExpression } from '../../components/MathDisplay';
import { Manipulative } from '../../components/Manipulatives';
import { FanakSays, Mascot } from '../../components/Mascot';
import { ProgressDots, type DotState } from '../../components/Progress';
import { LanguageSwitch, TopBar } from '../../components/TopBar';
import { expressionTokens, spokenLabel } from '../../domain/math/present';
import type { Item, Skill } from '../../domain/math/types';
import { hasNarration, playNarration, playSfx, stopNarration } from '../../services/audio/audio';
import type { FixedItem, Lesson } from '../../services/content/schemas';
import { completeLesson } from '../rewards/engine';

interface LessonState {
  sessionId: string;
  step: number;
  guided: Record<number, { attempts: number; wrong: number[]; correct: boolean; revealed: boolean }>;
  completed: boolean;
  seeds: number;
}

function toItem(skill: Skill, fixed: FixedItem): Item {
  const [a, b, c] = fixed.operands;
  return {
    skillId: skill.id, tier: 1, format: 'choice', operation: fixed.operation, operands: [a, b, c], blank: fixed.blank,
    answer: fixed.blank === 'a' ? a : fixed.blank === 'b' ? b : c, choices: fixed.choices, seed: 0, index: 0,
  };
}

export function LessonPlayer({ skill, lesson }: { skill: Skill; lesson: Lesson }) {
  const t = useT();
  const { n } = useFmt();
  const locale = useLocale();
  const path = usePath();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const profile = useApp((s) => s.data?.profile);
  const key = activityKey(location.pathname, profile?.id ?? null);
  const stored = useActivityStore((s) => s.states[key]) as LessonState | undefined;
  const put = useActivityStore((s) => s.put);
  const clear = useActivityStore((s) => s.clear);
  const [confirmExit, setConfirmExit] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useHoldCelebrations(!stored?.completed);

  useForgetFinishedActivity(key, (s) => Boolean((s as LessonState | undefined)?.completed));

  useEffect(() => {
    if (!stored) put(key, { sessionId: crypto.randomUUID(), step: 0, guided: {}, completed: false, seeds: 0 } satisfies LessonState);
  }, [stored, key, put]);

  const st = stored;
  const step = st ? lesson.steps[st.step] : undefined;

  // Narration plays automatically on each step after the first interaction, if narration is on (F-05).
  useEffect(() => {
    if (step && profile?.prefs.narration) playNarration(locale, step.audioKey);
    return () => stopNarration();
  }, [step, locale, profile?.prefs.narration]);

  useEffect(() => {
    heading.current?.focus();
  }, [st?.step]);

  if (!st || !step || !profile) return <div className="page-loading">{t('common.loading')}</div>;

  const set = (patch: Partial<LessonState>) => put(key, { ...st, ...patch });
  const guidedCorrect = Object.values(st.guided).filter((g) => g.correct).length;
  const isLast = st.step === lesson.steps.length - 1;

  const goNext = async () => {
    const nextStep = st.step + 1;
    if (lesson.steps[nextStep]?.kind === 'ready' && !st.completed) {
      // Completing the Lesson: Star 1 if ≥ 1 guided try correct, +5 Seeds once (F-05).
      const out = await completeLesson(profile.id, skill.id, st.sessionId, guidedCorrect);
      playSfx('sparkle');
      put(key, { ...st, step: nextStep, completed: true, seeds: out.seedsAdded });
      return;
    }
    set({ step: Math.min(nextStep, lesson.steps.length - 1) });
  };

  const g = st.guided[st.step] ?? { attempts: 0, wrong: [], correct: false, revealed: false };
  const guidedDone = step.kind !== 'guided' || g.correct || g.revealed;

  const onChoose = (value: number, item: Item) => {
    if (g.correct || g.revealed) return;
    if (value === item.answer) {
      playSfx('correct');
      set({ guided: { ...st.guided, [st.step]: { ...g, correct: true } } });
    } else if (g.attempts === 0) {
      playSfx('tryAgain');
      set({ guided: { ...st.guided, [st.step]: { ...g, attempts: 1, wrong: [...g.wrong, value] } } });
    } else {
      set({ guided: { ...st.guided, [st.step]: { ...g, attempts: 2, wrong: [...g.wrong, value], revealed: true } } });
    }
  };

  const dots: DotState[] = lesson.steps.map((_, i) => (i < st.step ? 'correct' : i === st.step ? 'current' : 'upcoming'));
  const canSpeak = hasNarration(locale, step.audioKey);
  const speak = () => playNarration(locale, step.audioKey);

  let body: React.ReactNode = null;
  switch (step.kind) {
    case 'hook':
      body = (
        <div className="lesson-hook">
          <Mascot expression="curious" size={140} />
          <p className="lesson-text">{t(step.textKey)}</p>
        </div>
      );
      break;
    case 'model':
      body = (
        <>
          <FanakSays expression="happy" onSpeak={speak} canSpeak={canSpeak}>{t(step.textKey)}</FanakSays>
          <Manipulative key={`${st.step}`} spec={step.model} mode="explore" />
        </>
      );
      break;
    case 'guided': {
      const item = toItem(skill, step.item);
      const states: Record<number, ChoiceState> = {};
      for (const w of g.wrong) states[w] = 'tryAgain';
      if (g.correct || g.revealed) states[item.answer] = 'correct';
      const sp = spokenLabel(item);
      body = (
        <>
          <FanakSays expression={g.correct ? 'cheer' : g.attempts ? 'thinking' : 'happy'} onSpeak={speak} canSpeak={canSpeak}>{t(step.textKey)}</FanakSays>
          <div className="item">
            <div className="item__work">
              <MathExpression tokens={expressionTokens(item, g.correct || g.revealed)} label={t(sp.key, { a: n(sp.values.a), b: n(sp.values.b), c: n(sp.values.c) })} />
            </div>
            <div className="item__answer">
              <ChoiceGroup choices={item.choices ?? []} states={states} onChoose={(v) => onChoose(v, item)} label={t('answer.choices.label')} large={skill.stage === 1} disabled={g.correct || g.revealed} />
            </div>
          </div>
          <FeedbackBanner
            kind={g.correct ? 'correct' : g.attempts === 1 || g.revealed ? 'tryAgain' : null}
            message={g.revealed ? t('lesson.guided.reveal', { answer: n(item.answer) }) : undefined}
          />
        </>
      );
      break;
    }
    case 'keyIdea': {
      const ex = step.expression;
      body = (
        <>
          <FanakSays expression="happy" onSpeak={speak} canSpeak={canSpeak}>{t(step.textKey)}</FanakSays>
          {ex && (() => {
            const item = toItem(skill, { ...ex, choices: [0, 1, 2] });
            const sp = spokenLabel(item);
            return <MathExpression tokens={expressionTokens(item, true)} label={t(sp.key, { a: n(sp.values.a), b: n(sp.values.b), c: n(sp.values.c) })} />;
          })()}
        </>
      );
      break;
    }
    case 'ready':
      body = (
        <div className="lesson-ready">
          {!reduced && <Confetti />}
          <Mascot expression="cheer" size={140} />
          <p className="lesson-text">{t(step.textKey)}</p>
          {st.seeds > 0 && <p className="lesson-seeds">{t('rewards.seeds.earned', { count: st.seeds, n: n(st.seeds) })}</p>}
          <div className="summary__actions">
            <Button onClick={() => { clear(key); navigate(path(`/practice/${skill.id}`)); }} trailingIcon="arrow-forward">{t('lesson.practiseNow')}</Button>
            <Button variant="secondary" onClick={() => { clear(key); navigate(path(`/skill/${skill.id}`)); }}>{t('lesson.backToSkill')}</Button>
          </div>
        </div>
      );
      break;
    default: {
      const never: never = step;
      return never;
    }
  }

  return (
    <div className="activity">
      <TopBar
        start={<IconButton icon="exit-door" label={t('practice.exit')} onClick={() => (st.completed ? (clear(key), navigate(path(`/skill/${skill.id}`))) : setConfirmExit(true))} />}
        middle={<ProgressDots states={dots} current={st.step} total={lesson.steps.length} />}
        end={<LanguageSwitch />}
      />
      <main className="activity__main lesson" id="main">
        <h1 className="lesson__title" tabIndex={-1} ref={heading}>
          {t(skill.titleKey)}
          <span className="lesson__step">{t(`lesson.stepName.${step.kind}`)}</span>
        </h1>
        <div className="lesson-card">{body}</div>
        {!isLast && (
          <div className="lesson-nav">
            {st.step > 0 && (
              <Button variant="secondary" size="m" leadingIcon="arrow-back" onClick={() => set({ step: st.step - 1 })}>{t('lesson.back')}</Button>
            )}
            <Button onClick={goNext} disabled={!guidedDone} trailingIcon="arrow-forward">{t('lesson.next')}</Button>
          </div>
        )}
      </main>
      <ConfirmDialog
        open={confirmExit}
        title={t('practice.leave.title')}
        confirmLabel={t('practice.leave.confirm')}
        cancelLabel={t('practice.leave.stay')}
        onConfirm={() => { clear(key); navigate(path(`/skill/${skill.id}`)); }}
        onCancel={() => setConfirmExit(false)}
      />
    </div>
  );
}
