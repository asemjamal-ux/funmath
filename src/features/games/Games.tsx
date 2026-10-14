import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFmt, useHoldCelebrations, usePath, useReducedMotion, useT } from '../../app/hooks';
import { Button, IconButton } from '../../components/Button';
import { ConfirmDialog } from '../../components/Dialog';
import { Confetti, FeedbackBanner } from '../../components/Feedback';
import { ChoiceGroup, type ChoiceState } from '../../components/Answering';
import { ItemExpression, MathExpression, MathNumber, useSpoken } from '../../components/MathDisplay';
import { NumberLineView } from '../../components/Manipulatives';
import { Mascot } from '../../components/Mascot';
import { ProgressDots, type DotState } from '../../components/Progress';
import { LanguageSwitch, TopBar } from '../../components/TopBar';
import { BUBBLE_POP_ITEMS, MATCH_PAIRS_PAIRS, NUMBER_LINE_HOP_ITEMS } from '../../domain/constants';
import { expressionTokens } from '../../domain/math/present';
import { nextSetItem } from '../../domain/math/practiceSet';
import type { GameId, Item, Skill, Tier } from '../../domain/math/types';
import { createRng, randomSeed } from '../../domain/rng';
import { playSfx, setMusic } from '../../services/audio/audio';
import { useGameRound } from './useGameRound';

interface GameProps {
  skill: Skill;
  tier: Tier;
  profileId: string;
}

function makeItems(skill: Skill, tier: Tier, count: number, seed: number, reject?: (i: Item) => boolean): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < count; i++) out.push(nextSetItem(skill, tier, seed, i, out, { format: 'choice', reject }));
  return out;
}

function GameFrame({ title, gameId, dots, current, total, children }: { title: string; gameId: GameId; dots: DotState[]; current: number; total: number; children: React.ReactNode }) {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useHoldCelebrations(true);
  useEffect(() => {
    heading.current?.focus();
    setMusic(true);
    return () => setMusic(false);
  }, []);
  return (
    <div className={`activity game game--${gameId}`}>
      <TopBar
        start={<IconButton icon="exit-door" label={t('practice.exit')} onClick={() => setConfirm(true)} />}
        middle={<ProgressDots states={dots} current={current} total={total} />}
        end={<LanguageSwitch />}
      />
      <main className="activity__main" id="main">
        <h1 className="game__title" tabIndex={-1} ref={heading}>{title}</h1>
        {children}
      </main>
      <ConfirmDialog open={confirm} title={t('practice.leave.title')} confirmLabel={t('practice.leave.confirm')} cancelLabel={t('practice.leave.stay')} onConfirm={() => navigate(path('/games'))} onCancel={() => setConfirm(false)} />
    </div>
  );
}

function RoundSummary({ correct, total, seeds, skill, gameId, onAgain }: { correct: number; total: number; seeds: number; skill: Skill; gameId: GameId; onAgain: () => void }) {
  const t = useT();
  const { n } = useFmt();
  const path = usePath();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="activity">
      <TopBar start={<IconButton icon="home" label={t('common.backHome')} onClick={() => navigate(path('/home'))} />} end={<LanguageSwitch />} />
      <main className="summary" id="main">
        {!reduced && <Confetti />}
        <Mascot expression="cheer" size={120} />
        <h1 className="summary__title" tabIndex={-1} ref={heading}>{t('games.summary.title')}</h1>
        <ul className="summary__stats">
          <li>{t('games.summary.correct', { correct: n(correct), total: n(total) })}</li>
          <li>{t('rewards.seeds.earned', { count: seeds, n: n(seeds) })}</li>
        </ul>
        <div className="summary__actions">
          <Button onClick={onAgain} trailingIcon="refresh">{t('games.playAgain')}</Button>
          <Button variant="secondary" onClick={() => navigate(path(`/games?skill=${skill.id}`))}>{t('games.otherGame')}</Button>
          <Button variant="secondary" leadingIcon="home" onClick={() => navigate(path('/home'))}>{t('common.backToOasis')}</Button>
        </div>
        <span hidden>{gameId}</span>
      </main>
    </div>
  );
}

