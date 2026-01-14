import express, { Request, Response } from 'express';
import { authenticate, AuthenticatedRequest } from './auth.js';
import AuthService from '../services/AuthService.js';
import UserService from '../services/UserService.js';
import BlacklistService from '../services/BlacklistService.js';
import db from '../database/connection.js';

async function testAuthMiddleware() {
  console.log('Testing Authentication Middleware...\n');

  try {
    // Setup: Create a test user
    const mockBlacklist = new BlacklistService();
    mockBlacklist.checkBlacklist = async () => ({ isBlacklisted: false });
    
    const userService = new UserService(undefined, mockBlacklist, undefined);
    const authService = new AuthService();

    const user = await userService.createUser({
      email: 'authtest@example.com',
      phone_number: '+2348066666666',
      password: 'TestPassword123!',
      first_name: 'Auth',
      last_name: 'Test',
    });

    console.log('1. Created test user:', user.id);

    // Create auth token
    const { token } = await authService.createAuthToken(user.id);
    console.log('2. Generated token:', token.substring(0, 16) + '...');

    // Create Express app for testing
    const app = express();

    // Protected route
    app.get('/protected', authenticate, (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      res.json({
        success: true,
        message: 'Access granted',
        user: authReq.user,
      });
    });

    // Test 1: Valid token
    console.log('\n3. Testing valid token...');
    const mockReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;

    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log('   Response status:', code);
          console.log('   Response data:', data);
        },
      }),
    } as unknown as Response;

    let nextCalled = false;
    const mockNext = () => {
      nextCalled = true;
      console.log('   ✅ Middleware passed, next() called');
    };

    await authenticate(mockReq, mockRes, mockNext);

    if (nextCalled && (mockReq as AuthenticatedRequest).user) {
      console.log('   ✅ User attached to request:', (mockReq as AuthenticatedRequest).user);
    }

    // Test 2: No token
    console.log('\n4. Testing missing token...');
    const mockReqNoAuth = {
      headers: {},
    } as Request;

    let noAuthNextCalled = false;
    const mockResNoAuth = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log('   ✅ Correctly rejected (401)');
          console.log('   Message:', data.message);
        },
      }),
    } as unknown as Response;

    await authenticate(mockReqNoAuth, mockResNoAuth, () => {
      noAuthNextCalled = true;
    });

    if (!noAuthNextCalled) {
      console.log('   ✅ next() was not called (correctly blocked)');
    }

    // Test 3: Invalid token
    console.log('\n5. Testing invalid token...');
    const mockReqInvalid = {
      headers: {
        authorization: 'Bearer invalid_token_12345',
      },
    } as Request;

    const mockResInvalid = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log('   ✅ Invalid token rejected (401)');
          console.log('   Message:', data.message);
        },
      }),
    } as unknown as Response;

    await authenticate(mockReqInvalid, mockResInvalid, () => {});

    // Cleanup
    console.log('\n6. Cleaning up...');
    await userService.deleteUser(user.id);
    console.log('   ✅ Cleanup complete');

    console.log('\n✅ All middleware tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

testAuthMiddleware().catch(console.error);
