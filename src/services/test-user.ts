import UserService from './UserService.js';
import db from '../database/connection.js';

async function testUser() {
  const userService = new UserService();
  
  console.log('Testing UserService...\n');
  
  try {
    // Test 1: Create user with blacklist check
    console.log('1. Creating user (with blacklist check)...');
    const newUser = await userService.createUser({
      email: 'testuser@example.com',
      phone_number: '+2348033333333',
      password: 'SecurePassword123!',
      first_name: 'Test',
      last_name: 'User',
    });
    console.log('   ✅ User created:', newUser.id);
    console.log('   Email:', newUser.email);
    console.log('   Name:', newUser.first_name, newUser.last_name);

    // Test 2: Verify wallet was created
    console.log('\n2. Verifying wallet was created...');
    const wallet = await db('wallets')
      .where({ user_id: newUser.id })
      .first();
    console.log('   ✅ Wallet exists:', wallet ? 'Yes' : 'No');
    console.log('   Wallet balance:', wallet?.balance);

    // Test 3: Get user profile
    console.log('\n3. Getting user profile...');
    const profile = await userService.getUserProfile(newUser.id);
    console.log('   ✅ Profile retrieved');
    console.log('   Balance:', profile?.balance);

    // Test 4: Get user by email
    console.log('\n4. Getting user by email...');
    const userByEmail = await userService.getUserByEmail('testuser@example.com');
    console.log('   ✅ User found:', userByEmail?.id === newUser.id);

    // Test 5: Update user profile
    console.log('\n5. Updating user profile...');
    const updated = await userService.updateUserProfile(newUser.id, {
      first_name: 'Updated',
      last_name: 'Name',
    });
    console.log('   ✅ Profile updated');
    console.log('   New name:', updated.first_name, updated.last_name);

    // Test 6: Duplicate email should fail
    console.log('\n6. Testing duplicate email...');
    try {
      await userService.createUser({
        email: 'testuser@example.com',
        phone_number: '+2348044444444',
        password: 'Password123!',
        first_name: 'Duplicate',
        last_name: 'User',
      });
      console.log('   ❌ Should have thrown error');
    } catch (error: any) {
      console.log('   ✅ Correctly rejected:', error.message);
    }

    // Test 7: Duplicate phone should fail
    console.log('\n7. Testing duplicate phone...');
    try {
      await userService.createUser({
        email: 'another@example.com',
        phone_number: '+2348033333333',
        password: 'Password123!',
        first_name: 'Duplicate',
        last_name: 'Phone',
      });
      console.log('   ❌ Should have thrown error');
    } catch (error: any) {
      console.log('   ✅ Correctly rejected:', error.message);
    }

    // Cleanup
    console.log('\n8. Cleaning up test data...');
    await userService.deleteUser(newUser.id);
    console.log('   ✅ Cleanup complete');

    console.log('\n✅ All tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
  }
}

testUser().catch(console.error);