/* ---------------- Bubble Pop ---------------- */
export function BubblePop({ skill, tier, profileId }: GameProps) {
  const t = useT();
  const reduced = useReducedMotion();
  const [round, setRound] = useState(0);
  const items = useMemo(() => makeItems(skill, tier, BUBBLE_POP_ITEMS, randomSeed(Math.random)), [skill, tier, round]);
  const game = useGameRound(profileId, 'bubble-pop', skill);
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [popped, setPopped] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const item = items[idx] as Item;

  const choose = async (v: number) => {
    if (popped !== null) return;
    if (v === item.answer) {
      playSfx('pop');
      setPopped(v);
      const firstTry = wrong.length === 0;
      await game.answered(idx, item, v, true, firstTry);
      const nextResults = [...results, firstTry];
      setResults(nextResults);
      window.setTimeout(async () => {
        if (idx + 1 >= items.length) {
          await game.finish(items.length, items.length);
          setDone(true);
        } else {
          setIdx(idx + 1);
          setWrong([]);
          setPopped(null);
        }
      }, reduced ? 150 : 700);
    } else {
      // Wrong taps wobble and drift aside — no penalty, round continues (F-08).
      playSfx('tryAgain');
      setWrong([...wrong, v]);
    }
  };

  if (done) {
    return <RoundSummary correct={results.length} total={items.length} seeds={game.seeds} skill={skill} gameId="bubble-pop" onAgain={() => { setRound(round + 1); setIdx(0); setWrong([]); setPopped(null); setResults([]); setDone(false); }} />;
  }
  const dots: DotState[] = items.map((_, i) => (i < idx ? (results[i] ? 'correct' : 'incorrect') : i === idx ? 'current' : 'upcoming'));
  return (
    <GameFrame title={t('games.bubble-pop.title')} gameId="bubble-pop" dots={dots} current={idx} total={items.length}>
      <div className="bubble-q"><ItemExpression item={item} size="l" /></div>
      <div className={`bubbles${reduced ? ' bubbles--static' : ''}`} role="group" aria-label={t('games.bubble-pop.choose')}>
        {(item.choices ?? []).map((c, i) => (
          <button
            key={`${idx}-${c}`}
            type="button"
            className={`bubble-btn bubble-btn--${i}${wrong.includes(c) ? ' bubble-btn--drift' : ''}${popped === c ? ' bubble-btn--pop' : ''}`}
            aria-disabled={wrong.includes(c) || undefined}
            onClick={() => !wrong.includes(c) && void choose(c)}
          >
            <MathNumber value={c} />
          </button>
        ))}
      </div>
      <FeedbackBanner kind={popped !== null ? 'correct' : wrong.length ? 'tryAgain' : null} />
    </GameFrame>
  );
}

