export const localPeerConfig = { host: 'localhost', port: 9000, path: '/peerjs', secure: false } as const;
export function peerUnavailableMessage(error: unknown) { return `No se pudo conectar al PeerServer local: ${error instanceof Error ? error.message : 'error desconocido'}`; }
