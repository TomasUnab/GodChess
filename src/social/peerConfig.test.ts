import { describe, expect, it } from 'vitest';
import { localPeerConfig, peerUnavailableMessage } from './peerConfig';
describe('local PeerServer', () => { it('never points at a public signaling host', () => expect(localPeerConfig).toMatchObject({ host:'localhost', port:9000, path:'/peerjs', secure:false })); it('returns a recoverable error', () => expect(peerUnavailableMessage(new Error('offline'))).toContain('offline')); });
