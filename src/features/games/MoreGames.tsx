import { useMemo, useState } from 'react';
import { useFmt, useReducedMotion, useT } from '../../app/hooks';
import { Button } from '../../components/Button';
import { FeedbackBanner } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { ItemExpression, MathExpression, MathNumber, useSpoken } from '../../components/MathDisplay';
import type { DotState } from '../../components/Progress';
import { expressionTokens, questionTokens } from '../../domain/math/present';
import { nextSetItem } from '../../domain/math/practiceSet';
import type { Item, Tier } from '../../domain/math/types';
import { createRng, randomSeed } from '../../domain/rng';
import { playSfx } from '../../services/audio/audio';
import { GameFrame, RoundSummary, type GameProps } from './Games';
import { useGameRound } from './useGameRound';

/*
 * Extra games (decision 004), adapted from the Fun with Multiplication site to Number Oasis rules:
 * untimed, no lives, wrong taps cost nothing and never end a round, amber not red (N-04, N-09, CS-07).
 * All questions come from the Practice generators, so PRD §6.5 holds.
 */

const OP_KEY = { addition: 'add', subtraction: 'sub', multiplication: 'mul', division: 'div' } as const;

/* ---------------- Bingo ---------------- */
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const FREE = 4;

/** 3 × 3 card, free centre, 8 distinct answers. Mixes Tiers so even small Skills fill the card. */
function buildBingo(skill: GameProps['skill'], tier: Tier, seed: number): { cells: (Item | null)[]; calls: Item[] } {
  const picked: Item[] = [];
  const tiers: Tier[] = [tier, 1, 2, 3];
  for (let i = 0; i < 200 && picked.length < 8; i++) {
    const t = tiers[i % tiers.length] as Tier;
    const it = nextSetItem(skill, t, seed, i, picked, { format: 'choice' });
    if (!picked.some((p) => p.answer === it.answer)) picked.push(it);
  }
  const rng = createRng(seed ^ 0xb1);
  const order = rng.shuffle(picked);
  const cells: (Item | null)[] = [];
  for (let c = 0, k = 0; c < 9; c++) cells.push(c === FREE ? null : (order[k++] ?? null));
  return { cells, calls: rng.shuffle(picked) };
}

