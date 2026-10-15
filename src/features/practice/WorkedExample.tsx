import { useEffect, useRef, useState } from 'react';
import { useFmt, useT } from '../../app/hooks';
import { Button } from '../../components/Button';
import { ItemExpression, ItemPicture } from '../../components/MathDisplay';
import { Manipulative, modelFits } from '../../components/Manipulatives';
import { workedExample } from '../../domain/math/present';
import type { Item, ModelKind } from '../../domain/math/types';
import type { ManipulativeSpec } from '../../services/content/schemas';

/** The Skill's manipulative for this item; advanced-World Skills use the item's own picture instead (null). */
export function modelSpecFor(item: Item, kind: ModelKind): ManipulativeSpec | null {
  if (kind === 'form' || item.form || item.dp) return null;
  const [a, b] = item.operands;
  return { kind, op: item.operation, a, b };
}

/** Step-by-step reveal using the Skill's visual model; "Next step" then "Got it" (DS §8.6). */
export function WorkedExample({ item, model, onGotIt }: { item: Item; model: ModelKind; onGotIt: () => void }) {
  const t = useT();
  const { n } = useFmt();
  const steps = workedExample(item);
  const [shown, setShown] = useState(1);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
  }, [shown]);
  const spec = modelSpecFor(item, model);
  const all = shown >= steps.length;
  return (
    <section className="worked" aria-labelledby="worked-title">
      <h2 id="worked-title" className="worked__title">{t('practice.worked.title')}</h2>
      {spec && modelFits(spec) && <Manipulative spec={spec} mode={all ? 'final' : 'start'} key={all ? 'f' : 's'} />}
      {!spec && <ItemPicture item={item} hint showAnswer={all} size="l" />}
      <ol className="worked__steps">
        {steps.slice(0, shown).map((s, i) => (
          <li key={i}>
            {t(s.key, Object.fromEntries(Object.entries(s.values).map(([k, v]) => [k, n(v)])))}
            {s.sequence && s.sequence.length > 0 && (
              <span className="worked__seq" dir="ltr">
                {' '}
                {s.sequence.map((v) => n(v)).join(' · ')}
              </span>
            )}
          </li>
        ))}
      </ol>
      {all && <ItemExpression item={item} size="l" showAnswer picture={false} />}
      {all ? (
        <Button ref={btn} onClick={onGotIt} trailingIcon="check">{t('practice.worked.gotIt')}</Button>
      ) : (
        <Button ref={btn} variant="secondary" onClick={() => setShown(shown + 1)} trailingIcon="arrow-forward">{t('practice.worked.next')}</Button>
      )}
    </section>
  );
}