/* ---------------- Number Line Hop ---------------- */
export function NumberLineHop({ skill, tier, profileId }: GameProps) {
  const t = useT();
  const fmt = useFmt();
  const reduced = useReducedMotion();
  const spoken = useSpoken();
  const [round, setRound] = useState(0);
  // A zero hop or a missing divisor doesn't make a meaningful hop question on the line.
  const items = useMemo(
    () => makeItems(skill, tier, NUMBER_LINE_HOP_ITEMS, randomSeed(Math.random), (c) => (c.blank === 'result' && c.operands[1] === 0) || (c.operation === 'division' && c.blank !== 'result')),
    [skill, tier, round],
  );
  const game = useGameRound(profileId, 'number-line-hop', skill);
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const item = items[idx] as Item;
  const [a, b, c] = item.operands;

  // "Where does Fanak land?" for + − × results; "How many hops?" for ÷ and missing numbers (PRD §9).
  const countMode = item.operation === 'division' || item.blank !== 'result';
  const small = (item.operation === 'addition' || item.operation === 'subtraction') && skill.generator.valueMax <= 20;

  const choose = async (v: number) => {
    if (solved) return;
    if (v === item.answer) {
      playSfx('correct');
      setSolved(true);
      const firstTry = wrong.length === 0;
      await game.answered(idx, item, v, true, firstTry);
      setResults([...results, firstTry]);
    } else {
      playSfx('tryAgain');
      setWrong([...wrong, v]);
    }
  };
  const next = async () => {
    if (idx + 1 >= items.length) {
      await game.finish(items.length, items.length);
      setDone(true);
    } else {
      setIdx(idx + 1);
      setWrong([]);
      setSolved(false);
    }
  };

  if (done) {
    return <RoundSummary correct={results.length} total={items.length} seeds={game.seeds} skill={skill} gameId="number-line-hop" onAgain={() => { setRound(round + 1); setIdx(0); setWrong([]); setSolved(false); setResults([]); setDone(false); }} />;
  }

  let line: React.ReactNode;
  let prompt: string;
  if (countMode) {
    // Count equal hops: division hops of b from 0 to a; missing number hops of 1 between the parts.
    const [from, to, size] = item.operation === 'division' ? [0, a, b] : item.operation === 'multiplication' ? [0, c, item.blank === 'a' ? b : a] : item.operation === 'addition' ? [item.blank === 'a' ? b : a, c, 1] : [c, a, 1];
    const hops: Array<[number, number]> = [];
    if (solved) for (let x = from; x < to; x += size) hops.push([x, x + size]);
    line = <NumberLineView min={Math.min(from, to, 0)} max={Math.max(to, from, 10)} step={size} labelEvery={1} marker={solved ? to : from} start={from} hops={hops} />;
    prompt = t('games.number-line-hop.howMany', { from: fmt.n(from), to: fmt.n(to), size: fmt.n(size) });
  } else {
    const start = item.operation === 'multiplication' ? 0 : a;
    const max = small ? skill.generator.valueMax : Math.max(...(item.choices ?? []), start, c);
    const min = small ? 0 : Math.min(...(item.choices ?? []), start);
    line = (
      <NumberLineView
        min={min}
        max={max}
        start={start}
        marker={solved ? c : start}
        candidates={small ? undefined : (item.choices ?? [])}
        onPick={solved ? undefined : (v) => void choose(v)}
        hops={solved ? [[start, c]] : undefined}
      />
    );
    prompt = item.operation === 'multiplication'
      ? t('games.number-line-hop.landMul', { a: fmt.n(a), b: fmt.n(b) })
      : t(item.operation === 'addition' ? 'games.number-line-hop.landAdd' : 'games.number-line-hop.landSub', { start: fmt.n(a), b: fmt.n(b) });
  }
  const dots: DotState[] = items.map((_, i) => (i < idx ? (results[i] ? 'correct' : 'incorrect') : i === idx ? 'current' : 'upcoming'));
  const states: Record<number, ChoiceState> = {};
  for (const w of wrong) states[w] = 'tryAgain';
  if (solved) states[item.answer] = 'correct';
  return (
    <GameFrame title={t('games.number-line-hop.title')} gameId="number-line-hop" dots={dots} current={idx} total={items.length}>
      <p className="game__prompt">{prompt}</p>
      <div className={`hop-line${reduced ? ' hop-line--instant' : ''}`} aria-label={spoken(item)} role="group">{line}</div>
      {countMode && <ChoiceGroup choices={item.choices ?? []} states={states} onChoose={(v) => void choose(v)} label={t('answer.choices.label')} disabled={solved} />}
      {!countMode && wrong.length > 0 && !solved && (
        <p className="game__note">{t('games.number-line-hop.tried', { values: wrong.map((w) => fmt.n(w)).join(' · ') })}</p>
      )}
      <FeedbackBanner kind={solved ? 'correct' : wrong.length ? 'tryAgain' : null} />
      {solved && <div className="next-row"><Button onClick={next} trailingIcon="arrow-forward" autoFocus>{t('practice.next')}</Button></div>}
    </GameFrame>
  );
}

/* ---------------- Match Pairs ---------------- */
interface Card {
  id: number;
  pair: number;
  kind: 'expr' | 'answer';
}