export function Bingo({ skill, tier, profileId }: GameProps) {
  const t = useT();
  const reduced = useReducedMotion();
  const [round, setRound] = useState(0);
  const { cells, calls } = useMemo(() => buildBingo(skill, tier, randomSeed(Math.random)), [skill, tier, round]);
  const game = useGameRound(profileId, 'bingo', skill);
  const [call, setCall] = useState(0);
  const [marked, setMarked] = useState<number[]>([]);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [missed, setMissed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [bingo, setBingo] = useState(false);
  const [done, setDone] = useState(false);
  const item = calls[call];

  const isMarked = (c: number) => c === FREE || cells[c] === null || marked.includes(c);
  const tap = async (c: number) => {
    if (!item || bingo || isMarked(c)) return;
    const cellItem = cells[c];
    if (cellItem && cellItem.answer === item.answer) {
      playSfx('correct');
      const nm = [...marked, c];
      setMarked(nm);
      setWrongCell(null);
      await game.answered(call, item, item.answer, true, !missed);
      const nr = [...results, !missed];
      setResults(nr);
      setMissed(false);
      const line = LINES.some((l) => l.every((x) => x === FREE || cells[x] === null || nm.includes(x)));
      if (line || call + 1 >= calls.length) {
        setBingo(true);
        playSfx('fanfare');
        await game.finish(nr.length, nr.length);
        window.setTimeout(() => setDone(true), reduced ? 300 : 1400);
      } else {
        setCall(call + 1);
      }
    } else {
      // No penalty: the tile wobbles and the same question stays (F-08).
      playSfx('tryAgain');
      setWrongCell(c);
      setMissed(true);
    }
  };

  if (done) {
    return (
      <RoundSummary
        correct={results.length}
        total={results.length}
        seeds={game.seeds}
        skill={skill}
        gameId="bingo"
        onAgain={() => { setRound(round + 1); setCall(0); setMarked([]); setResults([]); setMissed(false); setBingo(false); setDone(false); setWrongCell(null); }}
      />
    );
  }
  const dots: DotState[] = calls.map((_, i) => (i < results.length ? (results[i] ? 'correct' : 'incorrect') : i === call ? 'current' : 'upcoming'));
  return (
    <GameFrame title={t('games.bingo.title')} gameId="bingo" dots={dots} current={call} total={calls.length}>
      <p className="game__prompt">{bingo ? t('games.bingo.win') : t('games.bingo.prompt')}</p>
      {item && !bingo && <div className="bubble-q"><ItemExpression item={item} size="l" /></div>}
      <div className={`bingo-card${bingo ? ' bingo-card--win' : ''}`} role="grid" aria-label={t('games.bingo.card')} dir="ltr">
        {cells.map((cell, c) => {
          const on = isMarked(c);
          return (
            <button
              key={c}
              type="button"
              role="gridcell"
              className={`bingo-cell${c === FREE || !cell ? ' bingo-cell--free' : ''}${on && c !== FREE && cell ? ' bingo-cell--marked' : ''}${wrongCell === c ? ' bingo-cell--wobble' : ''}`}
              aria-pressed={on}
              aria-label={c === FREE || !cell ? t('games.bingo.free') : undefined}
              onClick={() => void tap(c)}
            >
              {c === FREE || !cell ? <Icon name="star" size={32} filled /> : <MathNumber value={cell.answer} />}
            </button>
          );
        })}
      </div>
      <FeedbackBanner kind={bingo ? 'correct' : wrongCell !== null ? 'tryAgain' : null} message={bingo ? t('games.bingo.win') : undefined} />
    </GameFrame>
  );
}

/* ---------------- Number Hunt ---------------- */
const HUNT_TARGETS = 4;
const HUNT_TILES = 9;

interface HuntRound {
  target: number;
  tiles: Item[];
}

/** Each round: a target and 9 expression tiles, 2–4 of which make the target. */
function buildHunt(skill: GameProps['skill'], _tier: Tier, seed: number): HuntRound[] {
  const rounds: HuntRound[] = [];
  const used = new Set<number>();
  for (let r = 0; r < HUNT_TARGETS; r++) {
    const pool: Item[] = [];
    for (let i = 0; i < 120; i++) {
      const it = nextSetItem(skill, ((i % 3) + 1) as Tier, seed + r * 1009, i, pool, { format: 'choice', reject: (c) => c.blank !== 'result' });
      if (!pool.some((p) => p.operands.join() === it.operands.join())) pool.push(it);
    }
    const byAnswer = new Map<number, Item[]>();
    for (const p of pool) byAnswer.set(p.answer, [...(byAnswer.get(p.answer) ?? []), p]);
    const ranked = [...byAnswer.entries()].filter(([ans]) => !used.has(ans)).sort((a, b) => b[1].length - a[1].length);
    const [target, hits] = ranked[0] ?? [...byAnswer.entries()][0] ?? [0, []];
    used.add(target);
    const matches = hits.slice(0, Math.min(4, Math.max(1, hits.length)));
    const others = pool.filter((p) => p.answer !== target);
    const rng = createRng(seed ^ (r + 7));
    const decoys = rng.shuffle(others).slice(0, HUNT_TILES - matches.length);
    rounds.push({ target, tiles: rng.shuffle([...matches, ...decoys]) });
  }
  return rounds;
}

export function NumberHunt({ skill, tier, profileId }: GameProps) {
  const t = useT();
  const { n } = useFmt();
  const spoken = useSpoken();
  const [round, setRound] = useState(0);
  const rounds = useMemo(() => buildHunt(skill, tier, randomSeed(Math.random)), [skill, tier, round]);
  const game = useGameRound(profileId, 'number-hunt', skill);
  const [idx, setIdx] = useState(0);
  const [found, setFound] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const [count, setCount] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const r = rounds[idx] as HuntRound;
  const need = r.tiles.filter((x) => x.answer === r.target).length;
  const complete = found.length >= need;

  const tap = async (i: number) => {
    if (complete || found.includes(i) || wrong.includes(i)) return;
    const tile = r.tiles[i] as Item;
    if (tile.answer === r.target) {
      playSfx('pop');
      setFound([...found, i]);
      await game.answered(count, tile, tile.answer, true, wrong.length === 0);
      setCount(count + 1);
    } else {
      playSfx('tryAgain');
      setWrong([...wrong, i]);
    }
  };
  const next = async () => {
    const nr = [...results, wrong.length === 0];
    setResults(nr);
    if (idx + 1 >= rounds.length) {
      await game.finish(count, count);
      setDone(true);
    } else {
      setIdx(idx + 1);
      setFound([]);
      setWrong([]);
    }
  };

  if (done) {
    return (
      <RoundSummary
        correct={count}
        total={count}
        seeds={game.seeds}
        skill={skill}
        gameId="number-hunt"
        onAgain={() => { setRound(round + 1); setIdx(0); setFound([]); setWrong([]); setCount(0); setResults([]); setDone(false); }}
      />
    );
  }
  const dots: DotState[] = rounds.map((_, i) => (i < results.length ? (results[i] ? 'correct' : 'incorrect') : i === idx ? 'current' : 'upcoming'));
  return (
    <GameFrame title={t('games.number-hunt.title')} gameId="number-hunt" dots={dots} current={idx} total={rounds.length}>
      <p className="game__prompt hunt-target">
        {t('games.number-hunt.prompt')} <b className="hunt-target__num"><MathNumber value={r.target} /></b>
      </p>
      <p className="game__note">{t('games.number-hunt.left', { left: n(need - found.length) })}</p>
      <div className="hunt-grid">
        {r.tiles.map((tile, i) => (
          <button
            key={i}
            type="button"
            className={`hunt-tile${found.includes(i) ? ' hunt-tile--hit' : ''}${wrong.includes(i) ? ' hunt-tile--miss' : ''}`}
            aria-pressed={found.includes(i)}
            aria-label={spoken({ ...tile, blank: 'result' })}
            onClick={() => void tap(i)}
          >
            <MathExpression tokens={questionTokens(tile)} label={spoken(tile)} size="m" />
          </button>
        ))}
      </div>
      <FeedbackBanner kind={complete ? 'correct' : wrong.length ? 'tryAgain' : null} message={complete ? t('games.number-hunt.allFound') : undefined} />
      {complete && <div className="next-row"><Button onClick={() => void next()} trailingIcon="arrow-forward" autoFocus>{t('practice.next')}</Button></div>}
    </GameFrame>
  );
}

/* ---------------- True or False ---------------- */
const TF_ITEMS = 8;

interface TfQuestion {
  item: Item;
  shown: number;
  isTrue: boolean;
}

function buildTf(skill: GameProps['skill'], tier: Tier, seed: number): TfQuestion[] {
  const items: Item[] = [];
  for (let i = 0; i < TF_ITEMS; i++) items.push(nextSetItem(skill, tier, seed, i, items, { format: 'choice' }));
  const rng = createRng(seed ^ 0x7f);
  return items.map((item) => {
    const isTrue = rng.next() < 0.5;
    const wrongs = (item.choices ?? []).filter((c) => c !== item.answer);
    const shown = isTrue || wrongs.length === 0 ? item.answer : rng.pick(wrongs);
    return { item, shown, isTrue: shown === item.answer };
  });
}

export function TrueFalse({ skill, tier, profileId }: GameProps) {
  const t = useT();
  const { n } = useFmt();
  const spoken = useSpoken();
  const [round, setRound] = useState(0);
  const qs = useMemo(() => buildTf(skill, tier, randomSeed(Math.random)), [skill, tier, round]);
  const game = useGameRound(profileId, 'true-false', skill);
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState<boolean | null>(null);
  const [solved, setSolved] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const q = qs[idx] as TfQuestion;
  const [a, , c] = q.item.operands;
  // The whole equation with the unknown filled by the value shown to the learner.
  const values = expressionTokens(q.item, false, q.shown).filter((x): x is { t: 'num'; v: number } => x.t === 'num').map((x) => n(x.v));
  const label = q.item.form
    ? t('games.true-false.sayForm', { question: spoken(q.item), value: n(q.shown) })
    : t(`games.true-false.say.${OP_KEY[q.item.operation]}`, { a: values[0] ?? n(a), b: values[1] ?? '', c: values[2] ?? n(c) });

  const choose = async (v: boolean) => {
    if (solved || wrong === v) return;
    if (v === q.isTrue) {
      playSfx('correct');
      setSolved(true);
      await game.answered(idx, q.item, q.item.answer, true, wrong === null);
      setResults([...results, wrong === null]);
    } else {
      playSfx('tryAgain');
      setWrong(v);
    }
  };
  const next = async () => {
    if (idx + 1 >= qs.length) {
      await game.finish(qs.length, qs.length);
      setDone(true);
    } else {
      setIdx(idx + 1);
      setWrong(null);
      setSolved(false);
    }
  };

  if (done) {
    return (
      <RoundSummary
        correct={results.length}
        total={qs.length}
        seeds={game.seeds}
        skill={skill}
        gameId="true-false"
        onAgain={() => { setRound(round + 1); setIdx(0); setWrong(null); setSolved(false); setResults([]); setDone(false); }}
      />
    );
  }
  const dots: DotState[] = qs.map((_, i) => (i < results.length ? (results[i] ? 'correct' : 'incorrect') : i === idx ? 'current' : 'upcoming'));
  return (
    <GameFrame title={t('games.true-false.title')} gameId="true-false" dots={dots} current={idx} total={qs.length}>
      <p className="game__prompt">{t('games.true-false.prompt')}</p>
      <div className={`tf-card${solved ? (q.isTrue ? ' tf-card--true' : ' tf-card--false') : ''}`}>
        <ItemExpression item={q.item} fill={q.shown} label={label} size="xl" />
      </div>
      <div className="tf-buttons">
        <button type="button" className="tf-btn tf-btn--true" aria-disabled={solved || wrong === true || undefined} onClick={() => void choose(true)}>
          <Icon name="check" size={32} />
          {t('games.true-false.true')}
        </button>
        <button type="button" className="tf-btn tf-btn--false" aria-disabled={solved || wrong === false || undefined} onClick={() => void choose(false)}>
          <Icon name="times" size={32} />
          {t('games.true-false.false')}
        </button>
      </div>
      <FeedbackBanner kind={solved ? 'correct' : wrong !== null ? 'tryAgain' : null} />
      {solved && !q.isTrue && (
        <div className="tf-fix">
          <span>{t('games.true-false.really')}</span>
          <ItemExpression item={q.item} size="l" showAnswer />
        </div>
      )}
      {solved && <div className="next-row"><Button onClick={() => void next()} trailingIcon="arrow-forward" autoFocus>{t('practice.next')}</Button></div>}
    </GameFrame>
  );
}
