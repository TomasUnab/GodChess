import type { PeerOptions } from 'peerjs';

/**
 * Signalling for invitations. Locally (npm run dev + npm run server) the private
 * PeerServer on localhost:9000 is used. On the published site there is no server
 * of ours, so PeerJS' public signalling service introduces the two browsers;
 * once connected, the moves travel directly between them (WebRTC), never through it.
 */
export const localPeerConfig = { host: 'localhost', port: 9000, path: '/peerjs', secure: false } as const;

export function isLocalHost(hostname: string) { return hostname === 'localhost' || hostname === '127.0.0.1'; }

export function peerConfig(hostname = typeof location === 'undefined' ? 'localhost' : location.hostname): PeerOptions {
  return isLocalHost(hostname) ? { ...localPeerConfig } : { debug: 1 };
}

export function peerUnavailableMessage(error: unknown, hostname = typeof location === 'undefined' ? 'localhost' : location.hostname) {
  const reason = error instanceof Error ? error.message : 'error desconocido';
  return isLocalHost(hostname)
    ? `No se pudo conectar al PeerServer local (¿está en marcha \`npm run server\`?): ${reason}`
    : `No se pudo conectar con la otra persona: ${reason}. Comprobad los dos la conexión y volved a intentarlo.`;
}
