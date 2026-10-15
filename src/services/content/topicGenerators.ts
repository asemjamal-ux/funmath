import topicGenerators from '../../content/topic-generators.json';
import type { GeneratorSpec } from '../../domain/math/types';
import { SKILLS } from './index';

/*
 * The advanced Worlds' generator settings (decision 005) live outside skills.json so the startup bundle stays inside
 * NFR-01. They load with the advanced-World module and attach to their Skills on import; nothing generates an
 * advanced item before that (TopicsGate).
 */
const GENERATORS = topicGenerators as unknown as Record<string, GeneratorSpec>;
for (const skill of SKILLS) {
  const generator = GENERATORS[skill.id];
  if (generator) (skill as { generator: GeneratorSpec }).generator = generator;
}

export const TOPIC_GENERATORS_READY = true;
