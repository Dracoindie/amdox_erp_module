import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';

describe('JWT Utilities', () => {
  const payload = { userId: 'usr-123', email: 'test@amdox.com', role: 'ADMIN' };
  
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  it('should sign an access token', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, 'test-access-secret') as any;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should sign a refresh token', () => {
    const token = signRefreshToken(payload);
    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, 'test-refresh-secret') as any;
    expect(decoded.userId).toBe(payload.userId);
  });

  it('should verify a valid refresh token', () => {
    const token = signRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
  });

  it('should throw for invalid refresh token', () => {
    expect(() => verifyRefreshToken('invalid-token')).toThrow();
  });
});
