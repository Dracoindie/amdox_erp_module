import { Request, Response } from 'express';
import { login, logout, me } from '../controllers/auth.controller';
import { prismaMock } from './setup';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let resJson: jest.Mock;
  let resStatus: jest.Mock;

  beforeEach(() => {
    resJson = jest.fn();
    resStatus = jest.fn().mockReturnValue({ json: resJson });
    mockRes = {
      status: resStatus,
      json: resJson,
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe('login', () => {
    it('should return 400 if email or password is missing', async () => {
      mockReq = { body: {} };
      await login(mockReq as Request, mockRes as Response);
      expect(resStatus).toHaveBeenCalledWith(422);
      expect(resJson).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq = { body: { email: 'test@test.com', password: 'password' } };
      prismaMock.user.findUnique.mockResolvedValue(null);
      await login(mockReq as Request, mockRes as Response);
      expect(resStatus).toHaveBeenCalledWith(401);
    });

    it('should return 200 and tokens on successful login', async () => {
      mockReq = { body: { email: 'test@test.com', password: 'password' }, headers: {} };
      const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        organizationId: 'org-1',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      await login(mockReq as Request, mockRes as Response);
      
      expect(resStatus).toHaveBeenCalledWith(200);
      expect(resJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          accessToken: expect.any(String),
          user: expect.objectContaining({ email: 'test@test.com' })
        })
      }));
    });
  });

  describe('logout', () => {
    it('should clear cookie and return 200', async () => {
      await logout(mockReq as Request, mockRes as Response);
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
      expect(resStatus).toHaveBeenCalledWith(200);
    });
  });
  
  describe('me', () => {
    it('should return user info', async () => {
       mockReq = { user: { userId: 'usr-1', email: 'a@a.com', role: 'ADMIN' } as any };
       prismaMock.user.findUnique.mockResolvedValue({ id: 'usr-1', email: 'a@a.com', role: 'ADMIN', isActive: true, createdAt: new Date() } as any);
       await me(mockReq as Request, mockRes as Response);
       expect(resStatus).toHaveBeenCalledWith(200);
       expect(resJson).toHaveBeenCalledWith(expect.objectContaining({
         data: expect.objectContaining({ email: 'a@a.com', role: 'ADMIN' })
       }));
    });
  });
});
