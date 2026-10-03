export type ConnectionMethod = 'oauth' | 'token';

export interface Connection {
  login: string;
  avatarUrl: string | null;
  method: ConnectionMethod;
}

export type LoginFailure =
  | 'not_configured'
  | 'device_flow_disabled'
  | 'incorrect_device_code'
  | 'network'
  | 'storage_unavailable'
  | 'unknown';

export type LoginState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | {
      status: 'awaiting_user';
      userCode: string;
      verificationUri: string;
      expiresAt: string;
    }
  | { status: 'success' }
  | { status: 'expired' }
  | { status: 'denied' }
  | { status: 'failed'; reason: LoginFailure; message: string };

export interface AuthState {
  connection: Connection | null;
  login: LoginState;
  storageProblem: string | null;
}

export type TokenResult =
  | { ok: true; connection: Connection }
  | { ok: false; message: string };
