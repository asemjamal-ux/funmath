import { useEffect, useMemo, useState } from 'react';
import { IntlProvider, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { useFmt, usePath, useT } from '../../app/hooks';
import { useApp } from '../../app/store';
import { Button, IconButton } from '../../components/Button';
import { LanguageSwitch, TopBar } from '../../components/TopBar';
import { nextSetItem } from '../../domain/math/practiceSet';
import { isTopicSpec } from '../../domain/math/topicRegistry';
import { isTopic, OPERATOR_OF, type Blank, type Item, type Skill, type Tier } from '../../domain/math/types';
import { ItemExpression } from '../../components/MathDisplay';
import { createRng, randomSeed } from '../../domain/rng';
import { localDateString } from '../../domain/time';
import { appClock } from '../../services/clock';
import { MVP_SKILLS, OPERATIONS, skillsOf } from '../../services/content';
import { formatDate } from '../../services/formatting/date';
import { loadLazyMessages, type Messages } from '../../services/i18n';
import { useLocale } from '../../app/hooks';
import { SiteFooter } from '../home/HomeFront';

/*
 * Printable worksheets (decision 003), modelled on the Fun with Multiplication worksheet maker and extended to
 * every MVP Skill. Problems come from the same generators as Practice, so every item obeys PRD §6.5.
 * Nothing is stored or sent; printing uses the browser's own print dialog.
 */

type SheetType = 'practice' | 'missing' | 'chart-blank' | 'chart-full' | 'skip';
const COUNTS = [12, 20, 30, 40] as const;
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface Problem {
  item: Item;
  hide: Blank;
  answer: number;
}

function hideFor(item: Item, wantMissing: boolean, pickA: boolean): Blank {
  if (!wantMissing) return item.blank;
  const [a, b, c] = item.operands;
  // A hidden factor/divisor must still have exactly one answer (PRD §6.5 rule 5).
  const ok = (h: Blank) =>
    item.operation === 'multiplication' ? (h === 'a' ? b !== 0 : a !== 0)
    : item.operation === 'division' ? (h === 'b' ? c !== 0 : true)
    : true;
  const first: Blank = pickA ? 'a' : 'b';
  const second: Blank = pickA ? 'b' : 'a';
  return ok(first) ? first : ok(second) ? second : 'result';
}

function makeProblems(skill: Skill, tier: Tier, count: number, seed: number, missingAsked: boolean): Problem[] {
  // Advanced-World questions (decision 005) always ask for the result.
  const missing = missingAsked && !isTopic(skill.operation);
  const items: Item[] = [];
  for (let i = 0; i < count; i++) {
    items.push(nextSetItem(skill, tier, seed, i, items, { format: 'entry', reject: missing ? (c) => c.blank !== 'result' : undefined }));
  }
  const rng = createRng(seed ^ 0x5eed);
  return items.map((item) => {
    const hide = hideFor(item, missing, rng.next() < 0.5);
    const [a, b, c] = item.operands;
    return { item, hide, answer: hide === 'a' ? a : hide === 'b' ? b : c };
  });
}

/** An advanced-World question: its picture and equation, with the answer filled in on the key (decision 005). */
function TopicProblem({ p, index, showAnswer }: { p: Problem; index: number; showAnswer?: boolean }) {
  const { n } = useFmt();
  return (
    <div className="ws-prob ws-prob--topic">
      <span className="ws-prob__num">{n(index + 1)}.</span>
      <ItemExpression item={p.item} size="m" showAnswer={showAnswer} blankContent=" " />
    </div>
  );
}

function WsBlank({ text }: { text?: string }) {
  return <span className={text === undefined ? 'ws-blank' : 'ws-ans'}>{text ?? ''}</span>;
}

/** One problem written across: a ∘ b = c, in the learner's Math Direction, numbers isolated LTR. */
function AcrossProblem({ p, index, showAnswer }: { p: Problem; index: number; showAnswer?: boolean }) {
  const { n, mathDirection } = useFmt();
  const [a, b, c] = p.item.operands;
  const cell = (v: number, pos: Blank) =>
    p.hide === pos ? <WsBlank text={showAnswer ? n(v) : undefined} /> : <bdi dir="ltr">{n(v)}</bdi>;
  return (
    <div className="ws-prob">
      <span className="ws-prob__num">{n(index + 1)}.</span>
      <span className="ws-prob__eq" dir={mathDirection}>
        {cell(a, 'a')} <span className="ws-op">{OPERATOR_OF[p.item.operation]}</span> {cell(b, 'b')} <span className="ws-op">=</span> {cell(c, 'result')}
      </span>
    </div>
  );
}

/** Stacked (column) layout: digits right-aligned by place value, operator on the Math Direction side. */
function StackedProblem({ p, showAnswer }: { p: Problem; showAnswer?: boolean }) {
  const { n, mathDirection } = useFmt();
  const [a, b, c] = p.item.operands;
  return (
    <div className={`ws-stack ws-stack--${mathDirection}`}>
      <bdi dir="ltr" className="ws-stack__row">{n(a)}</bdi>
      <span className="ws-stack__row ws-stack__op">
        <span className="ws-op">{OPERATOR_OF[p.item.operation]}</span>
        <bdi dir="ltr">{n(b)}</bdi>
      </span>
      <bdi dir="ltr" className="ws-stack__row ws-stack__res">{showAnswer ? n(c) : ''}</bdi>
    </div>
  );
}

function Chart({ full }: { full: boolean }) {
  const { n } = useFmt();
  return (
    <table className="ws-chart" dir="ltr">
      <thead>
        <tr>
          <th scope="col">×</th>
          {TABLES.map((c) => <th key={c} scope="col">{n(c)}</th>)}
        </tr>
      </thead>
      <tbody>
        {TABLES.map((r) => (
          <tr key={r}>
            <th scope="row">{n(r)}</th>
            {TABLES.map((c) => <td key={c}>{full ? n(r * c) : ''}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Loads the worksheets catalogue (kept out of the startup bundle) and layers it over the shell's messages. */
export function WorksheetsPage() {
  const intl = useIntl();
  const locale = useLocale();
  const [extra, setExtra] = useState<{ locale: string; messages: Messages } | null>(null);
  useEffect(() => {
    let alive = true;
    // The advanced Worlds' generators, pictures and words come along: any Skill can be printed (decision 005).
    void Promise.all([loadLazyMessages(locale, 'worksheets'), loadLazyMessages(locale, 'topics'), import('../topics')]).then(([ws, topics]) => {
      if (alive) setExtra({ locale, messages: { ...topics, ...ws } });
    });
    return () => {
      alive = false;
    };
  }, [locale]);
  if (!extra) return <div className="boot" aria-busy="true" />;
  return (
    <IntlProvider locale={intl.locale} messages={{ ...(intl.messages as Messages), ...extra.messages }} defaultLocale="en" onError={intl.onError}>
      <WorksheetsBody />
    </IntlProvider>
  );
}

function WorksheetsBody() {
  const t = useT();
  const fmt = useFmt();
  const path = usePath();
  const navigate = useNavigate();
  const profile = useApp((s) => s.data?.profile ?? null);
  const device = useApp((s) => s.device);
  const [type, setType] = useState<SheetType>('practice');
  const [skillId, setSkillId] = useState<string>(MVP_SKILLS[3]?.id ?? 'ADD-04');
  const [tier, setTier] = useState<Tier>(2);
  const [count, setCount] = useState<number>(20);
  const [layout, setLayout] = useState<'across' | 'stacked'>('across');
  const [tables, setTables] = useState<number[]>([2, 3, 4, 5]);
  const [withName, setWithName] = useState(false);
  const [withKey, setWithKey] = useState(true);
  const [seed, setSeed] = useState(() => randomSeed(Math.random));

  const skill = MVP_SKILLS.find((s) => s.id === skillId) ?? (MVP_SKILLS[0] as Skill);
  const isProblems = type === 'practice' || type === 'missing';
  // Stacked columns only make sense when the result is always the unknown.
  const spec = skill.generator.tiers[String(tier) as '1' | '2' | '3'];
  const topic = isTopic(skill.operation);
  const canStack = type === 'practice' && !isTopicSpec(spec) && skill.operation !== 'division' && spec.kind !== 'family' && spec.blank.every((b) => b === 'result');
  const problems = useMemo(
    () => (isProblems ? makeProblems(skill, tier, count, seed, type === 'missing') : []),
    [isProblems, skill, tier, count, seed, type],
  );
  const skipRows = useMemo(() => {
    const rng = createRng(seed ^ 0x51c9);
    return [...tables].sort((x, y) => x - y).map((tbl) => ({ tbl, hidden: new Set(rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4)) }));
  }, [tables, seed]);

  const today = formatDate(localDateString(appClock.now()), { locale: fmt.locale, numberStyle: fmt.numberStyle, calendar: device?.calendar ?? 'gregory' });
  const stacked = canStack && layout === 'stacked';
  const title =
    type === 'practice' || (type === 'missing' && topic) ? t(skill.titleKey)
    : type === 'missing' ? t('ws.title.missing', { skill: t(skill.titleKey) })
    : type === 'chart-blank' ? t('ws.title.chartBlank')
    : type === 'chart-full' ? t('ws.title.chartFull')
    : t('ws.title.skip');
  const subtitle = isProblems ? t(`ws.level.${tier}`) : type === 'skip' ? t('ws.sub.skip') : type === 'chart-blank' ? t('ws.sub.chartBlank') : t('ws.sub.chartFull');

  const problemView = (p: Problem, i: number, showAnswer: boolean) => {
    if (topic) return <TopicProblem key={i} p={p} index={i} showAnswer={showAnswer} />;
    if (stacked) return <StackedProblem key={i} p={p} showAnswer={showAnswer} />;
    return <AcrossProblem key={i} p={p} index={i} showAnswer={showAnswer} />;
  };

  const toggleTable = (n: number) => setTables(tables.includes(n) ? tables.filter((x) => x !== n) : [...tables, n]);

  const head = (heading: string, sub: string) => (
    <div className="ws-head">
      <div>
        <h2>{heading}</h2>
        <p className="ws-head__sub">{sub}</p>
      </div>
      <div className="ws-meta">
        <div>{t('ws.name')} <span className="ws-line" dir="auto">{withName && profile ? profile.nickname : ''}</span></div>
        <div>{t('ws.date')} <span className="ws-line">{today}</span></div>
      </div>
    </div>
  );

  const sheetFooter = (score: boolean) => (
    <div className="ws-foot">
      <span>{t('ws.footer')}</span>
      {score && <span>{t('ws.score', { total: fmt.n(problems.length) })}</span>}
    </div>
  );

  return (
    <div className="page ws-page">
      <TopBar
        start={<IconButton icon="arrow-back" label={t('common.back')} onClick={() => navigate(path(profile ? '/home' : '/'))} />}
        end={<LanguageSwitch />}
      />
      <main id="main">
        <div className="section-head no-print">
          <div>
            <span className="eyebrow">{t('ws.eyebrow')}</span>
            <h1 className="ws-title">{t('ws.h1')}</h1>
            <p className="lead">{t('ws.lead')}</p>
          </div>
        </div>
        <div className="ws-layout">
          {/* ---------- Controls ---------- */}
          <form className="sticker ws-form no-print" onSubmit={(e) => e.preventDefault()}>
            <label className="ws-field">
              <span className="ws-field__label">{t('ws.type')}</span>
              <select className="select" value={type} onChange={(e) => setType(e.target.value as SheetType)}>
                <option value="practice">{t('ws.type.practice')}</option>
                {!topic && <option value="missing">{t('ws.type.missing')}</option>}
                <option value="skip">{t('ws.type.skip')}</option>
                <option value="chart-blank">{t('ws.type.chartBlank')}</option>
                <option value="chart-full">{t('ws.type.chartFull')}</option>
              </select>
            </label>

            {isProblems && (
              <>
                <label className="ws-field">
                  <span className="ws-field__label">{t('ws.skill')}</span>
                  <select className="select" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                    {OPERATIONS.map((op) => (
                      <optgroup key={op} label={t(`world.${op}`)}>
                        {skillsOf(op).map((s) => <option key={s.id} value={s.id}>{t(s.titleKey)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <fieldset className="ws-field">
                  <legend className="ws-field__label">{t('ws.levelLabel')}</legend>
                  <div className="chip-row">
                    {([1, 2, 3] as Tier[]).map((l) => (
                      <button key={l} type="button" className={`chip${tier === l ? ' chip--on' : ''}`} aria-pressed={tier === l} onClick={() => setTier(l)}>{t(`ws.level.${l}`)}</button>
                    ))}
                  </div>
                </fieldset>
                <label className="ws-field">
                  <span className="ws-field__label">{t('ws.count')}</span>
                  <select className="select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                    {COUNTS.map((c) => <option key={c} value={c}>{fmt.n(c)}</option>)}
                  </select>
                </label>
                {canStack && (
                  <fieldset className="ws-field">
                    <legend className="ws-field__label">{t('ws.layout')}</legend>
                    <div className="chip-row">
                      <button type="button" className={`chip${layout === 'across' ? ' chip--on' : ''}`} aria-pressed={layout === 'across'} onClick={() => setLayout('across')}>{t('ws.layout.across')}</button>
                      <button type="button" className={`chip${layout === 'stacked' ? ' chip--on' : ''}`} aria-pressed={layout === 'stacked'} onClick={() => setLayout('stacked')}>{t('ws.layout.stacked')}</button>
                    </div>
                  </fieldset>
                )}
              </>
            )}

            {type === 'skip' && (
              <fieldset className="ws-field">
                <legend className="ws-field__label">{t('ws.tables')}</legend>
                <div className="chip-row" dir="ltr">
                  {TABLES.map((n) => (
                    <button key={n} type="button" className={`chip${tables.includes(n) ? ' chip--on' : ''}`} aria-pressed={tables.includes(n)} onClick={() => toggleTable(n)}>{fmt.n(n)}</button>
                  ))}
                </div>
              </fieldset>
            )}

            {profile && (
              <label className="ws-check">
                <input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} />
                <span>{t('ws.withName')}</span>
              </label>
            )}
            {type !== 'chart-full' && (
              <label className="ws-check">
                <input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} />
                <span>{t('ws.withKey')}</span>
              </label>
            )}

            <div className="ws-actions">
              <Button size="m" className="btn--lime" leadingIcon="shuffle" onClick={() => setSeed(randomSeed(Math.random))}>{t('ws.new')}</Button>
              <Button size="m" className="btn--coral" leadingIcon="download" onClick={() => window.print()}>{t('ws.print')}</Button>
            </div>
            <p className="ws-tip">{t('ws.tip')}</p>
          </form>

          {/* ---------- Preview / printed sheet ---------- */}
          <section className="ws-sheet" aria-label={t('ws.preview')}>
            {head(title, subtitle)}

            {isProblems && (
              <>
                <div className={`ws-grid${stacked ? ' ws-grid--stacked' : ''}${topic ? ' ws-grid--topic' : ''}`}>
                  {problems.map((p, i) => problemView(p, i, false))}
                </div>
                <p className="ws-stars" aria-hidden="true">☆ ☆ ☆ ☆ ☆</p>
                {sheetFooter(true)}
                {withKey && (
                  <div className="ws-page-break">
                    {head(t('ws.key', { title }), t('ws.forGrownups'))}
                    <div className={`ws-grid ws-grid--key${stacked ? ' ws-grid--stacked' : ''}${topic ? ' ws-grid--topic' : ''}`}>
                      {problems.map((p, i) => problemView(p, i, true))}
                    </div>
                  </div>
                )}
              </>
            )}

            {type === 'skip' && (
              <>
                {skipRows.length === 0 && <p>{t('ws.pickTable')}</p>}
                {skipRows.map(({ tbl, hidden }) => (
                  <div key={tbl} className="ws-skip">
                    <p className="ws-skip__title">{t('ws.countBy', { n: fmt.n(tbl) })}</p>
                    <div className="ws-skip__row" dir={fmt.mathDirection}>
                      {Array.from({ length: 10 }, (_, i) => (
                        <span key={i} className="ws-skip__box"><bdi dir="ltr">{hidden.has(i) ? '' : fmt.n(tbl * (i + 1))}</bdi></span>
                      ))}
                    </div>
                  </div>
                ))}
                {sheetFooter(false)}
                {withKey && skipRows.length > 0 && (
                  <div className="ws-page-break">
                    {head(t('ws.key', { title }), t('ws.forGrownups'))}
                    {skipRows.map(({ tbl }) => (
                      <p key={tbl} className="ws-skip__key">
                        <strong>{t('ws.countBy', { n: fmt.n(tbl) })}</strong>{' '}
                        <bdi dir="ltr">{Array.from({ length: 10 }, (_, i) => fmt.n(tbl * (i + 1))).join(' · ')}</bdi>
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}

            {(type === 'chart-blank' || type === 'chart-full') && (
              <>
                <Chart full={type === 'chart-full'} />
                <p className="ws-hint">{type === 'chart-full' ? t('ws.chartFullHint') : t('ws.chartBlankHint')}</p>
                {sheetFooter(false)}
                {type === 'chart-blank' && withKey && (
                  <div className="ws-page-break">
                    {head(t('ws.key', { title }), t('ws.forGrownups'))}
                    <Chart full />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <div className="no-print">
        <SiteFooter />
      </div>
    </div>
  );
}
