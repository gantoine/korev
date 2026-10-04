import { useEffect, useState } from 'react';
import { Button, Dialog, Radio } from '../../design-system';
import type { MyPr } from '../../shared/inbox';
import type { MergeMethod, MergePath } from '../../shared/merge';
import { hasCommandModifier } from '../keyboard';
import {
  layersBuiltOn,
  mergeButtonLabel,
  mergeTitle,
  numberList,
  queueCommand,
  type MergePlan,
} from './merge-plan';

const METHOD_LABELS: Record<MergeMethod, string> = {
  merge: 'Create a merge commit',
  squash: 'Squash and merge',
  rebase: 'Rebase and merge',
};

const TEAM_SEES_COMMENT = 'Your team sees this comment.';
const AVIATOR_STACK_WARNING = "Aviator's handling of stacks is unverified.";

function useConfirmShortcut(confirm: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !hasCommandModifier(event)) return;
      event.preventDefault();
      confirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, enabled]);
}

function Note({ children, tone }: { children: string; tone?: 'danger' }) {
  return (
    <p
      className={
        tone === 'danger'
          ? 'm-0 text-sm text-danger-text'
          : 'm-0 text-sm text-fg-2'
      }
    >
      {children}
    </p>
  );
}

function MethodPicker({
  plan,
  value,
  onChange,
}: {
  plan: MergePlan;
  value: MergeMethod | null;
  onChange: (method: MergeMethod) => void;
}) {
  if (plan.path.kind !== 'direct' || plan.method.options.length < 2) {
    return null;
  }
  return (
    <div
      role="radiogroup"
      aria-label="Merge method"
      className="flex flex-col gap-1.5"
    >
      {plan.method.options.map((method) => (
        <Radio
          key={method}
          name="merge-method"
          value={method}
          label={METHOD_LABELS[method]}
          checked={value === method}
          onChange={() => onChange(method)}
        />
      ))}
    </div>
  );
}

function othersNote(plan: MergePlan): string | null {
  if (plan.othersLayers.length === 0) return null;
  const parts = plan.othersLayers.map(
    (layer) => `@${layer.authorLogin ?? 'someone'}'s #${layer.number}`,
  );
  return `Includes ${parts.join(', ')}`;
}

function isAviatorUpperLayer(item: MyPr, path: MergePath): boolean {
  const position = item.pr.stack?.position ?? 1;
  return path.kind === 'comment' && path.tool === 'aviator' && position > 1;
}

export interface MergeConfirmProps {
  item: MyPr;
  plan: MergePlan;
  onConfirm: (method: MergeMethod | null) => void;
  onOpenGithub: () => void;
  onCancel: () => void;
}

export function MergeConfirm({
  item,
  plan,
  onConfirm,
  onOpenGithub,
  onCancel,
}: MergeConfirmProps) {
  const [method, setMethod] = useState(plan.method.initial);
  const command = queueCommand(plan.path, 'merge');
  const canMerge = !plan.blocker && !plan.partial;
  const confirm = () => onConfirm(method);
  useConfirmShortcut(confirm, canMerge);
  const others = othersNote(plan);
  return (
    <Dialog
      open
      onClose={onCancel}
      title={mergeTitle(plan.path, item.pr.number)}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {plan.partial ? (
            <Button variant="primary" autoFocus onClick={onOpenGithub}>
              Open on GitHub
            </Button>
          ) : (
            <Button
              variant="primary"
              kbd="⌘↵"
              autoFocus
              disabled={!canMerge}
              onClick={confirm}
            >
              {mergeButtonLabel(plan.path)}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        <Note>{`Merges ${numberList(plan.numbers)}`}</Note>
        {others ? <Note>{others}</Note> : null}
        {command ? (
          <Note>{`Posts \`${command}\` on #${item.pr.number}. ${TEAM_SEES_COMMENT}`}</Note>
        ) : null}
        {plan.path.kind === 'github-queue' ? (
          <Note>{`Adds #${item.pr.number} to the merge queue.`}</Note>
        ) : null}
        {isAviatorUpperLayer(item, plan.path) ? (
          <Note>{AVIATOR_STACK_WARNING}</Note>
        ) : null}
        {plan.partial ? (
          <Note>
            Korev can't see every layer of this stack. Merge it on GitHub.
          </Note>
        ) : null}
        {plan.blocker ? <Note tone="danger">{plan.blocker}</Note> : null}
        <MethodPicker plan={plan} value={method} onChange={setMethod} />
      </div>
    </Dialog>
  );
}

function builtOnNote(numbers: number[]): string | null {
  if (numbers.length === 0) return null;
  const verb = numbers.length === 1 ? 'is' : 'are';
  const base = numbers.length === 1 ? 'its' : 'their';
  return `${numberList(numbers)} ${verb} built on this and will lose ${base} base.`;
}

export interface CloseConfirmProps {
  item: MyPr;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CloseConfirm({ item, onConfirm, onCancel }: CloseConfirmProps) {
  useConfirmShortcut(onConfirm, true);
  const builtOn = builtOnNote(layersBuiltOn(item));
  return (
    <Dialog
      open
      onClose={onCancel}
      title={`Close #${item.pr.number}?`}
      description={item.pr.title}
      footer={
        <>
          <Button variant="ghost" autoFocus onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" kbd="⌘↵" onClick={onConfirm}>
            Close
          </Button>
        </>
      }
    >
      {builtOn ? <Note>{builtOn}</Note> : null}
    </Dialog>
  );
}

export interface CancelQueueConfirmProps {
  item: MyPr;
  path: MergePath;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CancelQueueConfirm({
  item,
  path,
  onConfirm,
  onCancel,
}: CancelQueueConfirmProps) {
  useConfirmShortcut(onConfirm, true);
  const command = queueCommand(path, 'cancel');
  return (
    <Dialog
      open
      onClose={onCancel}
      title={`Remove #${item.pr.number} from the queue?`}
      footer={
        <>
          <Button variant="ghost" autoFocus onClick={onCancel}>
            Keep queued
          </Button>
          <Button variant="primary" kbd="⌘↵" onClick={onConfirm}>
            Remove from queue
          </Button>
        </>
      }
    >
      <Note>
        {command
          ? `Posts \`${command}\` on #${item.pr.number}. ${TEAM_SEES_COMMENT}`
          : `Removes #${item.pr.number} from the merge queue.`}
      </Note>
    </Dialog>
  );
}
