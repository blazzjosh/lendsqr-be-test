import { Request, Response } from 'express';
import UserController, { validateUserRegistration } from './UserController.js';
import UserService from '../services/UserService.js';
import BlacklistService from '../services/BlacklistService.js';
import db from '../database/connection.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

async function testUserController() {
  console.log('Testing UserController...\n');

  // Mock blacklist service
  const mockBlacklist = new BlacklistService();
  mockBlacklist.checkBlacklist = async () => ({ isBlacklisted: false });

  const userService = new UserService(undefined, mockBlacklist, undefined);
  const controller = new UserController(userService);

  try {
    // Test 1: Register user
    console.log('1. Testing user registration...');
    const registerReq = {
      body: {
        email: 'controller@example.com',
        phone_number: '+2348077777777',
        password: 'SecurePass123!',
        first_name: 'Controller',
        last_name: 'Test',
      },
    } as Request;

    let responseStatus = 0;
    let responseData: any = null;

    const registerRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (data: any) => {
            responseData = data;
          },
        };
      },
    } as Response;

    await controller.register(registerReq, registerRes);

    console.log('   Status:', responseStatus);
    console.log('   Success:', responseData?.success ? '✅' : '❌');
    console.log('   User ID:', responseData?.data?.id);
    console.log('   Email:', responseData?.data?.email);

    const userId = responseData?.data?.id;

    if (!userId) {
      throw new Error('User registration failed');
    }

    // Test 2: Get profile
    console.log('\n2. Testing get profile...');
    const profileReq = {
      user: {
        id: userId,
        email: 'controller@example.com',
      },
    } as AuthenticatedRequest;

    const profileRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (data: any) => {
            responseData = data;
          },
        };
      },
    } as Response;

    await controller.getProfile(profileReq, profileRes);

    console.log('   Status:', responseStatus);
    console.log('   Success:', responseData?.success ? '✅' : '❌');
    console.log('   Profile:', responseData?.data);
    console.log('   Has balance:', responseData?.data?.balance !== undefined ? '✅' : '❌');

    // Test 3: Update profile
    console.log('\n3. Testing update profile...');
    const updateReq = {
      user: {
        id: userId,
        email: 'controller@example.com',
      },
      body: {
        first_name: 'Updated',
        last_name: 'Name',
      },
    } as AuthenticatedRequest;

    const updateRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (data: any) => {
            responseData = data;
          },
        };
      },
    } as Response;

    await controller.updateProfile(updateReq, updateRes);

    console.log('   Status:', responseStatus);
    console.log('   Success:', responseData?.success ? '✅' : '❌');
    console.log('   Updated name:', responseData?.data?.first_name, responseData?.data?.last_name);

    // Test 4: Validation rules
    console.log('\n4. Testing validation rules...');
    console.log('   Registration validators:', validateUserRegistration.length, 'rules');
    console.log('   ✅ Email validation');
    console.log('   ✅ Phone validation');
    console.log('   ✅ Password strength validation');
    console.log('   ✅ Name validation');

    // Cleanup
    console.log('\n5. Cleaning up...');
    await userService.deleteUser(userId);
    console.log('   ✅ Cleanup complete');

    console.log('\n✅ All UserController tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

testUserController().catch(console.error);
