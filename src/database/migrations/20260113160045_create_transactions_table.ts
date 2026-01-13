import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    // Primary key
    table.increments('id').primary();
    
    // Foreign key to wallets
    table.integer('wallet_id').unsigned().notNullable();
    table.foreign('wallet_id').references('id').inTable('wallets').onDelete('CASCADE');
    
    // Transaction details
    table.enum('type', ['credit', 'debit']).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('description', 500).nullable();
    
    // Double-entry bookkeeping (audit trail)
    table.decimal('balance_before', 15, 2).notNullable();
    table.decimal('balance_after', 15, 2).notNullable();
    
    // Reference for transfers
    table.integer('reference_id').unsigned().nullable();
    table.string('reference_type', 50).nullable(); // 'transfer', 'funding', 'withdrawal'
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index('wallet_id', 'idx_transactions_wallet_id');
    table.index('created_at', 'idx_transactions_created_at');
    table.index(['wallet_id', 'created_at'], 'idx_transactions_wallet_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('transactions');
}
