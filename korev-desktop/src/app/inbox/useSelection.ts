import { useState } from 'react';
import { isToggleKey } from './entries';
import type { PanelSubject, SubjectIndex } from './list-model';

interface Tracked {
  subjects: SubjectIndex;
  gone: PanelSubject | null;
}

export interface Selection {
  selectedKey: string | null;
  subject: PanelSubject | null;
  subjectGone: boolean;
  goneRow: PanelSubject | null;
  select: (key: string) => void;
}

function vanished(
  previous: SubjectIndex,
  next: SubjectIndex,
  key: string | null,
): PanelSubject | null {
  if (!key || next.has(key)) return null;
  return previous.get(key) ?? null;
}

export function useSelection(subjects: SubjectIndex): Selection {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subjectKey, setSubjectKey] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Tracked>({ subjects, gone: null });
  if (tracked.subjects !== subjects) {
    setTracked({
      subjects,
      gone: vanished(tracked.subjects, subjects, subjectKey),
    });
  }
  const gone = tracked.gone?.key === subjectKey ? tracked.gone : null;
  const subject = (subjectKey && subjects.get(subjectKey)) || gone;

  function select(key: string) {
    setSelectedKey(key);
    if (isToggleKey(key)) return;
    setSubjectKey(key);
  }

  return {
    selectedKey,
    subject,
    subjectGone: gone !== null && subject === gone,
    goneRow: gone?.key === selectedKey ? gone : null,
    select,
  };
}
