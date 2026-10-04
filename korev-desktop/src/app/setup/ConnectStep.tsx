import { useState } from 'react';
import { Button, Logo } from '../../design-system';
import type { AuthState, LoginFailure, LoginState } from '../../shared/auth';
import { korev } from '../bridge';
import { formatCountdown } from '../format';
import { cancelDeviceFlow, startDeviceFlow } from '../useAuthState';
import { SECOND_MS, useNow } from '../useNow';
import { TokenForm } from './TokenForm';

type AwaitingUser = Extract<LoginState, { status: 'awaiting_user' }>;
type LoginFailed = Extract<LoginState, { status: 'failed' }>;

const CONFIGURATION_FAILURES: LoginFailure[] = [
  'not_configured',
  'device_flow_disabled',
];

function connect() {
  void startDeviceFlow();
}

function Intro({ requesting }: { requesting: boolean }) {
  return (
    <>
      <Logo size={22} />
      <h1 className="mt-5 mb-0 type-h2 text-fg-1">
        Your PRs, sorted by what needs you
      </h1>
      <p className="mt-2 mb-5 text-sm text-fg-3">
        Korev reads your open pull requests and review requests from GitHub.
      </p>
      <Button
        variant="primary"
        size="lg"
        loading={requesting}
        onClick={connect}
      >
        Connect GitHub
      </Button>
    </>
  );
}

function DeviceCode({ login }: { login: AwaitingUser }) {
  const now = useNow(SECOND_MS);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(login.userCode);
    setCopied(true);
  }

  return (
    <>
      <h1 className="m-0 type-h2 text-fg-1">Connect GitHub</h1>
      <p className="mt-1 mb-0 text-sm text-fg-3">
        Enter this code on github.com to let Korev read your PRs.
      </p>
      <div className="my-4 rounded-md border border-dashed border-border-2 p-3.5 text-center font-mono text-2xl font-semibold tracking-caps text-fg-1 select-all">
        {login.userCode}
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          iconRight="external-link"
          className="flex-1"
          onClick={() => void korev().shell.openGithub(login.verificationUri)}
        >
          Open GitHub
        </Button>
        <Button
          icon={copied ? 'check' : 'copy'}
          onClick={() => void copyCode()}
        >
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-fg-3">
        <span>
          Code expires in {formatCountdown(Date.parse(login.expiresAt) - now)} ·
          Waiting for approval…
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void cancelDeviceFlow()}
        >
          Cancel
        </Button>
      </div>
    </>
  );
}

interface RetryProps {
  title: string;
  message: string;
  action: string;
}

function Retry({ title, message, action }: RetryProps) {
  return (
    <>
      <h1 className="m-0 type-h2 text-fg-1">{title}</h1>
      <p className="mt-2 mb-5 text-sm text-fg-3">{message}</p>
      <Button variant="primary" onClick={connect}>
        {action}
      </Button>
    </>
  );
}

function Failed({ login }: { login: LoginFailed }) {
  const forConfigurer = CONFIGURATION_FAILURES.includes(login.reason);
  return (
    <Retry
      title={
        forConfigurer
          ? 'Note for whoever configures Korev'
          : "Couldn't connect to GitHub"
      }
      message={login.message}
      action="Try again"
    />
  );
}

function LoginStep({ login }: { login: LoginState }) {
  switch (login.status) {
    case 'awaiting_user':
      return <DeviceCode login={login} />;
    case 'expired':
      return (
        <Retry
          title="The code expired"
          message="That code is no longer valid. Get a new one to keep going."
          action="Get a new code"
        />
      );
    case 'denied':
      return (
        <Retry
          title="Access was denied"
          message="GitHub reported that the request was declined."
          action="Try again"
        />
      );
    case 'failed':
      return <Failed login={login} />;
    case 'success':
      return <p className="m-0 text-sm text-fg-2">Finishing sign-in…</p>;
    default:
      return <Intro requesting={login.status === 'requesting'} />;
  }
}

export function ConnectStep({ auth }: { auth: AuthState }) {
  return (
    <div className="flex flex-col">
      <LoginStep login={auth.login} />
      {auth.storageProblem ? (
        <p className="mt-4 mb-0 text-xs text-danger-text">
          {auth.storageProblem}
        </p>
      ) : null}
      <div className="mt-5">
        <TokenForm />
      </div>
    </div>
  );
}
