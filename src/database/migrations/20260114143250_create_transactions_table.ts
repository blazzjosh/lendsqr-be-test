import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('wallet_id').unsigned().notNullable();
    table.foreign('wallet_id').references('id').inTable('wallets').onDelete('CASCADE');
    table.enum('type', ['credit', 'debit']).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('description', 500).nullable();
    table.decimal('balance_before', 15, 2).notNullable();
    table.decimal('balance_after', 15, 2).notNullable();
    table.integer('reference_id').unsigned().nullable();
    table.string('reference_type', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('wallet_id', 'idx_transactions_wallet_id');
    table.index('created_at', 'idx_transactions_created_at');
    table.index(['wallet_id', 'created_at'], 'idx_transactions_wallet_created');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('transactions');
}
