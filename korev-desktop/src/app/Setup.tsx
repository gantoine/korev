import type { ReactNode } from 'react';
import { cn } from '../design-system';
import type { AuthState } from '../shared/auth';
import { DRAG_REGION } from './layout';
import { ConnectStep } from './setup/ConnectStep';
import { RepoStep } from './setup/RepoStep';
import { UnlockStep } from './setup/UnlockStep';

const STEPS = { connect: 1, code: 2, repos: 3 } as const;
const STEP_NUMBERS = Object.values(STEPS);

function currentStep(auth: AuthState): number {
  if (auth.connection) return STEPS.repos;
  if (auth.login.status === 'awaiting_user') return STEPS.code;
  return STEPS.connect;
}

function StepMeter({ step }: { step: number }) {
  return (
    <div className="mb-5 flex gap-1.5">
      <span className="sr-only">
        Step {step} of {STEP_NUMBERS.length}
      </span>
      {STEP_NUMBERS.map((index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'h-[3px] flex-1 rounded-full',
            index <= step ? 'bg-accent' : 'bg-active',
          )}
        />
      ))}
    </div>
  );
}

function SetupFrame({
  step,
  children,
}: {
  step?: number;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-app text-fg-1">
      <div className={cn('h-topbar shrink-0', DRAG_REGION)} />
      <main className="flex flex-1 overflow-auto p-6">
        <div className="m-auto w-105 max-w-full rounded-lg border border-border-2 bg-surface p-7">
          {step ? <StepMeter step={step} /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}

export function Setup({ auth }: { auth: AuthState }) {
  if (!auth.connection && auth.unlockFailures > 0) {
    return (
      <SetupFrame>
        <UnlockStep failures={auth.unlockFailures} />
      </SetupFrame>
    );
  }
  return (
    <SetupFrame step={currentStep(auth)}>
      {auth.connection ? (
        <RepoStep connection={auth.connection} />
      ) : (
        <ConnectStep auth={auth} />
      )}
    </SetupFrame>
  );
}
