import type { Rng } from '../rng';
import type { Item, MathToken, TierSpec, TopicSpec, WorkedStep } from './types';

/**
 * The advanced Worlds (fractions, decimals, area & perimeter — decision 005) load on demand so the startup bundle
 * stays inside NFR-01. Their module installs itself here; the core generators and presenters delegate to it.
 */
export interface TopicImpl {
  build(spec: TopicSpec, rng: Rng): Pick<Item, 'operation' | 'operands' | 'blank' | 'answer' | 'form' | 'dp'>;
  distractors(item: Item, want: number, max: number, rng: Rng): number[];
  tokens(item: Item, showAnswer: boolean, fill?: number): MathToken[];
  spoken(item: Item): { key: string; values: Record<string, number> };
  worked(item: Item): WorkedStep[];
  violations(item: Item): string[];
}

let impl: TopicImpl | null = null;

export function installTopics(t: TopicImpl): void {
  impl = t;
}

export function topicImpl(): TopicImpl {
  if (!impl) throw new Error('Advanced topics are not loaded yet');
  return impl;
}

const TOPIC_KINDS = new Set<string>(['fracName', 'fracOf', 'fracEquiv', 'fracAdd', 'decFrac', 'decAdd', 'decShift', 'rect', 'side']);

export function isTopicSpec(spec: TierSpec): spec is TopicSpec {
  return TOPIC_KINDS.has(spec.kind);
}

/** Items the topic module presents: picture/fraction forms and decimal arithmetic. */
export function isTopicItem(item: Item): boolean {
  return item.form !== undefined || (item.dp ?? 0) > 0;
}
