import jwt from 'jsonwebtoken';
import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../utils/jwt';

describe('JWT utilities', () => {
  const payload = { userId: 'usr-123', email: 'test@amdox.com', role: 'SUPER_ADMIN' };

  it('signs and verifies an access token', () => {
    expect(verifyAccessToken(signAccessToken(payload))).toEqual(payload);
  });

  it('rejects an access token signed with another secret (e.g. an old hardcoded fallback)', () => {
    const forged = jwt.sign(payload, 'amdox-access-secret-change-in-prod');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects an unsigned (alg=none) token', () => {
    const unsigned = jwt.sign(payload, '', { algorithm: 'none' });
    expect(() => verifyAccessToken(unsigned)).toThrow();
  });

  it('gives every refresh token of the same user a different hash', () => {
    const a = signRefreshToken('usr-123', 'fam-1');
    const b = signRefreshToken('usr-123', 'fam-1');
    expect(a).not.toBe(b);
    expect(hashToken(a)).not.toBe(hashToken(b));
    expect(verifyRefreshToken(a)).toMatchObject({ sub: 'usr-123', fam: 'fam-1' });
  });

  it('throws for an invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow();
  });
});
