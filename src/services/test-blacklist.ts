import BlacklistService from './BlacklistService.js';

async function testBlacklist() {
  const service = new BlacklistService();

  console.log('Testing BlacklistService...');
  console.log('');

  // Test with sample data
  const result = await service.checkBlacklist(
    'test@example.com',
    '+2348012345678'
  );

  console.log('Blacklist check result:', result);

  if (result.isBlacklisted) {
    console.log('User is blacklisted:', result.reason);
  } else {
    console.log('User is not blacklisted');
  }
}

testBlacklist().catch(console.error);
