import type { IpcMainInvokeEvent } from 'electron';
import type { IpcChannel } from '../shared/ipc-contract';

export type IpcHandler = (...args: never[]) => unknown;

export type IpcHandlers = Partial<Record<IpcChannel, IpcHandler>>;

export interface IpcRegistrar {
  handle(
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown,
  ): void;
}

export class UntrustedSenderError extends Error {
  constructor(channel: string) {
    super(`Rejected ${channel} from an untrusted sender`);
    this.name = 'UntrustedSenderError';
  }
}

export function registerIpcHandlers(
  ipc: IpcRegistrar,
  handlers: IpcHandlers,
  isTrustedSender: (senderUrl: string | undefined) => boolean,
): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipc.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event.senderFrame?.url)) {
        throw new UntrustedSenderError(channel);
      }
      return (handler as (...values: unknown[]) => unknown)(...args);
    });
  }
}
