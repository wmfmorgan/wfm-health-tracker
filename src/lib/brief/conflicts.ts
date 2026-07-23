export type ViewForConflict = {
  personaId: string;
  topics?: string[] | null;
};

export type TopicConflict = {
  topic: string;
  personaIds: string[];
};

/**
 * Lightweight conflict flags: topics that appear on 2+ current accepted views.
 * Does not resolve conflicts — informational only.
 */
export function detectTopicConflicts(
  views: ViewForConflict[],
): TopicConflict[] {
  const byTopic = new Map<string, Set<string>>();

  for (const view of views) {
    const topics = view.topics ?? [];
    for (const raw of topics) {
      const topic = raw.trim();
      if (!topic) continue;
      let set = byTopic.get(topic);
      if (!set) {
        set = new Set();
        byTopic.set(topic, set);
      }
      set.add(view.personaId);
    }
  }

  const conflicts: TopicConflict[] = [];
  for (const [topic, personaIds] of byTopic) {
    if (personaIds.size >= 2) {
      conflicts.push({
        topic,
        personaIds: [...personaIds].sort(),
      });
    }
  }

  conflicts.sort((a, b) => a.topic.localeCompare(b.topic));
  return conflicts;
}
