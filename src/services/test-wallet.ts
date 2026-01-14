import WalletService from './WalletService.js';
import db from '../database/connection.js';

async function testWallet() {
  const walletService = new WalletService();
  
  console.log('Testing WalletService (Part 1)...\n');
  
  try {
    // Create a test user first
    const [userId] = await db('users').insert({
      email: 'wallettest@example.com',
      phone_number: '+2348099999999',
      password: 'hashedpassword',
      first_name: 'Wallet',
      last_name: 'Test',
    });

    console.log('1. Created test user:', userId);

    // Test: Create wallet
    console.log('\n2. Creating wallet...');
    const wallet = await walletService.createWallet(userId);
    console.log('   ✅ Wallet created:', wallet.id);
    console.log('   Initial balance:', wallet.balance);

    // Test: Get balance
    console.log('\n3. Getting balance...');
    const balance = await walletService.getBalance(userId);
    console.log('   ✅ Balance:', balance);

    // Test: Fund wallet
    console.log('\n4. Funding wallet with 1000...');
    const transaction = await walletService.fundWallet(userId, {
      amount: 1000,
      description: 'Test funding',
    });
    console.log('   ✅ Transaction created:', transaction.id);
    console.log('   Balance before:', transaction.balance_before);
    console.log('   Balance after:', transaction.balance_after);

    // Test: Get updated balance
    console.log('\n5. Getting updated balance...');
    const newBalance = await walletService.getBalance(userId);
    console.log('   ✅ New balance:', newBalance);

    // Test: Get transaction history
    console.log('\n6. Getting transaction history...');
    const history = await walletService.getTransactionHistory(userId);
    console.log('   ✅ Transactions:', history.length);

    // Cleanup
    console.log('\n7. Cleaning up test data...');
    await db('transactions').where({ wallet_id: wallet.id }).delete();
    await db('wallets').where({ id: wallet.id }).delete();
    await db('users').where({ id: userId }).delete();
    console.log('   ✅ Cleanup complete');

    console.log('\n✅ All tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await db.destroy();
  }
}

testWallet().catch(console.error);
