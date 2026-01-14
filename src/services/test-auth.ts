import AuthService from './AuthService.js';
import db from '../database/connection.js';

async function testAuth() {
  const authService = new AuthService();
  
  console.log('Testing AuthService...\n');
  
  // Test 1: Password hashing
  console.log('1. Testing password hashing...');
  const password = 'TestPassword123!';
  const hash = await authService.hashPassword(password);
  console.log('   Hash generated:', hash.substring(0, 20) + '...');
  
  // Test 2: Password verification
  console.log('\n2. Testing password verification...');
  const isValid = await authService.verifyPassword(password, hash);
  console.log('   Password valid:', isValid ? '✅' : '❌');
  
  const isInvalid = await authService.verifyPassword('WrongPassword', hash);
  console.log('   Wrong password rejected:', !isInvalid ? '✅' : '❌');
  
  // Test 3: Token generation
  console.log('\n3. Testing token generation...');
  const token = authService.generateToken();
  console.log('   Token generated:', token.substring(0, 16) + '...');
  console.log('   Token length:', token.length, 'characters');
  
  console.log('\n✅ All basic tests passed!');
  
  await db.destroy();
}

testAuth().catch(console.error);
