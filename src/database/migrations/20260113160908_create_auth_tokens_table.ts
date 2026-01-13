import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('auth_tokens', (table) => {
    // Primary key
    table.increments('id').primary();
    
    // Foreign key to users
    table.integer('user_id').unsigned().notNullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Token details
    table.string('token', 64).notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_used_at').nullable();
    
    // Indexes for performance
    table.index('token', 'idx_auth_tokens_token');
    table.index('user_id', 'idx_auth_tokens_user_id');
    table.index(['user_id', 'is_active'], 'idx_auth_tokens_user_active');
    table.index('expires_at', 'idx_auth_tokens_expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('auth_tokens');
}
