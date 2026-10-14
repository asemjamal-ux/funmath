import { useFmt, useT } from '../../app/hooks';
import { AnswerField, ChoiceGroup, MAX_ENTRY_DIGITS, NumberPad, type ChoiceState } from '../../components/Answering';
import { ItemExpression, VerticalProblem, operatorFor, useSpoken } from '../../components/MathDisplay';
import { digitsOf } from '../../domain/math/digits';
import type { Item } from '../../domain/math/types';

export interface AnswerState {
  attempts: number;
  wrong: number[];
  hintLevel: 0 | 1 | 2;
  entry: string;
  col: (number | null)[];
  colFocus: number;
  solved: boolean;
}

export function freshAnswerState(item: Item): AnswerState {
  return { attempts: 0, wrong: [], hintLevel: 0, entry: '', col: Array(columnCount(item)).fill(null), colFocus: 0, solved: false };
}

export function columnCount(item: Item): number {
  const [a, b] = item.operands;
  return Math.max(digitsOf(a).length, digitsOf(b).length) + (item.operation === 'addition' ? 1 : 0);
}

export function columnValue(col: (number | null)[]): number | null {
  if (col.every((d) => d === null)) return null;
  return col.reduce<number>((s, d, p) => s + (d ?? 0) * 10 ** p, 0);
}

export interface ItemViewProps {
  item: Item;
  stage: number;
  state: AnswerState;
  locked: boolean;
  onState: (s: AnswerState) => void;
  onSubmit: (value: number) => void;
}

/** Renders one Item in its format (choice / number entry / column entry). */
export function ItemView({ item, stage, state, locked, onState, onSubmit }: ItemViewProps) {
  const t = useT();
  const fmt = useFmt();
  const spoken = useSpoken();
  const large = stage === 1;

  if (item.format === 'choice') {
    const states: Record<number, ChoiceState> = {};
    for (const w of state.wrong) states[w] = 'tryAgain';
    if (state.solved) states[item.answer] = 'correct';
    return (
      <div className="item">
        <div className="item__work"><ItemExpression item={item} /></div>
        <div className="item__answer">
          <ChoiceGroup choices={item.choices ?? []} states={states} onChoose={onSubmit} label={t('answer.choices.label')} large={large} disabled={locked} />
        </div>
      </div>
    );
  }

  if (item.format === 'column') {
    const value = columnValue(state.col);
    const typeDigit = (d: number) => {
      const col = [...state.col];
      col[state.colFocus] = d;
      // After each digit, focus moves to the next higher place value (DS §8.2).
      onState({ ...state, col, colFocus: Math.min(col.length - 1, state.colFocus + 1) });
    };
    const back = () => {
      const col = [...state.col];
      if (col[state.colFocus] !== null) col[state.colFocus] = null;
      else if (state.colFocus > 0) {
        col[state.colFocus - 1] = null;
        onState({ ...state, col, colFocus: state.colFocus - 1 });
        return;
      }
      onState({ ...state, col });
    };
    return (
      <div className="item">
        <div className="item__work">
          <VerticalProblem
            a={item.operands[0]}
            b={item.operands[1]}
            op={operatorFor(item)}
            label={spoken(item)}
            entry={state.solved ? undefined : state.col}
            answer={state.solved ? item.answer : undefined}
            columns={state.col.length}
            focusPlace={state.colFocus}
            onFocusPlace={(p) => onState({ ...state, colFocus: p })}
          />
        </div>
        <div className="item__answer">
          <NumberPad onDigit={typeDigit} onBackspace={back} onSubmit={() => value !== null && onSubmit(value)} disabled={locked} submitDisabled={value === null} captureKeyboard={!locked} />
        </div>
      </div>
    );
  }

  // Number entry
  const typeDigit = (d: number) => {
    if (state.entry.length >= MAX_ENTRY_DIGITS) return;
    onState({ ...state, entry: state.entry === '0' ? String(d) : state.entry + String(d) });
  };
  return (
    <div className="item">
      <div className="item__work">
        <ItemExpression item={item} blankContent={state.entry !== '' ? fmt.n(Number(state.entry)) : undefined} />
      </div>
      <div className="item__answer">
        <AnswerField value={state.solved ? String(item.answer) : state.entry} state={state.solved ? 'correct' : 'default'} />
        <NumberPad
          onDigit={typeDigit}
          onBackspace={() => onState({ ...state, entry: state.entry.slice(0, -1) })}
          onSubmit={() => state.entry !== '' && onSubmit(Number(state.entry))}
          large={large}
          disabled={locked}
          submitDisabled={state.entry === ''}
          captureKeyboard={!locked}
        />
      </div>
    </div>
  );
}
