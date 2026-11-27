import { describe, expect, it } from 'vitest';
import { localPeerConfig, peerConfig, peerUnavailableMessage } from './peerConfig';

describe('invitation signalling', () => {
  it('uses the private PeerServer locally', () => {
    expect(peerConfig('localhost')).toMatchObject(localPeerConfig);
    expect(peerConfig('127.0.0.1')).toMatchObject({ host: 'localhost', port: 9000 });
  });
  it('uses PeerJS public signalling on the published site', () => {
    expect(peerConfig('tomasunab.github.io')).not.toHaveProperty('host');
  });
  it('returns a recoverable error for each case', () => {
    expect(peerUnavailableMessage(new Error('offline'), 'localhost')).toContain('npm run server');
    expect(peerUnavailableMessage(new Error('offline'), 'tomasunab.github.io')).toContain('offline');
  });
});
