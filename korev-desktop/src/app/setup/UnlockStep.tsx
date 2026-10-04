import { useState } from 'react';
import { Button } from '../../design-system';
import { disconnect, retryUnlock } from '../useAuthState';

const FAILURES_BEFORE_BUILD_HINT = 2;

export function UnlockStep({ failures }: { failures: number }) {
  const [retrying, setRetrying] = useState(false);

  async function tryAgain() {
    setRetrying(true);
    try {
      await retryUnlock();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="flex flex-col">
      <h1 className="m-0 type-h2 text-fg-1">
        Korev couldn't unlock your saved GitHub sign-in
      </h1>
      <p className="mt-2 mb-0 text-sm text-fg-3">
        It's stored in your macOS keychain. If macOS asks, choose Always Allow.
      </p>
      {failures >= FAILURES_BEFORE_BUILD_HINT ? (
        <p className="mt-2 mb-0 text-sm text-fg-3">
          This can happen after updating an unsigned build.
        </p>
      ) : null}
      <div className="mt-5 flex gap-2">
        <Button
          variant="primary"
          loading={retrying}
          onClick={() => void tryAgain()}
        >
          Try again
        </Button>
        <Button variant="ghost" onClick={() => void disconnect()}>
          Sign in again
        </Button>
      </div>
    </div>
  );
}
