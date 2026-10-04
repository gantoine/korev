import { useState, type ReactNode } from 'react';
import { Button, Toast } from '../../design-system';
import { mergePathFor } from '../../inbox/merge-path';
import type { InboxSnapshot, MyPr } from '../../shared/inbox';
import type {
  MergeMethod,
  MergeTool,
  PrActionState,
  PrTarget,
} from '../../shared/merge';
import { korev } from '../bridge';
import type { ShortcutMap } from '../keyboard';
import { useSettings } from '../useSettings';
import { useTimedToast } from '../useTimedToast';
import { CLOSED_GONE_LABEL, MERGED_GONE_LABEL } from './action-state';
import {
  CancelQueueConfirm,
  CloseConfirm,
  MergeConfirm,
} from './ActionDialogs';
import type { PanelSubject, SubjectIndex } from './list-model';
import {
  mergeButtonLabel,
  mergePlan,
  numberSpan,
  toolName,
} from './merge-plan';
import { CLOSE_KEY, MERGE_KEY, type PanelActions } from './PanelActions';

type DialogKind = 'merge' | 'close' | 'cancel-queue';

interface OpenDialog {
  kind: DialogKind;
  key: string;
}

interface ActionToast {
  message: string;
  reopen: PrTarget | null;
}

const TOAST_MS = 6000;

function targetOf(item: MyPr): PrTarget {
  return { id: item.pr.id, repo: item.pr.repo, number: item.pr.number };
}

function mineItem(subjects: SubjectIndex, key: string | null): MyPr | null {
  const subject = key ? subjects.get(key) : undefined;
  return subject?.kind === 'mine' ? subject.item : null;
}

function settledToast(
  key: string,
  state: PrActionState,
  subjects: SubjectIndex,
): ActionToast | null {
  if (state.kind === 'merged') {
    return { message: `Merged ${numberSpan(state.numbers)}`, reopen: null };
  }
  if (state.kind !== 'closed') return null;
  const item = mineItem(subjects, key);
  if (!item) return null;
  return { message: `Closed #${item.pr.number}`, reopen: targetOf(item) };
}

function useSettledHistory(
  actions: Record<string, PrActionState>,
  subjects: SubjectIndex,
  onSettled: (toast: ActionToast) => void,
) {
  const [seen, setSeen] = useState(actions);
  const [history, setHistory] = useState<Record<string, PrActionState['kind']>>(
    {},
  );
  if (seen === actions) return history;
  setSeen(actions);
  const fresh = Object.entries(actions).filter(
    ([key, state]) => seen[key]?.kind !== state.kind,
  );
  if (fresh.length === 0) return history;
  setHistory((current) => ({
    ...current,
    ...Object.fromEntries(fresh.map(([key, state]) => [key, state.kind])),
  }));
  const toast = fresh
    .map(([key, state]) => settledToast(key, state, subjects))
    .find((candidate) => candidate !== null);
  if (toast) onSettled(toast);
  return history;
}

function queueName(item: MyPr): string {
  const tool = item.queue?.tool;
  if (!tool || tool === 'github') return 'merge';
  return toolName(tool);
}

export interface MyPrActions {
  shortcuts: ShortcutMap;
  panelActions(subject: PanelSubject | null): PanelActions | undefined;
  goneLabel(key: string): string;
  overlays: ReactNode;
}

export function useMyPrActions(
  enabled: boolean,
  snapshot: InboxSnapshot,
  subjects: SubjectIndex,
  selectedKey: string | null,
  openGithub: (url: string) => void,
): MyPrActions {
  const settings = useSettings();
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const toast = useTimedToast<ActionToast>(TOAST_MS);
  const history = useSettledHistory(snapshot.actions, subjects, toast.show);
  const locked = snapshot.fromCache;

  function mergeWith(repo: string): MergeTool {
    return settings?.mergeWith[repo] ?? 'github';
  }

  function open(kind: DialogKind, item: MyPr | null) {
    if (!enabled || !item || locked) return;
    setDialog({ kind, key: `${item.pr.repo}#${item.pr.number}` });
  }

  function closeDialog() {
    setDialog(null);
  }

  function merge(item: MyPr, numbers: number[], method: MergeMethod | null) {
    closeDialog();
    void korev().pr.merge({ target: targetOf(item), numbers, method });
  }

  function close(item: MyPr) {
    closeDialog();
    void korev().pr.close(targetOf(item));
  }

  function cancelQueue(item: MyPr) {
    closeDialog();
    void korev().pr.cancelQueue(targetOf(item));
  }

  function panelActions(
    subject: PanelSubject | null,
  ): PanelActions | undefined {
    if (!enabled || subject?.kind !== 'mine') return undefined;
    const item = subject.item;
    const path = mergePathFor(
      snapshot.repoMerge[item.pr.repo],
      mergeWith(item.pr.repo),
    );
    return {
      state: snapshot.actions[subject.key] ?? null,
      queue: item.queue,
      queueName: queueName(item),
      mergeLabel: mergeButtonLabel(path),
      ready: item.bucket === 'ready',
      locked,
      onMerge: () => open('merge', item),
      onClose: () => open('close', item),
      onCancelQueue: () => open('cancel-queue', item),
      onOpenGithub: () => openGithub(item.pr.url),
    };
  }

  function dialogElement(): ReactNode {
    const item = mineItem(subjects, dialog?.key ?? null);
    if (!dialog || !item) return null;
    if (dialog.kind === 'close') {
      return (
        <CloseConfirm
          item={item}
          onConfirm={() => close(item)}
          onCancel={closeDialog}
        />
      );
    }
    const plan = mergePlan(item, snapshot, mergeWith(item.pr.repo), subjects);
    if (dialog.kind === 'cancel-queue') {
      return (
        <CancelQueueConfirm
          item={item}
          path={plan.path}
          onConfirm={() => cancelQueue(item)}
          onCancel={closeDialog}
        />
      );
    }
    return (
      <MergeConfirm
        item={item}
        plan={plan}
        onConfirm={(method) => merge(item, plan.numbers, method)}
        onOpenGithub={() => {
          closeDialog();
          openGithub(item.pr.url);
        }}
        onCancel={closeDialog}
      />
    );
  }

  const shown = toast.toast;
  const overlays = (
    <>
      {dialogElement()}
      {shown ? (
        <div className="fixed right-5 bottom-5 z-50">
          <Toast
            tone="success"
            title={shown.message}
            onClose={toast.dismiss}
            action={
              shown.reopen ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const target = shown.reopen;
                    toast.dismiss();
                    if (target) void korev().pr.reopen(target);
                  }}
                >
                  Reopen
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : null}
    </>
  );

  return {
    shortcuts: {
      [MERGE_KEY]: () => open('merge', mineItem(subjects, selectedKey)),
      [CLOSE_KEY]: () => open('close', mineItem(subjects, selectedKey)),
    },
    panelActions,
    goneLabel: (key) =>
      history[key] === 'closed' ? CLOSED_GONE_LABEL : MERGED_GONE_LABEL,
    overlays,
  };
}
