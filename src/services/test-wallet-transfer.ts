import WalletService from './WalletService.js';
import db from '../database/connection.js';

async function testWalletTransfer() {
  const walletService = new WalletService();
  
  console.log('Testing WalletService (Part 2 - Transfer & Withdraw)...\n');
  
  try {
    // Create two test users
    const [user1Id] = await db('users').insert({
      email: 'sender@example.com',
      phone_number: '+2348011111111',
      password: 'hashedpassword',
      first_name: 'Sender',
      last_name: 'User',
    });

    const [user2Id] = await db('users').insert({
      email: 'recipient@example.com',
      phone_number: '+2348022222222',
      password: 'hashedpassword',
      first_name: 'Recipient',
      last_name: 'User',
    });

    console.log('1. Created test users:', user1Id, user2Id);

    // Create wallets
    const wallet1 = await walletService.createWallet(user1Id);
    const wallet2 = await walletService.createWallet(user2Id);
    console.log('2. Created wallets:', wallet1.id, wallet2.id);

    // Fund sender wallet
    await walletService.fundWallet(user1Id, {
      amount: 5000,
      description: 'Initial funding',
    });
    console.log('3. Funded sender wallet with 5000');

    const balance1 = await walletService.getBalance(user1Id);
    console.log('   Sender balance:', balance1);

    // Test: Transfer funds
    console.log('\n4. Transferring 2000 to recipient...');
    const transfer = await walletService.transferFunds(
      user1Id,
      'recipient@example.com',
      2000,
      'Test transfer'
    );
    console.log('   ✅ Transfer complete');
    console.log('   Sender balance after:', transfer.senderTransaction.balance_after);
    console.log('   Recipient balance after:', transfer.recipientTransaction.balance_after);

    // Verify balances
    const newBalance1 = await walletService.getBalance(user1Id);
    const newBalance2 = await walletService.getBalance(user2Id);
    console.log('\n5. Verified balances:');
    console.log('   Sender:', newBalance1, '(expected: 3000)');
    console.log('   Recipient:', newBalance2, '(expected: 2000)');

    // Test: Withdraw funds
    console.log('\n6. Withdrawing 1000 from sender...');
    const withdrawal = await walletService.withdrawFunds(user1Id, 1000, 'Test withdrawal');
    console.log('   ✅ Withdrawal complete');
    console.log('   Balance after:', withdrawal.balance_after);

    const finalBalance = await walletService.getBalance(user1Id);
    console.log('   Final sender balance:', finalBalance, '(expected: 2000)');

    // Test: Insufficient balance
    console.log('\n7. Testing insufficient balance...');
    try {
      await walletService.transferFunds(user1Id, 'recipient@example.com', 10000);
      console.log('   ❌ Should have thrown error');
    } catch (error: any) {
      console.log('   ✅ Correctly rejected:', error.message);
    }

    // Test: Transfer to self
    console.log('\n8. Testing transfer to self...');
    try {
      await walletService.transferFunds(user1Id, 'sender@example.com', 100);
      console.log('   ❌ Should have thrown error');
    } catch (error: any) {
      console.log('   ✅ Correctly rejected:', error.message);
    }

    // Cleanup
    console.log('\n9. Cleaning up test data...');
    await db('transactions').whereIn('wallet_id', [wallet1.id, wallet2.id]).delete();
    await db('wallets').whereIn('id', [wallet1.id, wallet2.id]).delete();
    await db('users').whereIn('id', [user1Id, user2Id]).delete();
    console.log('   ✅ Cleanup complete');

    console.log('\n✅ All tests passed!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await db.destroy();
  }
}

testWalletTransfer().catch(console.error);
