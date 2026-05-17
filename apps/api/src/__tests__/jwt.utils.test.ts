import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';

describe('JWT Utilities', () => {
  const payload = { userId: 'usr-123', email: 'test@amdox.com', role: 'ADMIN' };
  
  const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'amdox-access-secret-change-in-prod';
  const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'amdox-refresh-secret-change-in-prod';

  it('should sign an access token', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, ACCESS_SECRET) as any;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it('should sign a refresh token', () => {
    const token = signRefreshToken(payload);
    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, REFRESH_SECRET) as any;
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
