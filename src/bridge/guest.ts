import { WindowMessenger, connect, type Connection } from 'penpal';
import type { GuestApiV1, HostApiV1 } from './types';

export type GuestBridgeConnection = Connection<HostApiV1>;

function allowedOrigins() {
  try { return document.referrer ? [new URL(document.referrer).origin] : ['*']; }
  catch { return ['*']; }
}

export const connectGameToHost = (methods: GuestApiV1): GuestBridgeConnection => connect<HostApiV1>({
  messenger: new WindowMessenger({ remoteWindow: window.parent, allowedOrigins: allowedOrigins() }),
  methods,
});

export const observeGameContentSize = (hostApi: Pick<HostApiV1, 'reportContentSize'> | null) => {
  if (!hostApi?.reportContentSize || typeof ResizeObserver === 'undefined') return { disconnect() {} };
  let frame = 0;
  const report = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const minHeight = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
      void hostApi.reportContentSize?.({ minHeight }).catch(() => {});
    });
  };
  const observer = new ResizeObserver(report);
  observer.observe(document.documentElement);
  report();
  return { disconnect() { cancelAnimationFrame(frame); observer.disconnect(); } };
};
