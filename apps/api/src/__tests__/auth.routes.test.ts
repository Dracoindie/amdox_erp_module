import request from 'supertest';
import app from '../app';
import { prismaMock } from './setup';
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('Auth Routes', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login and return tokens', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@amdox.com',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        organizationId: 'org-1',
        status: 'ACTIVE',
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@amdox.com', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@amdox.com', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