export function MatchPairs({ skill, tier, profileId }: GameProps) {
  const t = useT();
  const { n } = useFmt();
  const spoken = useSpoken();
  const reduced = useReducedMotion();
  const [round, setRound] = useState(0);
  const { items, cards } = useMemo(() => {
    const seed = randomSeed(Math.random);
    const its: Item[] = [];
    for (let i = 0; i < MATCH_PAIRS_PAIRS; i++) {
      // Answers must be distinct so every expression has exactly one matching card.
      its.push(nextSetItem(skill, tier, seed, i, its, { format: 'choice', reject: (c) => c.blank !== 'result' || its.some((x) => x.answer === c.answer) }));
    }
    const cs: Card[] = its.flatMap((_, p) => [{ id: p * 2, pair: p, kind: 'expr' as const }, { id: p * 2 + 1, pair: p, kind: 'answer' as const }]);
    return { items: its, cards: createRng(seed).shuffle(cs) };
  }, [skill, tier, round]);
  const game = useGameRound(profileId, 'match-pairs', skill);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [missed, setMissed] = useState<number[]>([]); // pairs with a mismatch before matching
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<'correct' | 'tryAgain' | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const flip = async (card: Card) => {
    if (matched.includes(card.pair) || open.includes(card.id) || open.length >= 2) return;
    const nextOpen = [...open, card.id];
    setOpen(nextOpen);
    if (nextOpen.length < 2) return;
    const [x, y] = nextOpen.map((id) => cards.find((c) => c.id === id) as Card) as [Card, Card];
    const exprCard = x.kind === 'expr' ? x : y.kind === 'expr' ? y : null;
    const ansCard = x.kind === 'answer' ? x : y.kind === 'answer' ? y : null;
    if (x.pair === y.pair && x.kind !== y.kind) {
      playSfx('correct');
      setMessage('correct');
      const nm = [...matched, x.pair];
      setMatched(nm);
      setOpen([]);
      const it = items[x.pair] as Item;
      await game.answered(nm.length - 1, it, it.answer, true, !missed.includes(x.pair));
      if (nm.length === items.length) {
        await game.finish(items.length, items.length);
        window.setTimeout(() => setDone(true), reduced ? 100 : 600);
      }
    } else {
      // No penalty: cards turn back over after a moment; the round never ends early (F-08).
      playSfx('tryAgain');
      setMessage('tryAgain');
      if (exprCard && ansCard) setMissed((m) => [...new Set([...m, exprCard.pair])]);
      hideTimer.current = window.setTimeout(() => setOpen([]), 1200);
    }
  };

  if (done) {
    return <RoundSummary correct={items.length} total={items.length} seeds={game.seeds} skill={skill} gameId="match-pairs" onAgain={() => { setRound(round + 1); setOpen([]); setMatched([]); setMissed([]); setDone(false); setMessage(null); }} />;
  }
  const dots: DotState[] = items.map((_, i) => (i < matched.length ? 'correct' : i === matched.length ? 'current' : 'upcoming'));
  return (
    <GameFrame title={t('games.match-pairs.title')} gameId="match-pairs" dots={dots} current={matched.length} total={items.length}>
      <p className="game__prompt">{t('games.match-pairs.prompt')}</p>
      <div className="cards">
        {cards.map((card, i) => {
          const it = items[card.pair] as Item;
          const faceUp = open.includes(card.id) || matched.includes(card.pair);
          return (
            <button
              key={card.id}
              type="button"
              className={`card${faceUp ? ' card--up' : ''}${matched.includes(card.pair) ? ' card--matched' : ''}`}
              onClick={() => void flip(card)}
              aria-label={faceUp ? (card.kind === 'expr' ? spoken(it) : n(it.answer)) : t('games.match-pairs.card', { index: n(i + 1) })}
              aria-pressed={faceUp}
            >
              {faceUp ? (
                card.kind === 'expr' ? <MathExpression tokens={expressionTokens(it).slice(0, 3)} label={spoken(it)} size="m" /> : <span className="card__num"><MathNumber value={it.answer} /></span>
              ) : (
                <span className="card__back" aria-hidden="true">?</span>
              )}
            </button>
          );
        })}
      </div>
      <FeedbackBanner kind={message} message={message === 'tryAgain' ? t('games.match-pairs.notPair') : undefined} />
    </GameFrame>
  );
}
